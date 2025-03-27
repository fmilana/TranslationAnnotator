// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose IPC functions to renderer process
contextBridge.exposeInMainWorld('electron', {
  // Dialog operations
  openDialog: (options) => ipcRenderer.invoke('open-dialog', options),
  
  // File operations - delegate to main process
  saveFiles: (destPath) => ipcRenderer.invoke('save-files', destPath),

  // File operations - delegate to main process
  readData: (translator, tag) => ipcRenderer.invoke('read-data', translator, tag),

  // File operations - delegate to main process
  updateSaveButton: (translators, tags) => ipcRenderer.invoke('update-save-button'),
});