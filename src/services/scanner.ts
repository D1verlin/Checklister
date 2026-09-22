import type { AnimeMetadata, Episode, AnimeWithEpisodes } from '../types/index.ts';
import { parseAnimeFileName } from './parser.ts';
import { getAnimeMetadata, fetchShikimori } from './metadata.ts';
import { loadLibrary, saveLibrary } from './storage.ts';

export interface ScannedFileItem {
  name: string;
  path: string;
  size: number;
  parentDir: string;
  dirPath?: string;
}

export const getFileDir = (filePath: string): string => {
  const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return lastSlash > 0 ? filePath.substring(0, lastSlash) : filePath;
};

export function isPathInsideFolder(itemPath: string, folderPath: string): boolean {
  if (!itemPath || !folderPath) return false;
  const normItem = itemPath.replace(/\\/g, '/').toLowerCase().replace(/\/+$/, '');
  const normFolder = folderPath.replace(/\\/g, '/').toLowerCase().replace(/\/+$/, '');
  return normItem === normFolder || normItem.startsWith(normFolder + '/');
}

export function isAnimeInFolders(animeFolderPath: string, folderPaths: string[]): boolean {
  if (!animeFolderPath || !folderPaths || folderPaths.length === 0) return false;
  return folderPaths.some((folder) => {
    const normAnime = animeFolderPath.replace(/\\/g, '/').toLowerCase().replace(/\/+$/, '');
    const normFolder = folder.replace(/\\/g, '/').toLowerCase().replace(/\/+$/, '');
    return (
      normAnime === normFolder ||
      normAnime.startsWith(normFolder + '/') ||
      normFolder.startsWith(normAnime + '/')
    );
  });
}

/**
 * Scans directories, parses media files, fetches missing metadata,
 * and maintains watched state history.
 */
export async function scanLibraryFolders(
  folderPaths: string[],
  onProgress?: (statusText: string, current: number, total: number) => void
): Promise<AnimeWithEpisodes[]> {
  const electron = (window as any).electronAPI;
  let scannedFiles: ScannedFileItem[] = [];

  // If no folders configured or provided, clear the library
  if (!folderPaths || folderPaths.length === 0) {
    onProgress?.('No folders configured', 0, 0);
    saveLibrary([], []);
    return [];
  }

  if (electron?.scanDirectories) {
    onProgress?.('Scanning filesystem folders...', 0, folderPaths.length);
    scannedFiles = await electron.scanDirectories(folderPaths);
    if (!scannedFiles || scannedFiles.length === 0) {
      onProgress?.('No media files found in selected folders', 0, 0);
      saveLibrary([], []);
      return [];
    }
  } else {
    // If running in browser without Electron
    const current = loadLibrary();
    if (current.anime.length > 0) {
      return buildAnimeWithEpisodes(current.anime, current.episodes);
    }
    return [];
  }

  // Filter media files (.mkv, .mp4, .avi, .webm)
  const mediaRegex = /\.(mkv|mp4|avi|webm)$/i;
  const mediaFiles = scannedFiles.filter(f => mediaRegex.test(f.name));

  // Group files by folder or detected title
  const groupedByAnime = new Map<string, { files: ScannedFileItem[]; parentDir: string; dirPath: string; title: string }>();

  for (const file of mediaFiles) {
    const parsed = parseAnimeFileName(file.name, file.parentDir);
    const actualDir = file.dirPath || getFileDir(file.path) || file.parentDir;

    // Normalize folder path for group key comparison
    const normDir = actualDir.replace(/\\/g, '/').toLowerCase();
    const isRootScanned = folderPaths.some(fp => fp.replace(/\\/g, '/').toLowerCase() === normDir);

    // If it's a subfolder, all files belong to this anime folder
    // If it's dumped directly into a root folder, distinguish by title
    const groupKey = isRootScanned
      ? `${normDir}:::${parsed.title.toLowerCase()}`
      : normDir;

    if (!groupedByAnime.has(groupKey)) {
      groupedByAnime.set(groupKey, {
        files: [],
        parentDir: file.parentDir,
        dirPath: actualDir,
        title: parsed.title,
      });
    }
    groupedByAnime.get(groupKey)!.files.push(file);
  }

  const existing = loadLibrary();
  const existingEpisodesMap = new Map<string, Episode>();
  for (const ep of existing.episodes) {
    existingEpisodesMap.set(ep.filePath, ep);
  }

  const animeMap = new Map<string, AnimeMetadata>();
  const episodeMap = new Map<string, Episode>();

  const groups = Array.from(groupedByAnime.values());

  for (const group of groups) {
    // Pick the cleanest parsed title
    const parsedTitles = group.files.map(f => parseAnimeFileName(f.name, group.parentDir).title);
    const displayTitle = parsedTitles.find(t => t && t.length > 2) || group.title || group.parentDir;
    const animeFolder = group.dirPath || getFileDir(group.files[0].path) || group.parentDir;

    // Find in current map first
    let animeMeta = Array.from(animeMap.values()).find(
      a => a.folderPath.toLowerCase() === animeFolder.toLowerCase() ||
           a.titleRomaji.toLowerCase() === displayTitle.toLowerCase()
    );

    // If not found in current map, check existing saved anime
    if (!animeMeta) {
      animeMeta = existing.anime.find(
        a => a.folderPath.toLowerCase() === animeFolder.toLowerCase() ||
             a.titleRomaji.toLowerCase() === displayTitle.toLowerCase()
      );
    }

    // Auto-heal if previously matched to a 1-episode special while having multiple episodes
    const isSpecialMismatch = animeMeta &&
      animeMeta.totalEpisodes === 1 &&
      group.files.length >= 2 &&
      (animeMeta.titleRomaji.toLowerCase().includes('special') ||
       animeMeta.titleRomaji.toLowerCase().includes('goblin') ||
       animeMeta.titleRomaji.toLowerCase().includes('ova'));

    if (!animeMeta || isSpecialMismatch) {
      try {
        const fresh = await getAnimeMetadata(displayTitle, animeFolder);
        animeMeta = animeMeta ? { ...fresh, id: animeMeta.id, folderPath: animeFolder } : fresh;
      } catch {
        if (!animeMeta) {
          animeMeta = {
            id: `anime-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            titleRomaji: displayTitle,
            coverImage: '',
            airingStatus: 'FINISHED',
            folderPath: animeFolder,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
      }
    } else {
      animeMeta = { ...animeMeta, folderPath: animeFolder };
    }

    // Auto-heal missing Russian title for already matched anime
    if (animeMeta && !animeMeta.titleRussian) {
      try {
        const shiki = await fetchShikimori(animeMeta.titleRomaji);
        if (shiki?.russian) {
          animeMeta = {
            ...animeMeta,
            titleRussian: shiki.russian,
            shikimoriId: shiki.id || animeMeta.shikimoriId,
          };
        }
      } catch {}
    }

    // Check if cover is already cached locally on disk or cache it
    if (electron?.getCachedCover && !animeMeta.localCover) {
      try {
        const cached = await electron.getCachedCover(animeMeta.id);
        if (cached) {
          animeMeta = { ...animeMeta, localCover: cached };
        } else if (electron.cacheCover && (animeMeta.coverImage || animeMeta.shikimoriCoverImage)) {
          const candidates = [animeMeta.coverImage, animeMeta.shikimoriCoverImage].filter(Boolean) as string[];
          const downloaded = await electron.cacheCover(animeMeta.id, candidates);
          if (downloaded) {
            animeMeta = { ...animeMeta, localCover: downloaded };
          }
        }
      } catch {}
    }

    animeMap.set(animeMeta.id, animeMeta);

    // Natural sort files by filename so fileIndex is consistent with episode sequence
    const sortedFiles = [...group.files].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    const groupEpisodes: Episode[] = [];

    // Process episodes for this group
    for (let fileIdx = 0; fileIdx < sortedFiles.length; fileIdx++) {
      const file = sortedFiles[fileIdx];
      const parsed = parseAnimeFileName(file.name, group.parentDir);
      const prevEp = existingEpisodesMap.get(file.path);

      let epNum = parsed.episode;
      if (epNum === undefined) {
        epNum = (prevEp?.episodeNumber && prevEp.episodeNumber > 0) ? prevEp.episodeNumber : (fileIdx + 1);
      }

      const ep: Episode = {
        id: prevEp?.id || `ep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        animeId: animeMeta.id,
        episodeNumber: epNum,
        seasonNumber: parsed.season ?? (prevEp?.seasonNumber || 1),
        fileName: file.name,
        filePath: file.path,
        fileSize: file.size,
        isWatched: prevEp?.isWatched || false,
        watchedAt: prevEp?.watchedAt,
        fileMissing: false,
      };

      groupEpisodes.push(ep);
    }

    // Safety fallback: if an anime has multiple files and all ended up with episodeNumber === 1
    if (groupEpisodes.length > 1 && groupEpisodes.every(e => e.episodeNumber === 1)) {
      groupEpisodes.forEach((ep, idx) => {
        ep.episodeNumber = idx + 1;
      });
    }

    for (const ep of groupEpisodes) {
      episodeMap.set(ep.filePath, ep);
    }
  }

  const animeList = Array.from(animeMap.values());
  const episodesList = Array.from(episodeMap.values());

  // Sort episodes by season and episode number
  episodesList.sort((a, b) => {
    if ((a.seasonNumber || 1) !== (b.seasonNumber || 1)) {
      return (a.seasonNumber || 1) - (b.seasonNumber || 1);
    }
    return a.episodeNumber - b.episodeNumber;
  });

  saveLibrary(animeList, episodesList);
  return buildAnimeWithEpisodes(animeList, episodesList);
}

/**
 * Human-readable byte size formatter.
 */
export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i >= 2 ? 1 : 0)} ${units[i]}`;
}

/**
 * Computes watch progress, next episodes, and flags for the UI.
 */
export function buildAnimeWithEpisodes(anime: AnimeMetadata[], episodes: Episode[]): AnimeWithEpisodes[] {
  return anime.map(item => {
    const itemEpisodes = episodes
      .filter(ep => ep.animeId === item.id)
      .sort((a, b) => (a.episodeNumber - b.episodeNumber));

    const watchedCount = itemEpisodes.filter(ep => ep.isWatched).length;
    const totalLocalEpisodes = itemEpisodes.length;
    const isCompleted = totalLocalEpisodes > 0 && watchedCount === totalLocalEpisodes;
    const progressPercent = totalLocalEpisodes > 0
      ? Math.round((watchedCount / totalLocalEpisodes) * 100)
      : 0;

    const lastWatchedEpObj = [...itemEpisodes].reverse().find(ep => ep.isWatched);
    const lastWatchedEpisode = lastWatchedEpObj?.episodeNumber;
    const nextEpisodeToWatch = itemEpisodes.find(ep => !ep.isWatched);
    const hasMissingFiles = itemEpisodes.some(ep => ep.fileMissing);

    // Compute total disk size
    const totalSizeBytes = itemEpisodes.reduce((acc, ep) => acc + (ep.fileSize || 0), 0);

    // Gap detection: detect missing episode numbers between 1 and max episode found
    const epNums = new Set(itemEpisodes.map(ep => ep.episodeNumber));
    const maxEp = itemEpisodes.length > 0 ? Math.max(...itemEpisodes.map(ep => ep.episodeNumber)) : 0;
    const missingEpisodeNumbers: number[] = [];
    if (maxEp > 1) {
      for (let i = 1; i < maxEp; i++) {
        if (!epNums.has(i)) {
          missingEpisodeNumbers.push(i);
        }
      }
    }

    return {
      ...item,
      episodes: itemEpisodes,
      watchedCount,
      totalLocalEpisodes,
      totalSizeBytes,
      missingEpisodeNumbers,
      lastWatchedEpisode,
      nextEpisodeToWatch,
      progressPercent,
      isCompleted,
      hasMissingFiles,
    };
  });
}

/**
 * High quality initial mock data for immediate out-of-the-box demo/testing.
 */
export function getSampleLibrary(): AnimeWithEpisodes[] {
  const anime: AnimeMetadata[] = [
    {
      id: 'sample-frieren',
      aniListId: 154587,
      shikimoriId: 52991,
      titleRomaji: 'Sousou no Frieren',
      titleEnglish: "Frieren: Beyond Journey's End",
      titleRussian: 'Провожающая в последний путь Фрирен',
      synopsis: 'The adventure is over but life goes on for an elf mage just beginning to learn what living is about.',
      synopsisRussian: 'Король демонов побеждён, и победившая группа героев возвращается домой, готовая разойтись по своим путям.',
      coverImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-n1HJZ9GErch8.jpg',
      shikimoriCoverImage: 'https://shikimori.one/system/animes/original/52991.jpg',
      bannerImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-ivXNJrFcIFj3.jpg',
      totalEpisodes: 28,
      airingStatus: 'FINISHED',
      score: 9.3,
      genres: ['Adventure', 'Drama', 'Fantasy'],
      studios: ['Madhouse'],
      folderPath: 'D:\\Anime\\Sousou no Frieren',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'sample-dandadan',
      aniListId: 171018,
      shikimoriId: 57334,
      titleRomaji: 'Dandadan',
      titleEnglish: 'Dan Da Dan',
      titleRussian: 'Дандадан',
      synopsis: 'A high school girl who believes in ghosts but not aliens meets a boy who believes in aliens but not ghosts.',
      synopsisRussian: 'Момо Аясэ верит в привидений, но отрицает инопланетян. Кэн Такакура верит в пришельцев, но не признаёт духов.',
      coverImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx171018-qK23f46f3jJ2.jpg',
      shikimoriCoverImage: 'https://shikimori.one/system/animes/original/57334.jpg',
      bannerImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/171018-qFz1n2r3.jpg',
      totalEpisodes: 12,
      airingStatus: 'RELEASING',
      nextAiringEpisode: {
        episode: 12,
        timeUntilAiring: 259200, // ~3 days
      },
      score: 8.7,
      genres: ['Action', 'Comedy', 'Supernatural'],
      studios: ['Science SARU'],
      folderPath: 'D:\\Anime\\Dandadan',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'sample-chainsaw',
      aniListId: 127230,
      shikimoriId: 44511,
      titleRomaji: 'Chainsaw Man',
      titleEnglish: 'Chainsaw Man',
      titleRussian: 'Человек-бензопила',
      synopsis: 'Denji has a simple dream—to live a happy and peaceful life, spending time with a girl he likes.',
      synopsisRussian: 'Дэндзи — простой парень, мечтающий о счастливой и спокойной жизни в объятиях любимой девушки.',
      coverImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx127230-FloXvT07FfCi.png',
      shikimoriCoverImage: 'https://shikimori.one/system/animes/original/44511.jpg',
      bannerImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/127230-6pM0U25n5V3p.jpg',
      totalEpisodes: 12,
      airingStatus: 'FINISHED',
      score: 8.5,
      genres: ['Action', 'Gore', 'Supernatural'],
      studios: ['MAPPA'],
      folderPath: 'D:\\Anime\\Chainsaw Man',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];

  const episodes: Episode[] = [
    // Frieren: 4 episodes local, 3 watched
    {
      id: 'ep-frieren-1',
      animeId: 'sample-frieren',
      episodeNumber: 1,
      fileName: '[SubsPlease] Sousou no Frieren - 01 (1080p).mkv',
      filePath: 'D:\\Anime\\Sousou no Frieren\\[SubsPlease] Sousou no Frieren - 01 (1080p).mkv',
      fileSize: 1420000000,
      isWatched: true,
      watchedAt: '2026-09-10T19:00:00.000Z',
    },
    {
      id: 'ep-frieren-2',
      animeId: 'sample-frieren',
      episodeNumber: 2,
      fileName: '[SubsPlease] Sousou no Frieren - 02 (1080p).mkv',
      filePath: 'D:\\Anime\\Sousou no Frieren\\[SubsPlease] Sousou no Frieren - 02 (1080p).mkv',
      fileSize: 1380000000,
      isWatched: true,
      watchedAt: '2026-09-11T20:30:00.000Z',
    },
    {
      id: 'ep-frieren-3',
      animeId: 'sample-frieren',
      episodeNumber: 3,
      fileName: '[SubsPlease] Sousou no Frieren - 03 (1080p).mkv',
      filePath: 'D:\\Anime\\Sousou no Frieren\\[SubsPlease] Sousou no Frieren - 03 (1080p).mkv',
      fileSize: 1450000000,
      isWatched: true,
      watchedAt: '2026-09-15T21:15:00.000Z',
    },
    {
      id: 'ep-frieren-4',
      animeId: 'sample-frieren',
      episodeNumber: 4,
      fileName: '[SubsPlease] Sousou no Frieren - 04 (1080p).mkv',
      filePath: 'D:\\Anime\\Sousou no Frieren\\[SubsPlease] Sousou no Frieren - 04 (1080p).mkv',
      fileSize: 1400000000,
      isWatched: false,
    },
    // Dandadan: 2 episodes local, 1 watched
    {
      id: 'ep-dan-1',
      animeId: 'sample-dandadan',
      episodeNumber: 1,
      fileName: '[Erai-raws] Dandadan - 01 [1080p].mkv',
      filePath: 'D:\\Anime\\Dandadan\\[Erai-raws] Dandadan - 01 [1080p].mkv',
      fileSize: 1250000000,
      isWatched: true,
      watchedAt: '2026-09-18T18:00:00.000Z',
    },
    {
      id: 'ep-dan-2',
      animeId: 'sample-dandadan',
      episodeNumber: 2,
      fileName: '[Erai-raws] Dandadan - 02 [1080p].mkv',
      filePath: 'D:\\Anime\\Dandadan\\[Erai-raws] Dandadan - 02 [1080p].mkv',
      fileSize: 1290000000,
      isWatched: false,
    },
    // Chainsaw Man: 12 episodes local, all 12 watched (Completed)
    ...Array.from({ length: 12 }).map((_, i) => ({
      id: `ep-csm-${i + 1}`,
      animeId: 'sample-chainsaw',
      episodeNumber: i + 1,
      fileName: `Chainsaw Man S01E${String(i + 1).padStart(2, '0')} 1080p.mkv`,
      filePath: `D:\\Anime\\Chainsaw Man\\Chainsaw Man S01E${String(i + 1).padStart(2, '0')} 1080p.mkv`,
      fileSize: 1350000000,
      isWatched: true,
      watchedAt: '2026-08-01T12:00:00.000Z',
    }))
  ];

  return buildAnimeWithEpisodes(anime, episodes);
}
