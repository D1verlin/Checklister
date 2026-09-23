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
  playbackProgress?: {
    timePos: number;
    duration: number;
    percent: number;
    lastUpdated?: string;
  };
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
  userFolders?: string[]; // User collections/folders assigned to this anime
  folderPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnimeWithEpisodes extends AnimeMetadata {
  episodes: Episode[];
  watchedCount: number;
  totalLocalEpisodes: number;
  totalSizeBytes?: number;
  missingEpisodeNumbers?: number[];
  lastWatchedEpisode?: number;
  nextEpisodeToWatch?: Episode;
  progressPercent: number;
  isCompleted: boolean;
  hasMissingFiles: boolean;
}

export type UILanguage = 'ru' | 'en';

export type SortOption = 'title' | 'score' | 'date' | 'size' | 'remaining';

export interface AppSettings {
  scannedFolders: string[];
  customFolders: string[]; // User created collections/folders
  playerType: 'mpv' | 'system' | 'custom';
  mpvPath: string; // e.g. "C:\mpv\mpv.exe"
  customPlayerPath: string; // e.g. "C:\Program Files\mpv\mpv.exe"
  autoNextEpisode: boolean; // default true for binge-watching
  watchedThresholdPercent: number; // default 85 (%)
  preferRussianTitles: boolean;
  autoScanOnStartup: boolean;
  discordRpcEnabled: boolean;
  autoTrackPlayback: boolean;
  uiLanguage: UILanguage;
  devMode: boolean;
}

export type ActiveView = 'library' | 'anime-detail' | 'settings';

export type FilterStatus = 'ALL' | 'WATCHING' | 'COMPLETED' | 'MISSING';

export interface ParseResult {
  title: string;
  season?: number;
  episode?: number;
  resolution?: string;
  releaseGroup?: string;
  crc?: string;
  originalFileName: string;
}

export interface RenameOperation {
  oldPath: string;
  newName: string;
  animeId?: string;
  episodeId?: string;
}
