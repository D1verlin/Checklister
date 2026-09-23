import { loadSettings } from './storage.ts';

export interface OpenVideoOptions {
  filePath: string;
  animeId?: string;
  episodeId?: string;
  animeTitle?: string;
  episodeNumber?: number;
  totalEpisodes?: number;
  playlist?: { id: string; filePath: string; episodeNumber?: number; title?: string }[];
}

export async function openVideoFile(
  filePathOrOptions: string | OpenVideoOptions
): Promise<{ success: boolean; error?: string }> {
  const options: OpenVideoOptions =
    typeof filePathOrOptions === 'string' ? { filePath: filePathOrOptions } : filePathOrOptions;

  if (!options.filePath) {
    return { success: false, error: 'Empty file path' };
  }

  const settings = loadSettings();
  const electron = (window as any).electronAPI;

  if (electron?.openVideo) {
    const payload = {
      filePath: options.filePath,
      playerType: settings.playerType,
      mpvPath: settings.mpvPath,
      customPath: settings.customPlayerPath,
      animeId: options.animeId,
      episodeId: options.episodeId,
      animeTitle: options.animeTitle,
      episodeNumber: options.episodeNumber,
      totalEpisodes: options.totalEpisodes,
      playlist: options.playlist,
      thresholdPercent: settings.watchedThresholdPercent,
      autoNext: settings.autoNextEpisode,
    };
    const res = await electron.openVideo(payload);
    return res || { success: true };
  }

  // Web fallback simulation
  return {
    success: false,
    error: `Для запуска видеофайла откройте приложение через Electron ("npm run dev:electron"). Файл: ${options.filePath}`,
  };
}

export async function showInFileExplorer(filePath: string): Promise<{ success: boolean; error?: string }> {
  if (!filePath) {
    return { success: false, error: 'Empty file path' };
  }

  const electron = (window as any).electronAPI;
  if (electron?.showInFolder) {
    const res = await electron.showInFolder(filePath);
    return res || { success: true };
  }

  return {
    success: false,
    error: `Для открытия папки в проводнике запустите Electron ("npm run dev:electron"). Путь: ${filePath}`,
  };
}

export async function detectMpvExecutable(): Promise<{ path: string; version?: string; source: string } | null> {
  const electron = (window as any).electronAPI;
  if (electron?.detectMpv) {
    return await electron.detectMpv();
  }
  return null;
}

export async function validateMpvPath(targetPath: string): Promise<{ valid: boolean; version?: string; error?: string }> {
  const electron = (window as any).electronAPI;
  if (electron?.validateMpv) {
    return await electron.validateMpv(targetPath);
  }
  return { valid: false, error: 'Electron API недоступен' };
}

export async function browseMpvExecutable(): Promise<string | null> {
  const electron = (window as any).electronAPI;
  if (electron?.browseMpvExecutable) {
    return await electron.browseMpvExecutable();
  }
  return null;
}

export async function stopPlayback(): Promise<void> {
  const electron = (window as any).electronAPI;
  if (electron?.stopPlayback) {
    await electron.stopPlayback();
  }
}
