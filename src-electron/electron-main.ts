import { app, BrowserWindow } from 'electron';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { ipcMain } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// needed in case process is undefined under Linux
const platform = process.platform || os.platform();

const currentDir = fileURLToPath(new URL('.', import.meta.url));

function ensureWritableDatabase() {
  const bundledDb = path.join(process.resourcesPath, 'database.sqlite');
  const userDb = path.join(app.getPath('userData'), 'database.sqlite');

  if (!fs.existsSync(userDb)) {
    fs.copyFileSync(bundledDb, userDb);
  }

  return userDb;
}
let dbPath: string;
if (process.env.DEBUGGING) {
  dbPath = path.join(currentDir, 'database.sqlite');
} else {
  dbPath = ensureWritableDatabase();
}
let mainWindow: BrowserWindow | undefined;

async function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    icon: path.resolve(currentDir, 'icons/icon.png'), // tray icon
    width: 1200,
    height: 800,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      // More info: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
      preload: path.resolve(
        currentDir,
        path.join(
          process.env.QUASAR_ELECTRON_PRELOAD_FOLDER,
          'electron-preload' + process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION,
        ),
      ),
    },
  });

  if (process.env.DEV) {
    await mainWindow.loadURL(process.env.APP_URL);
  } else {
    await mainWindow.loadFile('index.html');
  }

  if (process.env.DEBUGGING) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools();
  } else {
    // we're on production; no access to devtools pls
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools();
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });
}

let db: sqlite3.Database | null = null;
function connectToDatabase() {
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Could not connect to database:', err);
    } else {
      console.log('Database connected');
    }
  });
}

function runAsync(
  db: sqlite3.Database,
  sql: string,
  params: unknown[] = [],
): Promise<sqlite3.RunResult> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (this: sqlite3.RunResult, err: Error | null) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function execAsync(db: sqlite3.Database, sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function handleSimpleAction(
  name: string,
  method: 'get' | 'all' | 'exec' | 'run',
  query: string | ((...args: unknown[]) => string),
  getParams: (...args: unknown[]) => unknown[] = () => [],
) {
  ipcMain.handle(name, async (_event, ...args) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        console.error(`Database not connected after call to ${name}`);
        return resolve(null);
      }

      const sql = typeof query === 'function' ? query(...args) : query;
      const params = getParams(...args);

      const callback = (err: Error | null, result?: unknown) => {
        if (err) {
          console.error(err);
          reject(new Error(`Error in ${name}`));
        } else {
          resolve(result ?? null);
        }
      };

      if (method === 'exec') {
        // exec doesn't support params or a result, so it's handled differently
        db.exec(sql, callback);
      } else {
        db[method](sql, params, callback);
      }
    });
  });
}

function handleTransaction(
  name: string,
  transaction: (db: sqlite3.Database, ...args: unknown[]) => Promise<unknown>,
) {
  ipcMain.handle(name, async (_event, ...args) => {
    if (!db) {
      console.error(`Database not connected after call to ${name}`);
      return null;
    }

    try {
      await execAsync(db, 'BEGIN TRANSACTION');
      const result = await transaction(db, ...args);
      await execAsync(db, 'COMMIT');
      return result;
    } catch (err) {
      await execAsync(db, 'ROLLBACK');
      console.error(err);
      if (err instanceof Error) {
        throw new Error(`Error in ${name}: ${err.message}`);
      } else {
        throw new Error(`Unknown error in ${name}`);
      }
    }
  });
}

handleSimpleAction(
  'fetch-row-count',
  'all',
  'SELECT COUNT(*) AS count FROM data',
);

handleSimpleAction(
  'fetch-row-data',
  'get',
  'SELECT * FROM data WHERE combined_id = ?',
  (id) => [id],
);

handleSimpleAction(
  'fetch-expanded-counts',
  'all',
  'SELECT template_id, COUNT(DISTINCT expanded_id) AS count FROM data GROUP BY template_id',
);

handleSimpleAction(
  'fetch-paraphrased-counts',
  'all',
  'SELECT template_id, expanded_id, COUNT(paraphrased_id) AS count FROM data WHERE template_id = ? AND expanded_id = ?',
  (templateId, expandedId) => [templateId, expandedId],
);

const reviewColumns = [
  ['data_id', 'INTEGER REFERENCES data(id)'],
  ['combined_id', 'TEXT UNIQUE'],
  ['template_id', 'INTEGER'],
  ['expanded_id', 'INTEGER'],
  ['paraphrased_id', 'INTEGER'],
  ['query_template', 'TEXT'],
  ['constraints', 'TEXT'],
  ['spec_template', 'TEXT'],
  ['query_type', 'TEXT'],
  ['creation_method', 'TEXT'],
  ['query_base', 'TEXT'],
  ['spec', 'TEXT'],
  ['solution', 'TEXT'],
  ['dataset_schema', 'TEXT'],
  ['query', 'TEXT'],
  ['expertise', 'INTEGER'],
  ['formality', 'INTEGER'],
  ['reviewer', 'TEXT NOT NULL'],
  ['review_status', 'TEXT NOT NULL'],
  ['review_comments', 'TEXT'],
] as const;

handleSimpleAction(
  'create-reviews',
  'exec',
  `
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ${reviewColumns.map(([name, type]) => `${name} ${type}`).join(',\n  ')}
  );

  CREATE TABLE IF NOT EXISTS review_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_id INTEGER REFERENCES reviews(id),
    category TEXT
  );
  `,
);

handleSimpleAction(
  'create-user',
  'exec',
  `
  CREATE TABLE IF NOT EXISTS user (
    field TEXT UNIQUE,
    value TEXT
  );

  INSERT OR IGNORE INTO user (field, value)
  VALUES ('uid', '${uuidv4()}');
  `,
);

handleSimpleAction(
  'fetch-user',
  'get',
  'SELECT value FROM user WHERE field = "uid"',
);

handleTransaction('add-review', async (db, ...args: unknown[]) => {
  const reviewData = args[0] as Record<string, unknown>;
  const insertReviewSQL = `
    INSERT INTO reviews (
      ${reviewColumns.map(([name]) => name).join(', ')}
    ) VALUES (
      ${reviewColumns.map(() => '?').join(', ')}
    )`;

  const reviewValues = reviewColumns.map(([name]) => reviewData[name]);
  const result = await runAsync(db, insertReviewSQL, reviewValues);
  const reviewId = result.lastID;

  const categories = reviewData.review_categories as string[];
  if (categories.length > 0) {
    const placeholders = categories.map(() => `(?, ?)`).join(', ');
    const categoryValues = categories.flatMap((c) => [reviewId, c]);

    const insertCategoriesSQL = `
      INSERT INTO review_categories (review_id, category)
      VALUES ${placeholders}`;

    await runAsync(db, insertCategoriesSQL, categoryValues);
  }

  return reviewId;
});

handleSimpleAction(
  'fetch-all-reviews',
  'all',
  `SELECT
    r.*,
    JSON_GROUP_ARRAY(rc.category) AS review_categories
FROM
    reviews r
LEFT JOIN
    review_categories rc ON r.id = rc.review_id
GROUP BY
    r.id;`,
);

void app.whenReady().then(() => {
  createWindow();
  connectToDatabase();
});

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === undefined) {
    void createWindow();
  }
});
