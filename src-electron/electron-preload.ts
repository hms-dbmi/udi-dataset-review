/**
 * This file is used specifically for security reasons.
 * Here you can access Nodejs stuff and inject functionality into
 * the renderer thread (accessible there through the "window" object)
 *
 * WARNING!
 * If you import anything from node_modules, then make sure that the package is specified
 * in package.json > dependencies and NOT in devDependencies
 *
 * Example (injects window.myAPI.doAThing() into renderer thread):
 *
 *   import { contextBridge } from 'electron'
 *
 *   contextBridge.exposeInMainWorld('myAPI', {
 *     doAThing: () => {}
 *   })
 *
 * WARNING!
 * If accessing Node functionality (like importing @electron/remote) then in your
 * electron-main.ts you will need to set the following when you instantiate BrowserWindow:
 *
 * mainWindow = new BrowserWindow({
 *   // ...
 *   webPreferences: {
 *     // ...
 *     sandbox: false // <-- to be able to import @electron/remote in preload script
 *   }
 * }
 */

import { contextBridge, ipcRenderer } from 'electron';
import type {
  ExpandedCount,
  ParaphrasedCount,
  RowCount,
  TrainingData,
} from 'src/pages/TrainingDataPage.vue';
// Expose a safe API to the renderer process
contextBridge.exposeInMainWorld('electron', {
  fetchRowCount: () => ipcRenderer.invoke('fetch-row-count'),
  fetchRowData: (combinedId: string) =>
    ipcRenderer.invoke('fetch-row-data', combinedId),
  fetchExpandedCounts: () => ipcRenderer.invoke('fetch-expanded-counts'),
  fetchParaphrasedCounts: (templateId: number, expandedId: number) =>
    ipcRenderer.invoke('fetch-paraphrased-counts', templateId, expandedId),
});

declare global {
  interface Window {
    electron: {
      fetchRowCount: () => Promise<[RowCount]>;
      fetchRowData: (combinedId: string) => Promise<TrainingData>;
      fetchExpandedCounts: () => Promise<ExpandedCount[]>;
      fetchParaphrasedCounts: (
        templateId: number,
        expandedId: number,
      ) => Promise<[ParaphrasedCount]>;
      ipcRenderer: {
        sendMessage: (channel: string, message: string) => void;
      };
    };
  }
}
