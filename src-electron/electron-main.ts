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
  query: string,
  getParams: (...args: unknown[]) => unknown[] = () => [],
) {
  ipcMain.handle(name, async (_event, ...args) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        console.error(`Database not connected after call to ${name}`);
        return resolve(null);
      }

      const params = getParams(...args);
      const method = query.trim().toLowerCase().startsWith('select *')
        ? 'get'
        : 'all';

      db[method](query, params, (err: Error | null, result: unknown) => {
        if (err) {
          console.error(err);
          reject(new Error(`Error in ${name}`));
        } else {
          resolve(result);
        }
      });
    });
  });
}

handleDatabaseQuery('fetch-row-count', 'SELECT COUNT(*) AS count FROM data');

handleDatabaseQuery(
  'fetch-row-data',
  'SELECT * FROM data WHERE combined_id = ?',
  (id) => [id],
);

handleDatabaseQuery(
  'fetch-expanded-counts',
  'SELECT template_id, COUNT(DISTINCT expanded_id) AS count FROM data GROUP BY template_id',
);

handleDatabaseQuery(
  'fetch-paraphrased-counts',
  'SELECT template_id, expanded_id, COUNT(paraphrased_id) AS count FROM data WHERE template_id = ? AND expanded_id = ?',
  (templateId, expandedId) => [templateId, expandedId],
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
