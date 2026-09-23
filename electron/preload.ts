import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolders'),
  scanDirectories: (folders: string[]) => ipcRenderer.invoke('fs:scanDirectories', folders),
  openVideo: (filePathOrOptions: string | any, playerType?: 'system' | 'custom', customPath?: string) => {
    if (typeof filePathOrOptions === 'object' && filePathOrOptions !== null) {
      return ipcRenderer.invoke('player:openFile', filePathOrOptions);
    }
    return ipcRenderer.invoke('player:openFile', { filePath: filePathOrOptions, playerType, customPath });
  },
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
  detectMpv: () => ipcRenderer.invoke('player:detectMpv'),
  validateMpv: (targetPath: string) => ipcRenderer.invoke('player:validateMpv', targetPath),
  browseMpvExecutable: () => ipcRenderer.invoke('dialog:openMpvFileDialog'),
  stopPlayback: () => ipcRenderer.invoke('player:stop'),
  onEpisodeWatched: (callback: (data: { animeId?: string; episodeId?: string; filePath?: string }) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('player:episodeWatched', listener);
    return () => ipcRenderer.removeListener('player:episodeWatched', listener);
  },
  onPlaybackProgress: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('player:playbackProgress', listener);
    return () => ipcRenderer.removeListener('player:playbackProgress', listener);
  },
  onEpisodeChanged: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('player:episodeChanged', listener);
    return () => ipcRenderer.removeListener('player:episodeChanged', listener);
  },
  onPlaybackClosed: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('player:playbackClosed', listener);
    return () => ipcRenderer.removeListener('player:playbackClosed', listener);
  },
});
