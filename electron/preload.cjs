const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolders'),
  scanDirectories: (folders) => ipcRenderer.invoke('fs:scanDirectories', folders),
  openVideo: (filePath, playerType, customPath) =>
    ipcRenderer.invoke('player:openFile', { filePath, playerType, customPath }),
  showInFolder: (filePath) => ipcRenderer.invoke('explorer:showItem', filePath),
  saveSettings: (settings) => ipcRenderer.invoke('storage:saveSettings', settings),
  loadSettings: () => ipcRenderer.invoke('storage:loadSettings'),
  saveLibrary: (data) => ipcRenderer.invoke('storage:saveLibrary', data),
  loadLibrary: () => ipcRenderer.invoke('storage:loadLibrary'),
  windowControls: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizedChange: (callback) => {
      const listener = (_e, isMax) => callback(isMax);
      ipcRenderer.on('window:maximized-change', listener);
      return () => ipcRenderer.removeListener('window:maximized-change', listener);
    },
  },
  toggleDevTools: () => ipcRenderer.invoke('devtools:toggle'),
  setDevTools: (open) => ipcRenderer.invoke('devtools:setOpen', open),
  cacheCover: (animeId, urls) =>
    ipcRenderer.invoke('cache:saveCover', {
      animeId,
      urls: Array.isArray(urls) ? urls : [urls].filter(Boolean),
    }),
  getCachedCover: (animeId) => ipcRenderer.invoke('cache:getCover', animeId),
});
