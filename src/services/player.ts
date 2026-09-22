import { loadSettings } from './storage.ts';

export async function openVideoFile(filePath: string): Promise<{ success: boolean; error?: string }> {
  if (!filePath) {
    return { success: false, error: 'Empty file path' };
  }

  const settings = loadSettings();
  const electron = (window as any).electronAPI;

  if (electron?.openVideo) {
    const res = await electron.openVideo(filePath, settings.playerType, settings.customPlayerPath);
    return res || { success: true };
  }

  // Web fallback simulation
  return {
    success: false,
    error: `Для запуска видеофайла откройте приложение через Electron ("npm run dev:electron"). Файл: ${filePath}`,
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
