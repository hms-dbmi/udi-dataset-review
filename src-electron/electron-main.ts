import { app, BrowserWindow } from 'electron';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { ipcMain } from 'electron';

// needed in case process is undefined under Linux
const platform = process.platform || os.platform();

const currentDir = fileURLToPath(new URL('.', import.meta.url));
const dbPath = path.join(currentDir, 'data', 'database.sqlite');

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

function handleDatabaseQuery(
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

// function handleDatabaseQuery(
//   name: string,
//   mode: 'get' | 'all' | 'run' | 'exec' | 'transaction',
//   queryOrQueries:
//     | string
//     | ((...args: unknown[]) => string)
//     | ((...args: unknown[]) => { sql: string; params: unknown[] }[]),
//   getParams: (...args: unknown[]) => unknown[] = () => [],
// ) {
//   ipcMain.handle(name, async (_event, ...args) => {
//     return new Promise((resolve, reject) => {
//       if (!db) {
//         console.error(`Database not connected after call to ${name}`);
//         return resolve(null);
//       }

//       if (mode === 'transaction') {
//         if (typeof queryOrQueries !== 'function') {
//           console.error(`Transaction queries must be a function`);
//           return resolve(null);
//         }
//         const queries = queryOrQueries(...args) as {
//           sql: string;
//           params: unknown[];
//         }[];

//         db.serialize(() => {
//           if (!db) {
//             console.error(`Database not connected after call to ${name}`);
//             return resolve(null);
//           }
//           db.run('BEGIN TRANSACTION');

//           for (const { sql, params } of queries) {
//             db.run(sql, params, (err) => {
//               if (err) {
//                 console.error(err);
//                 // db?.run('ROLLBACK');
//                 return reject(new Error(`Error in ${name} transaction`));
//               }
//             });
//           }

//           db.run('COMMIT', (err) => {
//             if (err) {
//               console.error(err);
//               return reject(new Error(`Error committing ${name} transaction`));
//             }
//             resolve(null);
//           });
//         });
//       } else {
//         const sql =
//           typeof queryOrQueries === 'function'
//             ? (queryOrQueries(...args) as string)
//             : queryOrQueries;
//         const params = getParams(...args);

//         const callback = (err: Error | null, result?: unknown) => {
//           if (err) {
//             console.error(err);
//             reject(new Error(`Error in ${name}`));
//           } else {
//             resolve(result ?? null);
//           }
//         };

//         if (mode === 'exec') {
//           db.exec(sql, callback);
//         } else {
//           db[mode](sql, params, callback);
//         }
//       }
//     });
//   });
// }

handleDatabaseQuery(
  'fetch-row-count',
  'all',
  'SELECT COUNT(*) AS count FROM data',
);

handleDatabaseQuery(
  'fetch-row-data',
  'get',
  'SELECT * FROM data WHERE combined_id = ?',
  (id) => [id],
);

handleDatabaseQuery(
  'fetch-expanded-counts',
  'all',
  'SELECT template_id, COUNT(DISTINCT expanded_id) AS count FROM data GROUP BY template_id',
);

handleDatabaseQuery(
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

handleDatabaseQuery(
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

// handleDatabaseQuery(
//   'add-review',
//   'transaction',
//   (...args: unknown[]) => {
//     const [reviewData] = args as [Record<string, unknown>, string[]];
//     const categories = reviewData.review_categories as string[];
//     return `
//   BEGIN TRANSACTION;

//   INSERT INTO reviews (
//     ${reviewColumns.map(([name]) => name).join(',\n    ')}
//   ) VALUES (${reviewColumns.map(() => '?').join(', ')});

//     ${categories.length > 0 ? 'INSERT INTO review_categories (review_id, category) VALUES' : ''}
//     ${categories.map(() => `(last_insert_rowid(), ?)`).join(',\n')}${categories.length > 0 ? ';' : ''}
//   COMMIT;
//   `;
//   },
//   (...args: unknown[]) => {
//     const [reviewData] = args as [Record<string, unknown>, string[]];
//     const values = reviewColumns.map(([name]) => reviewData[name]);
//     const categories = reviewData.review_categories as string[];
//     return [...values, ...categories];
//   },
// );

// handleDatabaseQuery('add-review', 'transaction', (...args: unknown[]) => {
//   const [reviewData] = args as [Record<string, unknown>, string[]];
//   const values = reviewColumns.map(([name]) => reviewData[name]);
//   const categories = reviewData.review_categories as string[];

//   const queries = [
//     {
//       sql: `INSERT INTO reviews (${reviewColumns.map(([name]) => name).join(', ')}) VALUES (${reviewColumns.map(() => '?').join(', ')})`,
//       params: values,
//     },
//   ];

//   // for (const category of categories) {
//   //   queries.push({
//   //     sql: `INSERT INTO review_categories (review_id, category) VALUES (last_insert_rowid(), ?)`,
//   //     params: [category],
//   //   });
//   // }

//   if (categories.length > 0) {
//     const placeholders = categories
//       .map(() => `(last_insert_rowid(), ?)`)
//       .join(', ');
//     queries.push({
//       sql: `INSERT INTO review_categories (review_id, category) VALUES ${placeholders}`,
//       params: categories,
//     });
//   }

//   return queries;
// });

ipcMain.handle('add-review', async (_event, reviewData) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      console.error(`Database not connected`);
      return resolve(null);
    }

    db.serialize(() => {
      if (!db) {
        console.error(`Database not connected`);
        return resolve(null);
      }
      db.run('BEGIN TRANSACTION');

      // Insert review
      const insertReviewSQL = `
        INSERT INTO reviews (
          ${reviewColumns.map(([name]) => name).join(', ')}
        ) VALUES (
          ${reviewColumns.map(() => '?').join(', ')}
        )`;

      const reviewValues = reviewColumns.map(([name]) => reviewData[name]);

      db.run(insertReviewSQL, reviewValues, function (err) {
        if (!db) {
          console.error(`Database not connected`);
          return resolve(null);
        }
        if (err) {
          db?.run('ROLLBACK');
          return reject(err);
        }

        const reviewId = this.lastID;
        const categories = reviewData.review_categories as string[];

        if (categories.length > 0) {
          const placeholders = categories.map(() => `(?, ?)`).join(', ');
          const categoryValues = categories.flatMap((c) => [reviewId, c]);

          const insertCategoriesSQL = `
            INSERT INTO review_categories (review_id, category)
            VALUES ${placeholders}`;

          db.run(insertCategoriesSQL, categoryValues, function (err) {
            if (err) {
              db?.run('ROLLBACK');
              return reject(err);
            }
            db?.run('COMMIT');
            resolve(reviewId); // maybe return the new id?
          });
        } else {
          db.run('COMMIT');
          resolve(reviewId);
        }
      });
    });
  });
});

handleDatabaseQuery('fetch-all-reviews', 'all', 'SELECT * FROM reviews');

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
