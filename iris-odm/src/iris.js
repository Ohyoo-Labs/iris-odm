/**
 * @run This file is used to run the application, it is not a test file.
 * @file Main file for the Iris ODM module.
 * Import all the necessary classes and functions. Export them as a single object.
 */

/* Check for browser support for IndexedDB and the window instance is not in private mode, show a error message if not supported and stop the execution */
(function checkBrowserSupport() {
  if (!window.indexedDB) {
    throw new Error('IndexedDB is not supported in this browser. Please use a modern browser to run this application.');
  }
  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then((quota) => {
      if (quota.usage >= quota.quota) {
        throw new Error('Storage quota exceeded. Please clear some space to run this application.');
      }
      console.log('Storage quota:', quota);
    });
  } else {
    throw new Error('Storage estimation is not supported in this browser.');
  }
})();


import { IrisUtils } from './IrisUtils.js';
import { Schema } from './Schema.js';
import { Model } from './Model.js';
import { SyncManager } from './Sync.js';
import { FileSystemManager } from './FileSystem.js';

export { IrisUtils, Schema, Model, SyncManager, FileSystemManager };