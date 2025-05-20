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
  UserQuery,
} from 'src/pages/TrainingDataPage.vue';
// Expose a safe API to the renderer process
contextBridge.exposeInMainWorld('electron', {
  createReviews: () => ipcRenderer.invoke('create-reviews'),
  createUser: () => ipcRenderer.invoke('create-user'),
  fetchUser: () => ipcRenderer.invoke('fetch-user'),
  addReview: (review: Review) => ipcRenderer.invoke('add-review', review),
  fetchAllReviews: () => ipcRenderer.invoke('fetch-all-reviews'),
  fetchRowCount: () => ipcRenderer.invoke('fetch-row-count'),
  fetchRowData: (combinedId: string) =>
    ipcRenderer.invoke('fetch-row-data', combinedId),
  fetchRowDataFromId: (id: number) =>
    ipcRenderer.invoke('fetch-row-data-from-id', id),
  fetchExpandedCounts: () => ipcRenderer.invoke('fetch-expanded-counts'),
  fetchParaphrasedCounts: (templateId: number, expandedId: number) =>
    ipcRenderer.invoke('fetch-paraphrased-counts', templateId, expandedId),
});

declare global {
  interface Window {
    electron: {
      createReviews: () => Promise<void>;
      createUser: () => Promise<void>;
      fetchUser: () => Promise<UserQuery>;
      addReview: (review: Review) => Promise<void>;
      fetchAllReviews: () => Promise<Review[]>;
      fetchRowCount: () => Promise<[RowCount]>;
      fetchRowData: (combinedId: string) => Promise<TrainingData>;
      fetchRowDataFromId: (id: number) => Promise<TrainingData>;
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

export interface Review {
  data_id: number;
  original_id: number;
  combined_id: string;
  template_id: number;
  expanded_id: number;
  paraphrased_id: number;
  query_template: string;
  constraints: string;
  spec_template: string;
  query_type: string;
  creation_method: string;
  query_base: string;
  spec: string;
  solution: string;
  dataset_schema: string;
  query: string;
  expertise: number;
  formality: number;
  review_status: string;
  reviewer: string;
  review_comments: string;
  review_categories: string[];
}
