import fs from 'fs';
import path from 'path';
import net from 'net';
import { ChildProcess, spawn } from 'child_process';
import { BrowserWindow } from 'electron';
import { setDiscordActivity, clearDiscordActivity } from './discord.ts';

export interface MpvEpisodeItem {
  id: string;
  filePath: string;
  episodeNumber?: number;
  title?: string;
}

export interface MpvPlaybackOptions {
  mpvPath: string;
  initialEpisode: MpvEpisodeItem;
  playlist?: MpvEpisodeItem[];
  animeId?: string;
  animeTitle?: string;
  totalEpisodes?: number;
  thresholdPercent?: number; // default 85%
  autoNext?: boolean; // default true
}

export interface PlaybackProgressPayload {
  animeId?: string;
  episodeId: string;
  filePath: string;
  episodeNumber?: number;
  timePos: number;
  duration: number;
  percent: number;
  isPaused: boolean;
}

export class MpvManager {
  private currentProc: ChildProcess | null = null;
  private socket: net.Socket | null = null;
  private pipePath: string = '';
  private currentOptions: MpvPlaybackOptions | null = null;
  private activeEpisode: MpvEpisodeItem | null = null;
  private episodeMap = new Map<string, MpvEpisodeItem>(); // normalized filePath -> episode

  private currentTimePos = 0;
  private currentDuration = 0;
  private isPaused = false;
  private watchedEpisodeIds = new Set<string>();

  private lastDiscordUpdate = 0;
  private lastProgressDispatch = 0;
  private reqIdCounter = 1;
  private getMainWindow: () => BrowserWindow | null;

  constructor(getMainWindow: () => BrowserWindow | null) {
    this.getMainWindow = getMainWindow;
  }

  public isRunning(): boolean {
    return this.currentProc !== null && !this.currentProc.killed;
  }

  public async startPlayback(options: MpvPlaybackOptions): Promise<{ success: boolean; error?: string }> {
    // 1. Terminate any previous playback session cleanly
    await this.stopPlayback();

    const { mpvPath, initialEpisode, playlist = [], animeId, animeTitle, totalEpisodes, thresholdPercent = 85, autoNext = true } = options;

    if (!fs.existsSync(mpvPath)) {
      return { success: false, error: `Исполняемый файл mpv не найден: ${mpvPath}` };
    }
    if (!fs.existsSync(initialEpisode.filePath)) {
      return { success: false, error: `Файл эпизода не найден на диске: ${initialEpisode.filePath}` };
    }

    this.currentOptions = options;
    this.activeEpisode = initialEpisode;
    this.currentTimePos = 0;
    this.currentDuration = 0;
    this.isPaused = false;
    this.watchedEpisodeIds.clear();

    // Build episode map for fast lookup on playlist navigation
    this.episodeMap.clear();
    const normalize = (p: string) => path.normalize(p).toLowerCase();
    this.episodeMap.set(normalize(initialEpisode.filePath), initialEpisode);
    for (const ep of playlist) {
      if (fs.existsSync(ep.filePath)) {
        this.episodeMap.set(normalize(ep.filePath), ep);
      }
    }

    // 2. Setup unique named pipe path
    const pipeId = `checklister-mpv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.pipePath = process.platform === 'win32'
      ? `\\\\.\\pipe\\${pipeId}`
      : `/tmp/${pipeId}.sock`;

    // 3. Prepare mpv CLI arguments
    const mpvArgs: string[] = [
      `--input-ipc-server=${this.pipePath}`,
      '--player-operation-mode=pseudo-gui',
      '--keep-open=yes',
      '--force-window=yes',
      initialEpisode.filePath,
    ];

    // If autoNext is enabled, append remaining playlist episodes to mpv's queue
    if (autoNext && playlist.length > 0) {
      for (const item of playlist) {
        if (normalize(item.filePath) !== normalize(initialEpisode.filePath) && fs.existsSync(item.filePath)) {
          mpvArgs.push(item.filePath);
        }
      }
    }

    // 4. Initial Discord Presence
    if (animeTitle) {
      const epNum = initialEpisode.episodeNumber || 1;
      const stateStr = totalEpisodes
        ? `Серия ${epNum} из ${totalEpisodes}`
        : `Серия ${epNum}`;

      setDiscordActivity({
        details: animeTitle,
        state: stateStr,
        startTimestamp: Date.now(),
        largeImageKey: 'checklister_icon',
        largeImageText: animeTitle,
      });
    }

    // 5. Spawn mpv process
    try {
      this.currentProc = spawn(mpvPath, mpvArgs, {
        detached: false,
        stdio: 'ignore',
      });

      this.currentProc.on('error', (err) => {
        console.error('[MpvManager] Process spawn error:', err);
        this.cleanup();
      });

      this.currentProc.on('close', (code) => {
        console.log('[MpvManager] mpv closed with code:', code);
        this.cleanup();
      });
    } catch (err) {
      this.cleanup();
      return { success: false, error: (err as Error).message };
    }

    // 6. Connect to mpv IPC named pipe with retries
    this.connectIpcWithRetry(this.pipePath);

    return { success: true };
  }

  private connectIpcWithRetry(pipePath: string, attempt = 1, maxAttempts = 35) {
    if (!this.isRunning()) return;

    const socket = net.connect(pipePath);

    socket.on('connect', () => {
      console.log(`[MpvManager] Connected to IPC socket at: ${pipePath}`);
      this.socket = socket;
      this.initIpcSubscriptions();
    });

    let buffer = '';
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const msg = JSON.parse(trimmed);
          this.handleMpvMessage(msg);
        } catch {
          // Ignore malformed JSON chunks
        }
      }
    });

    socket.on('error', (_err) => {
      socket.destroy();
      if (attempt < maxAttempts && this.isRunning()) {
        setTimeout(() => {
          this.connectIpcWithRetry(pipePath, attempt + 1, maxAttempts);
        }, 120);
      } else {
        console.warn(`[MpvManager] Could not connect to IPC after ${attempt} attempts`);
      }
    });

    socket.on('close', () => {
      this.socket = null;
    });
  }

  private initIpcSubscriptions() {
    // Register property observers
    this.sendCommand(['observe_property', 1, 'time-pos']);
    this.sendCommand(['observe_property', 2, 'duration']);
    this.sendCommand(['observe_property', 3, 'pause']);
    this.sendCommand(['observe_property', 4, 'path']);
    this.sendCommand(['observe_property', 5, 'eof-reached']);

    // Welcome OSD notification inside mpv window
    if (this.activeEpisode) {
      const epNum = this.activeEpisode.episodeNumber;
      const text = epNum ? `CheckLister: Серия ${epNum}` : 'CheckLister: Воспроизведение';
      this.showOsd(text, 2500);
    }
  }

  private handleMpvMessage(msg: any) {
    if (!msg || typeof msg !== 'object') return;

    if (msg.event === 'property-change') {
      const propName = msg.name;
      const val = msg.data;

      switch (propName) {
        case 'time-pos':
          if (typeof val === 'number') {
            this.currentTimePos = Math.max(0, val);
            this.onProgressTick();
          }
          break;

        case 'duration':
          if (typeof val === 'number' && val > 0) {
            this.currentDuration = val;
            this.updateDiscordRpc(true);
          }
          break;

        case 'pause':
          if (typeof val === 'boolean') {
            this.isPaused = val;
            this.updateDiscordRpc(true);
            this.dispatchProgress();
          }
          break;

        case 'path':
          if (typeof val === 'string' && val.trim()) {
            this.onPathChanged(val.trim());
          }
          break;

        case 'eof-reached':
          if (val === true) {
            this.checkWatchedThreshold(true);
          }
          break;
      }
    }
  }

  private onProgressTick() {
    this.checkWatchedThreshold(false);

    // Throttle progress dispatch to frontend (once per second)
    const now = Date.now();
    if (now - this.lastProgressDispatch >= 1000) {
      this.lastProgressDispatch = now;
      this.dispatchProgress();
    }

    // Throttle Discord update (every 6 seconds when playing)
    if (now - this.lastDiscordUpdate >= 6000 && !this.isPaused) {
      this.updateDiscordRpc(false);
    }
  }

  private checkWatchedThreshold(isEof: boolean) {
    if (!this.activeEpisode) return;

    const epId = this.activeEpisode.id;
    if (this.watchedEpisodeIds.has(epId)) return;

    const threshold = this.currentOptions?.thresholdPercent || 85;
    const percent = this.currentDuration > 0
      ? (this.currentTimePos / this.currentDuration) * 100
      : 0;

    if (isEof || (this.currentDuration > 60 && percent >= threshold)) {
      this.watchedEpisodeIds.add(epId);

      const win = this.getMainWindow();
      win?.webContents.send('player:episodeWatched', {
        animeId: this.currentOptions?.animeId,
        episodeId: epId,
        filePath: this.activeEpisode.filePath,
      });

      const epNum = this.activeEpisode.episodeNumber;
      this.showOsd(
        epNum ? `CheckLister: Серия ${epNum} отмечена просмотренной` : 'CheckLister: Серия просмотрена',
        3000
      );
    }
  }

  private onPathChanged(rawPath: string) {
    const normalize = (p: string) => path.normalize(p).toLowerCase();
    const matched = this.episodeMap.get(normalize(rawPath));

    if (matched && matched.id !== this.activeEpisode?.id) {
      console.log(`[MpvManager] Switched active episode to: EP ${matched.episodeNumber} (${matched.filePath})`);
      this.activeEpisode = matched;
      this.currentTimePos = 0;
      this.currentDuration = 0;

      const win = this.getMainWindow();
      win?.webContents.send('player:episodeChanged', {
        animeId: this.currentOptions?.animeId,
        episodeId: matched.id,
        filePath: matched.filePath,
        episodeNumber: matched.episodeNumber,
      });

      if (matched.episodeNumber) {
        this.showOsd(`CheckLister: Серия ${matched.episodeNumber}`, 3000);
      }

      this.updateDiscordRpc(true);
    }
  }

  private dispatchProgress() {
    if (!this.activeEpisode) return;

    const win = this.getMainWindow();
    if (!win || win.isDestroyed()) return;

    const percent = this.currentDuration > 0
      ? Math.min(100, (this.currentTimePos / this.currentDuration) * 100)
      : 0;

    const payload: PlaybackProgressPayload = {
      animeId: this.currentOptions?.animeId,
      episodeId: this.activeEpisode.id,
      filePath: this.activeEpisode.filePath,
      episodeNumber: this.activeEpisode.episodeNumber,
      timePos: Math.floor(this.currentTimePos),
      duration: Math.floor(this.currentDuration),
      percent: Math.round(percent),
      isPaused: this.isPaused,
    };

    win.webContents.send('player:playbackProgress', payload);
  }

  private updateDiscordRpc(force = false) {
    if (!this.currentOptions?.animeTitle || !this.activeEpisode) return;

    const now = Date.now();
    this.lastDiscordUpdate = now;

    const { animeTitle, totalEpisodes } = this.currentOptions;
    const epNum = this.activeEpisode.episodeNumber || 1;
    const epLabel = totalEpisodes ? `Серия ${epNum} из ${totalEpisodes}` : `Серия ${epNum}`;

    if (this.isPaused) {
      setDiscordActivity({
        details: animeTitle,
        state: `[На паузе] ${epLabel}`,
        largeImageKey: 'checklister_icon',
        largeImageText: animeTitle,
      });
    } else {
      const remainingSec = Math.max(0, this.currentDuration - this.currentTimePos);
      const endTimestamp = this.currentDuration > 0 ? now + remainingSec * 1000 : undefined;

      setDiscordActivity({
        details: animeTitle,
        state: epLabel,
        startTimestamp: endTimestamp ? undefined : now,
        endTimestamp,
        largeImageKey: 'checklister_icon',
        largeImageText: animeTitle,
      });
    }
  }

  public sendCommand(args: (string | number | boolean)[]): boolean {
    if (!this.socket || this.socket.destroyed) return false;
    try {
      const req = {
        command: args,
        request_id: this.reqIdCounter++,
      };
      this.socket.write(JSON.stringify(req) + '\n');
      return true;
    } catch (e) {
      console.warn('[MpvManager] sendCommand failed:', e);
      return false;
    }
  }

  public showOsd(text: string, durationMs = 3000) {
    this.sendCommand(['show-text', text, durationMs]);
  }

  public async stopPlayback(): Promise<void> {
    if (this.socket) {
      try {
        this.sendCommand(['quit']);
      } catch {}
      this.socket.destroy();
      this.socket = null;
    }

    if (this.currentProc && !this.currentProc.killed) {
      try {
        this.currentProc.kill('SIGTERM');
      } catch {}
    }

    this.cleanup();
  }

  private cleanup() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.currentProc = null;
    this.currentOptions = null;
    this.activeEpisode = null;
    this.episodeMap.clear();
    this.currentTimePos = 0;
    this.currentDuration = 0;
    this.isPaused = false;

    clearDiscordActivity();

    const win = this.getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('player:playbackClosed');
    }
  }
}
