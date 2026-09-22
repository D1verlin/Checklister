const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolders'),
  scanDirectories: (folders) => ipcRenderer.invoke('fs:scanDirectories', folders),
  openVideo: (filePathOrOptions, playerType, customPath) => {
    // Support either object options or positional arguments (filePath, playerType, customPath)
    if (typeof filePathOrOptions === 'object' && filePathOrOptions !== null) {
      return ipcRenderer.invoke('player:openFile', filePathOrOptions);
    }
    return ipcRenderer.invoke('player:openFile', { filePath: filePathOrOptions, playerType, customPath });
  },
  showInFolder: (filePath) => ipcRenderer.invoke('explorer:showItem', filePath),
  renameFiles: (operations) => ipcRenderer.invoke('fs:renameFiles', operations),
  saveSettings: (settings) => ipcRenderer.invoke('storage:saveSettings', settings),
  loadSettings: () => ipcRenderer.invoke('storage:loadSettings'),
  saveLibrary: (data) => ipcRenderer.invoke('storage:saveLibrary', data),
  loadLibrary: () => ipcRenderer.invoke('storage:loadLibrary'),
  setDiscordActivity: (activity) => ipcRenderer.invoke('discord:setActivity', activity),
  clearDiscordActivity: () => ipcRenderer.invoke('discord:clearActivity'),
  setDiscordRpcEnabled: (enabled) => ipcRenderer.invoke('discord:setEnabled', enabled),
  onEpisodeWatched: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('player:episodeWatched', listener);
    return () => ipcRenderer.removeListener('player:episodeWatched', listener);
  },
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
