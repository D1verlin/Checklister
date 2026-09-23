import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, nativeImage, type NativeImage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { spawn, exec } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  initDiscordRpc,
  setDiscordActivity,
  clearDiscordActivity,
  setDiscordRpcEnabled,
  destroyDiscordRpc,
} from './discord.ts';
import { MpvManager } from './mpvManager.ts';
import { detectMpvExecutable, validateMpvPath } from './mpvDetector.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
const mpvManager = new MpvManager(() => mainWindow);

interface ActivePlaybackSession {
  filePath: string;
  animeId?: string;
  episodeId?: string;
  startTime: number;
}
let currentPlayback: ActivePlaybackSession | null = null;

const userDataPath = app.getPath('userData');
const settingsFile = path.join(userDataPath, 'settings.json');
const libraryFile = path.join(userDataPath, 'library.json');
const coversDir = path.join(userDataPath, 'cache', 'covers');

function ensureCoversDir() {
  try {
    if (!fs.existsSync(coversDir)) {
      fs.mkdirSync(coversDir, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create coversDir:', err);
  }
}
ensureCoversDir();

const inFlightDownloads = new Map<string, Promise<string | null>>();

// Register privileged custom scheme for zero-latency local image serving
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'checklister-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function getAppIcon(): NativeImage | undefined {
  const appPath = app.getAppPath();
  const candidates = [
    path.join(appPath, 'public', 'icon.ico'),
    path.join(appPath, 'build', 'icon.ico'),
    path.join(appPath, 'public', 'icon.png'),
    path.resolve(__dirname, '../public/icon.ico'),
    path.resolve(__dirname, '../build/icon.ico'),
    path.resolve(__dirname, '../public/icon.png'),
    path.resolve(process.cwd(), 'public', 'icon.ico'),
    path.resolve(process.cwd(), 'build', 'icon.ico'),
    path.resolve(process.cwd(), 'public', 'icon.png'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const img = nativeImage.createFromPath(candidate);
      if (!img.isEmpty()) {
        console.log('[Electron] Loaded window icon from:', candidate);
        return img;
      }
    }
  }
  return undefined;
}

function createWindow() {
  const preloadCandidate = path.resolve(__dirname, 'preload.cjs');
  const preloadCandidateFallback = path.resolve(process.cwd(), 'dist-electron', 'preload.cjs');
  const preloadSourceFallback = path.resolve(process.cwd(), 'electron', 'preload.cjs');
  const preloadPath = fs.existsSync(preloadCandidate)
    ? preloadCandidate
    : fs.existsSync(preloadCandidateFallback)
    ? preloadCandidateFallback
    : preloadSourceFallback;

  console.log('[Electron] Using preload path:', preloadPath);

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 650,
    frame: false,
    backgroundColor: '#121212',
    title: 'CheckLister',
    icon: getAppIcon(),
    webPreferences: {
      preload: preloadPath,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.on('preload-error', (_event, pPath, err) => {
    console.error('[Electron] Preload error in', pPath, err);
  });

  mainWindow.on('focus', () => {
    if (currentPlayback) {
      const elapsedMs = Date.now() - currentPlayback.startTime;
      if (elapsedMs >= 300000 && currentPlayback.animeId) {
        mainWindow?.webContents.send('player:episodeWatched', {
          animeId: currentPlayback.animeId,
          episodeId: currentPlayback.episodeId,
          filePath: currentPlayback.filePath,
        });
        currentPlayback = null;
      }
    }
  });

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized-change', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized-change', false);
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle external link clicks
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // F12 to toggle Chrome DevTools
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      if (mainWindow?.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow?.webContents.openDevTools({ mode: 'detach' });
      }
    }
  });
}

// Window control handlers
ipcMain.handle('window:minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  win?.minimize();
});

ipcMain.handle('window:maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (!win) return false;
  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
  return win.isMaximized();
});

ipcMain.handle('window:close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  win?.close();
});

ipcMain.handle('window:isMaximized', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  return win?.isMaximized() || false;
});

// Chrome DevTools handlers
ipcMain.handle('devtools:toggle', () => {
  if (!mainWindow) return false;
  if (mainWindow.webContents.isDevToolsOpened()) {
    mainWindow.webContents.closeDevTools();
  } else {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
  return mainWindow.webContents.isDevToolsOpened();
});

ipcMain.handle('devtools:setOpen', (_event, open: boolean) => {
  if (!mainWindow) return false;
  if (open) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.webContents.closeDevTools();
  }
  return open;
});

// Recursively traverse directory to find media files
async function walkDirectory(
  dir: string,
  results: { name: string; path: string; size: number; parentDir: string; dirPath: string }[] = []
) {
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walkDirectory(fullPath, results);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.mkv', '.mp4', '.avi', '.webm'].includes(ext)) {
          let size = 0;
          try {
            const stat = await fs.promises.stat(fullPath);
            size = stat.size;
          } catch {
            // ignore stat failure
          }
          results.push({
            name: entry.name,
            path: fullPath,
            size,
            parentDir: path.basename(dir),
            dirPath: dir,
          });
        }
      }
    }
  } catch (err) {
    console.error(`Failed to scan dir ${dir}:`, err);
  }
  return results;
}

// IPC Handlers
ipcMain.handle('dialog:openFolders', async () => {
  try {
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    const res = win
      ? await dialog.showOpenDialog(win, {
          properties: ['openDirectory', 'multiSelections'],
          title: 'Select Anime Folders to Scan',
        })
      : await dialog.showOpenDialog({
          properties: ['openDirectory', 'multiSelections'],
          title: 'Select Anime Folders to Scan',
        });
    return res.canceled ? [] : res.filePaths;
  } catch (err) {
    console.error('dialog error:', err);
    return [];
  }
});

ipcMain.handle('fs:scanDirectories', async (_event, folderPaths: string[]) => {
  const allFiles: { name: string; path: string; size: number; parentDir: string; dirPath: string }[] = [];
  for (const folder of folderPaths) {
    if (fs.existsSync(folder)) {
      await walkDirectory(folder, allFiles);
    }
  }
  return allFiles;
});

ipcMain.handle('player:detectMpv', async () => {
  return await detectMpvExecutable();
});

ipcMain.handle('player:validateMpv', async (_event, targetPath: string) => {
  return await validateMpvPath(targetPath);
});

ipcMain.handle('dialog:openMpvFileDialog', async () => {
  try {
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    const opts = {
      title: 'Выберите исполняемый файл mpv (mpv.exe)',
      filters: [
        { name: 'Исполняемый файл mpv (*.exe, *.com)', extensions: ['exe', 'com'] },
        { name: 'Все файлы (*.*)', extensions: ['*'] },
      ],
      properties: ['openFile' as const],
    };
    const res = win
      ? await dialog.showOpenDialog(win, opts)
      : await dialog.showOpenDialog(opts);
    return res.canceled || res.filePaths.length === 0 ? null : res.filePaths[0];
  } catch (err) {
    console.error('[Electron] dialog:openMpvFileDialog error:', err);
    return null;
  }
});

ipcMain.handle('player:stop', async () => {
  await mpvManager.stopPlayback();
  return { success: true };
});

ipcMain.handle(
  'player:openFile',
  async (
    _event,
    payload: {
      filePath: string;
      playerType?: 'mpv' | 'system' | 'custom';
      mpvPath?: string;
      customPath?: string;
      playlist?: { id: string; filePath: string; episodeNumber?: number; title?: string }[];
      animeId?: string;
      episodeId?: string;
      animeTitle?: string;
      episodeNumber?: number;
      totalEpisodes?: number;
      thresholdPercent?: number;
      autoNext?: boolean;
    }
  ) => {
    const {
      filePath,
      playerType = 'mpv',
      mpvPath,
      customPath,
      playlist,
      animeId,
      episodeId,
      animeTitle,
      episodeNumber,
      totalEpisodes,
      thresholdPercent,
      autoNext,
    } = payload;

    if (!filePath) {
      return { success: false, error: 'Empty file path' };
    }

    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: `Файл не найден на диске: ${filePath}`,
      };
    }

    // 1. MPV with JSON-IPC & playlist support
    if (playerType === 'mpv') {
      let targetMpvPath = mpvPath || customPath;
      if (!targetMpvPath || !fs.existsSync(targetMpvPath)) {
        const detected = await detectMpvExecutable();
        if (detected?.path) {
          targetMpvPath = detected.path;
        }
      }

      if (!targetMpvPath || !fs.existsSync(targetMpvPath)) {
        return {
          success: false,
          error: 'Исполняемый файл mpv.exe не найден. Перейдите в Настройки и нажмите «Найти автоматически» или укажите путь через «Обзор».',
        };
      }

      const initialEpisode = {
        id: episodeId || path.basename(filePath),
        filePath,
        episodeNumber,
        title: animeTitle,
      };

      return await mpvManager.startPlayback({
        mpvPath: targetMpvPath,
        initialEpisode,
        playlist,
        animeId,
        animeTitle,
        totalEpisodes,
        thresholdPercent: thresholdPercent ?? 85,
        autoNext: autoNext ?? true,
      });
    }

    // 2. Custom Player Fallback
    if (playerType === 'custom' && customPath && fs.existsSync(customPath)) {
      currentPlayback = {
        filePath,
        animeId,
        episodeId,
        startTime: Date.now(),
      };

      if (animeTitle) {
        const stateStr = totalEpisodes
          ? `Серия ${episodeNumber || 1} из ${totalEpisodes}`
          : `Серия ${episodeNumber || 1}`;
        setDiscordActivity({
          details: animeTitle,
          state: stateStr,
          startTimestamp: Date.now(),
        });
      }

      const proc = spawn(customPath, [filePath], {
        detached: false,
        stdio: 'ignore',
      });

      proc.on('close', () => {
        if (currentPlayback && currentPlayback.filePath === filePath) {
          const elapsedMs = Date.now() - currentPlayback.startTime;
          if (elapsedMs >= 180000 && currentPlayback.animeId) {
            mainWindow?.webContents.send('player:episodeWatched', {
              animeId: currentPlayback.animeId,
              episodeId: currentPlayback.episodeId,
              filePath: currentPlayback.filePath,
            });
          }
          currentPlayback = null;
        }
        clearDiscordActivity();
      });

      return { success: true };
    }

    // 3. System Default Player via Windows Association
    currentPlayback = {
      filePath,
      animeId,
      episodeId,
      startTime: Date.now(),
    };

    if (animeTitle) {
      const stateStr = totalEpisodes
        ? `Серия ${episodeNumber || 1} из ${totalEpisodes}`
        : `Серия ${episodeNumber || 1}`;
      setDiscordActivity({
        details: animeTitle,
        state: stateStr,
        startTimestamp: Date.now(),
      });
    }

    const err = await shell.openPath(filePath);
    if (err) {
      return { success: false, error: err };
    }
    return { success: true };
  }
);

ipcMain.handle('fs:renameFiles', async (_event, operations: { oldPath: string; newName: string }[]) => {
  const results: { oldPath: string; newPath: string; success: boolean; error?: string }[] = [];
  const tempStages: { op: { oldPath: string; newName: string }; tempPath: string }[] = [];

  // Phase 1: Pre-validation & Rename each file to a unique temporary name in the same directory.
  // This frees all destination names and prevents Windows NTFS case-insensitivity collisions.
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    try {
      if (!fs.existsSync(op.oldPath)) {
        results.push({ oldPath: op.oldPath, newPath: '', success: false, error: 'Исходный файл не найден' });
        continue;
      }
      const dir = path.dirname(op.oldPath);
      const ext = path.extname(op.oldPath);
      const tempName = `.chk_tmp_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}${ext}`;
      const tempPath = path.join(dir, tempName);

      await fs.promises.rename(op.oldPath, tempPath);
      tempStages.push({ op, tempPath });
    } catch (err) {
      results.push({ oldPath: op.oldPath, newPath: '', success: false, error: (err as Error).message });
    }
  }

  // Phase 2: Final rename to the requested newName (with automatic duplicate-safe resolution if an external file exists)
  for (const item of tempStages) {
    const { op, tempPath } = item;
    try {
      const dir = path.dirname(op.oldPath);
      let targetPath = path.join(dir, op.newName);

      // If an existing file on disk already has this exact name, auto-number to avoid data loss and collision error:
      if (fs.existsSync(targetPath)) {
        const parsed = path.parse(op.newName);
        let counter = 1;
        while (fs.existsSync(targetPath)) {
          targetPath = path.join(dir, `${parsed.name} (${counter})${parsed.ext}`);
          counter++;
        }
      }

      await fs.promises.rename(tempPath, targetPath);
      results.push({ oldPath: op.oldPath, newPath: targetPath, success: true });
    } catch (err) {
      // If final rename fails, attempt to restore to original path
      try {
        if (fs.existsSync(tempPath) && !fs.existsSync(op.oldPath)) {
          await fs.promises.rename(tempPath, op.oldPath);
        }
      } catch {}
      results.push({ oldPath: op.oldPath, newPath: '', success: false, error: (err as Error).message });
    }
  }

  return results;
});

ipcMain.handle('discord:setActivity', async (_event, activity) => {
  return setDiscordActivity(activity);
});

ipcMain.handle('discord:clearActivity', async () => {
  return clearDiscordActivity();
});

ipcMain.handle('discord:setEnabled', async (_event, enabled: boolean) => {
  return setDiscordRpcEnabled(enabled);
});

ipcMain.handle('explorer:showItem', async (_event, filePath: string) => {
  if (!filePath) return { success: false, error: 'Empty path' };
  if (fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
    return { success: true };
  }
  const parent = path.dirname(filePath);
  if (fs.existsSync(parent)) {
    shell.openPath(parent);
    return { success: true };
  }
  return { success: false, error: `Папка не найдена: ${filePath}` };
});

ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle('storage:saveSettings', async (_event, settings) => {
  try {
    await fs.promises.writeFile(settingsFile, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('storage:loadSettings', async () => {
  try {
    if (fs.existsSync(settingsFile)) {
      const data = await fs.promises.readFile(settingsFile, 'utf-8');
      return JSON.parse(data);
    }
  } catch {}
  return null;
});

ipcMain.handle('storage:saveLibrary', async (_event, data) => {
  try {
    const anime = Array.isArray(data?.anime) ? data.anime : [];
    const episodes = Array.isArray(data?.episodes) ? data.episodes : [];

    const uniqueAnimeMap = new Map<string, any>();
    for (const a of anime) {
      if (a?.id && !uniqueAnimeMap.has(a.id)) {
        uniqueAnimeMap.set(a.id, a);
      }
    }

    const uniqueEpMap = new Map<string, any>();
    for (const ep of episodes) {
      if (ep?.filePath && !uniqueEpMap.has(ep.filePath)) {
        uniqueEpMap.set(ep.filePath, ep);
      }
    }

    const cleanData = {
      anime: Array.from(uniqueAnimeMap.values()),
      episodes: Array.from(uniqueEpMap.values()),
    };

    await fs.promises.writeFile(libraryFile, JSON.stringify(cleanData, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('storage:loadLibrary', async () => {
  try {
    if (fs.existsSync(libraryFile)) {
      const data = await fs.promises.readFile(libraryFile, 'utf-8');
      const parsed = JSON.parse(data);
      const anime = Array.isArray(parsed?.anime) ? parsed.anime : [];
      const episodes = Array.isArray(parsed?.episodes) ? parsed.episodes : [];

      const uniqueAnimeMap = new Map<string, any>();
      for (const a of anime) {
        if (a?.id && !uniqueAnimeMap.has(a.id)) {
          uniqueAnimeMap.set(a.id, a);
        }
      }

      const uniqueEpMap = new Map<string, any>();
      for (const ep of episodes) {
        if (ep?.filePath && !uniqueEpMap.has(ep.filePath)) {
          uniqueEpMap.set(ep.filePath, ep);
        }
      }

      const animeList = Array.from(uniqueAnimeMap.values()).map((a) => {
        if (!a.localCover && a.id) {
          const safeId = a.id.replace(/[^a-zA-Z0-9_-]/g, '_');
          const targetFile = path.join(coversDir, `${safeId}.jpg`);
          if (fs.existsSync(targetFile)) {
            return { ...a, localCover: `checklister-media://${safeId}.jpg` };
          }
        }
        return a;
      });

      return {
        anime: animeList,
        episodes: Array.from(uniqueEpMap.values()),
      };
    }
  } catch {}
  return null;
});

// Cache cover locally to disk with in-flight deduplication and URL fallback
ipcMain.handle(
  'cache:saveCover',
  async (_event, { animeId, url, urls }: { animeId: string; url?: string; urls?: string[] }) => {
    if (!animeId) return null;
    const safeId = animeId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const targetFile = path.join(coversDir, `${safeId}.jpg`);

    // 1. If already cached, return immediately
    if (fs.existsSync(targetFile)) {
      return `checklister-media://${safeId}.jpg`;
    }

    // 2. If a download is already in-flight for this anime, await the existing promise
    const existing = inFlightDownloads.get(safeId);
    if (existing) {
      return existing;
    }

    // 3. Initiate deduplicated download
    const downloadPromise = (async (): Promise<string | null> => {
      try {
        ensureCoversDir();

        const candidateUrls: string[] = [];
        if (Array.isArray(urls)) {
          candidateUrls.push(...urls);
        }
        if (url) {
          candidateUrls.push(url);
        }

        const validUrls = Array.from(
          new Set(
            candidateUrls.filter(
              (u): u is string =>
                Boolean(u && typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://')))
            )
          )
        );

        if (validUrls.length === 0) return null;

        let downloadedBuffer: Buffer | null = null;
        for (const targetUrl of validUrls) {
          try {
            const fetchFn = typeof net !== 'undefined' && typeof net.fetch === 'function' ? net.fetch : fetch;
            const res = await fetchFn(targetUrl, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Referer': targetUrl.includes('anilist') ? 'https://anilist.co/' : 'https://shikimori.one/',
              },
              signal: AbortSignal.timeout(12000),
            });

            if (res.ok) {
              const arrayBuffer = await res.arrayBuffer();
              if (arrayBuffer.byteLength > 500) {
                downloadedBuffer = Buffer.from(arrayBuffer);
                break;
              }
            }
          } catch {
            // Silently try next fallback URL
          }
        }

        if (!downloadedBuffer) {
          return null;
        }

        await fs.promises.mkdir(path.dirname(targetFile), { recursive: true });
        await fs.promises.writeFile(targetFile, downloadedBuffer);
        return `checklister-media://${safeId}.jpg`;
      } catch (err) {
        console.warn(`[Cache] Error saving cover for ${animeId}:`, (err as Error).message);
        return null;
      } finally {
        inFlightDownloads.delete(safeId);
      }
    })();

    inFlightDownloads.set(safeId, downloadPromise);
    return downloadPromise;
  }
);

// Check if cover is already cached
ipcMain.handle('cache:getCover', async (_event, animeId: string) => {
  if (!animeId) return null;
  const safeId = animeId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const targetFile = path.join(coversDir, `${safeId}.jpg`);
  if (fs.existsSync(targetFile)) {
    return `checklister-media://${safeId}.jpg`;
  }
  return null;
});

app.whenReady().then(() => {
  ensureCoversDir();

  // Handle local image protocol
  protocol.handle('checklister-media', (request) => {
    try {
      const url = request.url.replace(/^checklister-media:\/\/+/, '');
      const cleanFileName = decodeURIComponent(url);
      const safePath = path.join(coversDir, path.basename(cleanFileName));
      if (fs.existsSync(safePath)) {
        return net.fetch(pathToFileURL(safePath).toString());
      }
    } catch (e) {
      console.error('[checklister-media] Failed to serve:', e);
    }
    return new Response('Not found', { status: 404 });
  });

  createWindow();
  initDiscordRpc();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  mpvManager.stopPlayback();
  destroyDiscordRpc();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
