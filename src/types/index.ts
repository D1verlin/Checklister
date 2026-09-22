export interface Episode {
  id: string;
  animeId: string;
  episodeNumber: number;
  seasonNumber?: number;
  fileName: string;
  filePath: string;
  fileSize?: number; // bytes
  isWatched: boolean;
  watchedAt?: string; // ISO date
  fileMissing?: boolean;
}

export interface AnimeMetadata {
  id: string; // Internal unique ID (hash or slug)
  aniListId?: number;
  shikimoriId?: number;
  titleRomaji: string;
  titleEnglish?: string;
  titleRussian?: string;
  synopsis?: string;
  synopsisRussian?: string;
  coverImage: string; // URL or local cached path
  shikimoriCoverImage?: string;
  localCover?: string; // checklister-media:// local cached file
  bannerImage?: string;
  localBanner?: string;
  totalEpisodes?: number;
  airingStatus: 'RELEASING' | 'FINISHED' | 'NOT_YET_RELEASED' | 'CANCELLED';
  nextAiringEpisode?: {
    episode: number;
    timeUntilAiring: number; // seconds
  };
  score?: number; // 0-10 or 0-100
  genres?: string[];
  studios?: string[];
  folderPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnimeWithEpisodes extends AnimeMetadata {
  episodes: Episode[];
  watchedCount: number;
  totalLocalEpisodes: number;
  lastWatchedEpisode?: number;
  nextEpisodeToWatch?: Episode;
  progressPercent: number;
  isCompleted: boolean;
  hasMissingFiles: boolean;
}

export type UILanguage = 'ru' | 'en';

export interface AppSettings {
  scannedFolders: string[];
  playerType: 'system' | 'custom';
  customPlayerPath: string; // e.g. "C:\Program Files\mpv\mpv.exe"
  preferRussianTitles: boolean;
  autoScanOnStartup: boolean;
  uiLanguage: UILanguage;
  devMode: boolean;
}

export type ActiveView = 'library' | 'anime-detail' | 'settings';

export type FilterStatus = 'ALL' | 'WATCHING' | 'COMPLETED' | 'AIRING' | 'MISSING';

export interface ParseResult {
  title: string;
  season?: number;
  episode?: number;
  resolution?: string;
  releaseGroup?: string;
  crc?: string;
  originalFileName: string;
}
