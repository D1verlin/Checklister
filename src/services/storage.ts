import type { AnimeMetadata, Episode, AppSettings } from '../types/index.ts';

const SETTINGS_KEY = 'anime_tracker_settings';
const ANIME_KEY = 'anime_tracker_library';
const EPISODES_KEY = 'anime_tracker_episodes';

export const defaultSettings: AppSettings = {
  scannedFolders: [],
  playerType: 'system',
  customPlayerPath: '',
  preferRussianTitles: true,
  autoScanOnStartup: true,
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
