import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolders'),
  scanDirectories: (folders: string[]) => ipcRenderer.invoke('fs:scanDirectories', folders),
  openVideo: (filePath: string, playerType: 'system' | 'custom', customPath?: string) =>
    ipcRenderer.invoke('player:openFile', { filePath, playerType, customPath }),
  showInFolder: (filePath: string) => ipcRenderer.invoke('explorer:showItem', filePath),
  saveSettings: (settings: any) => ipcRenderer.invoke('storage:saveSettings', settings),
  loadSettings: () => ipcRenderer.invoke('storage:loadSettings'),
  saveLibrary: (data: any) => ipcRenderer.invoke('storage:saveLibrary', data),
  loadLibrary: () => ipcRenderer.invoke('storage:loadLibrary'),
  windowControls: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizedChange: (callback: (isMax: boolean) => void) => {
      const listener = (_e: any, isMax: boolean) => callback(isMax);
      ipcRenderer.on('window:maximized-change', listener);
      return () => ipcRenderer.removeListener('window:maximized-change', listener);
    },
  },
  toggleDevTools: () => ipcRenderer.invoke('devtools:toggle'),
  setDevTools: (open: boolean) => ipcRenderer.invoke('devtools:setOpen', open),
});
