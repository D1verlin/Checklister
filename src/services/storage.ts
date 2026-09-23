import type { AnimeMetadata, Episode, AppSettings } from '../types/index.ts';

const SETTINGS_KEY = 'anime_tracker_settings';
const ANIME_KEY = 'anime_tracker_library';
const EPISODES_KEY = 'anime_tracker_episodes';

export const defaultSettings: AppSettings = {
  scannedFolders: [],
  customFolders: ['Шедевры', 'Посмотреть позже'],
  playerType: 'mpv',
  mpvPath: '',
  customPlayerPath: '',
  autoNextEpisode: true,
  watchedThresholdPercent: 85,
  preferRussianTitles: true,
  autoScanOnStartup: true,
  discordRpcEnabled: true,
  autoTrackPlayback: true,
  uiLanguage: 'ru',
  devMode: false,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

/**
 * Async bootstrap for Electron: loads settings from the Electron-side JSON file
 * and syncs them into localStorage to ensure both sources are consistent.
 * Returns the merged settings object.
 */
export async function bootstrapSettingsFromElectron(): Promise<AppSettings> {
  try {
    const electron = (window as any).electronAPI;
    if (!electron?.loadSettings) return loadSettings();

    const electronSettings = await electron.loadSettings();
    if (electronSettings && typeof electronSettings === 'object') {
      const merged = { ...defaultSettings, ...electronSettings };
      // Sync Electron file -> localStorage so they're always in sync
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (e) {
    console.warn('Failed to load settings from Electron:', e);
  }
  return loadSettings();
}

/**
 * Async bootstrap for library from Electron file (source of truth).
 * Always loads from the Electron-side JSON file and syncs into localStorage.
 * Falls back to localStorage if Electron is unavailable or returns nothing.
 */
export async function bootstrapLibraryFromElectron(): Promise<{ anime: AnimeMetadata[]; episodes: Episode[] }> {
  try {
    const electron = (window as any).electronAPI;
    if (!electron?.loadLibrary) return loadLibrary();

    const data = await electron.loadLibrary();
    if (data && Array.isArray(data.anime)) {
      const anime: AnimeMetadata[] = data.anime;
      const episodes: Episode[] = Array.isArray(data.episodes) ? data.episodes : [];
      // Always sync Electron file → localStorage (Electron file IS the source of truth)
      localStorage.setItem(ANIME_KEY, JSON.stringify(anime));
      localStorage.setItem(EPISODES_KEY, JSON.stringify(episodes));
      return { anime, episodes };
    }
  } catch (e) {
    console.warn('Failed to load library from Electron:', e);
  }
  return loadLibrary();
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    if ((window as any).electronAPI?.saveSettings) {
      (window as any).electronAPI.saveSettings(settings);
    }
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function loadLibrary(): { anime: AnimeMetadata[]; episodes: Episode[] } {
  try {
    const rawAnime = localStorage.getItem(ANIME_KEY);
    const rawEpisodes = localStorage.getItem(EPISODES_KEY);
    const rawAnimeList: AnimeMetadata[] = rawAnime ? JSON.parse(rawAnime) : [];
    const rawEpisodesList: Episode[] = rawEpisodes ? JSON.parse(rawEpisodes) : [];

    // Deduplicate anime by ID
    const animeMap = new Map<string, AnimeMetadata>();
    for (const a of rawAnimeList) {
      if (a && a.id && !animeMap.has(a.id)) {
        animeMap.set(a.id, a);
      }
    }

    // Deduplicate episodes by filePath
    const episodeMap = new Map<string, Episode>();
    for (const ep of rawEpisodesList) {
      if (ep && ep.filePath && !episodeMap.has(ep.filePath)) {
        episodeMap.set(ep.filePath, ep);
      }
    }

    return {
      anime: Array.from(animeMap.values()),
      episodes: Array.from(episodeMap.values()),
    };
  } catch {
    return { anime: [], episodes: [] };
  }
}

export function saveLibrary(anime: AnimeMetadata[], episodes: Episode[]): void {
  try {
    localStorage.setItem(ANIME_KEY, JSON.stringify(anime));
    localStorage.setItem(EPISODES_KEY, JSON.stringify(episodes));
    if ((window as any).electronAPI?.saveLibrary) {
      (window as any).electronAPI.saveLibrary({ anime, episodes });
    }
  } catch (e) {
    console.error('Failed to save library:', e);
  }
}
