import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type {
  AnimeWithEpisodes,
  FilterStatus,
  AppSettings,
  Episode,
  ActiveView,
  UILanguage,
  SortOption,
} from './types/index.ts';
import { UnifiedHeader } from './components/UnifiedHeader.tsx';
import { LibraryView } from './views/LibraryView.tsx';
import { AnimeDetailView } from './views/AnimeDetailView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { RemapModal } from './components/RemapModal.tsx';
import { UserFoldersModal } from './components/UserFoldersModal.tsx';
import {
  loadSettings,
  saveSettings,
  loadLibrary,
  saveLibrary,
  bootstrapSettingsFromElectron,
  bootstrapLibraryFromElectron,
} from './services/storage.ts';
import {
  scanLibraryFolders,
  buildAnimeWithEpisodes,
  isAnimeInFolders,
} from './services/scanner.ts';
import { parseAnimeFileName } from './services/parser.ts';
import { openVideoFile, showInFileExplorer } from './services/player.ts';
import { AlertTriangle, Check } from 'lucide-react';
import CheckListerLogo from './assets/CheckLister.svg';

export const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [animeList, setAnimeList] = useState<AnimeWithEpisodes[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('library');
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserFolder, setSelectedUserFolder] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('title');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedStudio, setSelectedStudio] = useState<string | null>(null);
  const [selectedAnime, setSelectedAnime] = useState<AnimeWithEpisodes | null>(null);
  const [remapAnime, setRemapAnime] = useState<AnimeWithEpisodes | null>(null);
  const [folderModalAnime, setFolderModalAnime] = useState<AnimeWithEpisodes | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgressText, setScanProgressText] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'error' } | null>(null);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(true);
  const [isBooted, setIsBooted] = useState(false);

  const showToast = (text: string, type: 'info' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const settingsActionsRef = useRef<{ save: () => void; scan: () => void } | null>(null);
  const handleRegisterSettingsActions = useCallback(
    (saveFn: () => void, scanFn: () => void) => {
      settingsActionsRef.current = { save: saveFn, scan: scanFn };
    },
    []
  );

  // Initial load: bootstrap from Electron files first, then localStorage fallback
  useEffect(() => {
    async function bootstrap() {
      try {
        // 1. Load settings from Electron file (source of truth) and sync to localStorage
        const loadedSettings = await bootstrapSettingsFromElectron();
        setSettings(loadedSettings);

        // 2. Load library from Electron file, sync to localStorage
        const cached = await bootstrapLibraryFromElectron();

        if (!loadedSettings.scannedFolders || loadedSettings.scannedFolders.length === 0) {
          if (cached.anime.length > 0 || cached.episodes.length > 0) {
            saveLibrary([], []);
          }
          setAnimeList([]);
          return;
        }

        if (cached.anime.length > 0) {
          const validAnime = cached.anime.filter((a) =>
            isAnimeInFolders(a.folderPath, loadedSettings.scannedFolders)
          );
          const validAnimeIds = new Set(validAnime.map((a) => a.id));
          let validEpisodes = cached.episodes.filter((ep) => validAnimeIds.has(ep.animeId));

          // Self-heal: re-check episode numbers with improved parser
          let repaired = false;
          const animeEpMap = new Map<string, Episode[]>();
          for (const ep of validEpisodes) {
            if (!animeEpMap.has(ep.animeId)) animeEpMap.set(ep.animeId, []);
            animeEpMap.get(ep.animeId)!.push(ep);
          }

          for (const [animeId, eps] of animeEpMap.entries()) {
            const animeObj = validAnime.find((a) => a.id === animeId);
            const folderName = animeObj?.folderPath
              ? animeObj.folderPath.replace(/[/\\]+$/, '').split(/[/\\]/).pop()
              : undefined;

            eps.sort((a, b) =>
              a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' })
            );

            const allWereOne = eps.length > 1 && eps.every((e) => e.episodeNumber === 1);
            for (let i = 0; i < eps.length; i++) {
              const ep = eps[i];
              const parsed = parseAnimeFileName(ep.fileName, folderName);
              if (parsed.episode !== undefined && parsed.episode !== ep.episodeNumber) {
                ep.episodeNumber = parsed.episode;
                repaired = true;
              } else if (allWereOne && parsed.episode === undefined) {
                ep.episodeNumber = i + 1;
                repaired = true;
              }
            }

            if (eps.length > 1 && eps.every((e) => e.episodeNumber === 1)) {
              eps.forEach((e, idx) => { e.episodeNumber = idx + 1; });
              repaired = true;
            }
          }

          if (repaired || validAnime.length !== cached.anime.length || validEpisodes.length !== cached.episodes.length) {
            saveLibrary(validAnime, validEpisodes);
          }
          setAnimeList(buildAnimeWithEpisodes(validAnime, validEpisodes));
        } else {
          setAnimeList([]);
        }

        if (loadedSettings.autoScanOnStartup && loadedSettings.scannedFolders.length > 0) {
          runScan(loadedSettings.scannedFolders);
        }
      } catch (err) {
        console.error('Bootstrap error:', err);
        // Fallback to localStorage so the app still renders
        setSettings(loadSettings());
        setAnimeList([]);
      } finally {
        setIsBooted(true);
      }
    }

    bootstrap();
  }, []);

  // Listen for auto-tracked playback episodes from Electron
  useEffect(() => {
    const electron = (window as any).electronAPI;
    if (!electron?.onEpisodeWatched) return;

    const cleanup = electron.onEpisodeWatched((data: { filePath: string; durationSec: number }) => {
      if (!settings.autoTrackPlayback) return;

      setAnimeList((prevList) => {
        let matchedAnimeId: string | null = null;
        let matchedEpId: string | null = null;
        let epNumber = 1;
        let animeName = '';

        for (const a of prevList) {
          const ep = a.episodes.find((e) => e.filePath.toLowerCase() === data.filePath.toLowerCase());
          if (ep) {
            matchedAnimeId = a.id;
            matchedEpId = ep.id;
            epNumber = ep.episodeNumber;
            animeName = (settings.preferRussianTitles && a.titleRussian) ? a.titleRussian : a.titleRomaji;
            break;
          }
        }

        if (!matchedAnimeId || !matchedEpId) return prevList;

        const nextList = prevList.map((item) => {
          if (item.id !== matchedAnimeId) return item;

          let changed = false;
          const updatedEpisodes = item.episodes.map((ep) => {
            if (ep.id !== matchedEpId || ep.isWatched) return ep;
            changed = true;
            return {
              ...ep,
              isWatched: true,
              watchedAt: new Date().toISOString(),
            };
          });

          if (!changed) return item;

          const watchedCount = updatedEpisodes.filter((e) => e.isWatched).length;
          const total = updatedEpisodes.length;
          const isCompleted = total > 0 && watchedCount === total;
          const progressPercent = total > 0 ? Math.round((watchedCount / total) * 100) : 0;
          const nextEpisodeToWatch = updatedEpisodes.find((e) => !e.isWatched);

          const updatedAnime: AnimeWithEpisodes = {
            ...item,
            episodes: updatedEpisodes,
            watchedCount,
            isCompleted,
            progressPercent,
            nextEpisodeToWatch,
          };

          if (selectedAnime?.id === matchedAnimeId) {
            setSelectedAnime(updatedAnime);
          }

          return updatedAnime;
        });

        const rawEpisodes: Episode[] = nextList.flatMap((a) => a.episodes);
        saveLibrary(nextList, rawEpisodes);

        showToast(
          settings.uiLanguage === 'ru'
            ? `Просмотрено: ${animeName} (Серия ${epNumber})`
            : `Watched: ${animeName} (Episode ${epNumber})`,
          'info'
        );

        return nextList;
      });
    });

    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [settings.autoTrackPlayback, settings.preferRussianTitles, settings.uiLanguage, selectedAnime?.id]);

  // Unique genres and studios from library
  const allGenres = useMemo(() => {
    const set = new Set<string>();
    animeList.forEach((a) => {
      a.genres?.forEach((g) => set.add(g));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [animeList]);

  const allStudios = useMemo(() => {
    const set = new Set<string>();
    animeList.forEach((a) => {
      a.studios?.forEach((s) => set.add(s));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [animeList]);

  const runScan = async (foldersToScan: string[]) => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgressText('Scanning...');
    try {
      const result = await scanLibraryFolders(foldersToScan, (status) => {
        setScanProgressText(status);
      });
      setAnimeList(result);
      if (selectedAnime) {
        const updated = result.find((a) => a.id === selectedAnime.id);
        if (updated) setSelectedAnime(updated);
      }
      if (result.length === 0) {
        showToast(foldersToScan.length === 0 ? 'Папки не добавлены. Библиотека пуста' : 'Медиафайлы в выбранных папках не найдены', 'info');
      } else {
        showToast(`Синхронизировано тайтлов: ${result.length}`, 'info');
      }
    } catch (err) {
      console.error('Scan error:', err);
      showToast('Ошибка при сканировании каталогов', 'error');
    } finally {
      setIsScanning(false);
      setScanProgressText('');
    }
  };

  const handleToggleEpisodeWatch = (animeId: string, episodeId: string) => {
    setAnimeList((prevList) => {
      const allAnime = prevList.map((item) => {
        if (item.id !== animeId) return item;

        const updatedEpisodes = item.episodes.map((ep) => {
          if (ep.id !== episodeId) return ep;
          const nextWatched = !ep.isWatched;
          return {
            ...ep,
            isWatched: nextWatched,
            watchedAt: nextWatched ? new Date().toISOString() : undefined,
          };
        });

        const watchedCount = updatedEpisodes.filter((e) => e.isWatched).length;
        const total = updatedEpisodes.length;
        const isCompleted = total > 0 && watchedCount === total;
        const progressPercent = total > 0 ? Math.round((watchedCount / total) * 100) : 0;
        const nextEpisodeToWatch = updatedEpisodes.find((e) => !e.isWatched);

        const updatedAnime: AnimeWithEpisodes = {
          ...item,
          episodes: updatedEpisodes,
          watchedCount,
          isCompleted,
          progressPercent,
          nextEpisodeToWatch,
        };

        if (selectedAnime?.id === animeId) {
          setSelectedAnime(updatedAnime);
        }

        return updatedAnime;
      });

      const rawEpisodes: Episode[] = allAnime.flatMap((a) => a.episodes);
      saveLibrary(allAnime, rawEpisodes);

      return allAnime;
    });
  };

  const handlePlayEpisode = async (episode: Episode) => {
    // Discord RPC presence
    if (settings.discordRpcEnabled) {
      const anime = animeList.find((a) => a.id === episode.animeId);
      if (anime) {
        const title = (settings.preferRussianTitles && anime.titleRussian) ? anime.titleRussian : anime.titleRomaji;
        (window as any).electronAPI?.setDiscordActivity?.({
          details: title,
          state: `Серия ${episode.episodeNumber || '?'}`,
          startTimestamp: Date.now(),
          largeImageKey: 'monolith_logo',
          largeImageText: title,
        });
      }
    }

    const res = await openVideoFile(episode.filePath);
    if (!res.success && res.error) {
      showToast(res.error, 'error');
    }
  };

  const handleContinueWatching = async (anime: AnimeWithEpisodes, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = anime.nextEpisodeToWatch || anime.episodes[0];
    if (target) {
      await handlePlayEpisode(target);
    }
  };

  const handleShowInFolder = async (filePath: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const res = await showInFileExplorer(filePath);
    if (!res.success && res.error) {
      showToast(res.error, 'error');
    }
  };

  const handleRenamedEpisodes = (
    animeId: string,
    updatedEpisodes: { id: string; fileName: string; filePath: string; episodeNumber?: number }[]
  ) => {
    const map = new Map(updatedEpisodes.map((e) => [e.id, e]));
    setAnimeList((prev) => {
      const next = prev.map((a) => {
        if (a.id !== animeId) return a;
        const newEpisodes = a.episodes.map((ep) => {
          const up = map.get(ep.id);
          return up
            ? {
                ...ep,
                fileName: up.fileName,
                filePath: up.filePath,
                episodeNumber: up.episodeNumber ?? ep.episodeNumber,
              }
            : ep;
        });
        return { ...a, episodes: newEpisodes };
      });

      const rawEpisodes = next.flatMap((a) => a.episodes);
      saveLibrary(next, rawEpisodes);

      if (selectedAnime?.id === animeId) {
        const updated = next.find((a) => a.id === animeId);
        if (updated) setSelectedAnime(updated);
      }
      return next;
    });
    showToast(settings.uiLanguage === 'ru' ? 'Файлы успешно переименованы' : 'Files successfully renamed', 'info');
  };

  const handleUpdateAnimeFolders = (animeId: string, folders: string[]) => {
    setAnimeList((prev) => {
      const next = prev.map((a) => {
        if (a.id !== animeId) return a;
        return { ...a, userFolders: folders };
      });
      const rawEpisodes = next.flatMap((a) => a.episodes);
      saveLibrary(next, rawEpisodes);
      if (selectedAnime?.id === animeId) {
        const updated = next.find((a) => a.id === animeId);
        if (updated) setSelectedAnime(updated);
      }
      return next;
    });
  };

  const handleCreateFolder = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || (settings.customFolders || []).includes(trimmed)) return;
    const nextFolders = [...(settings.customFolders || []), trimmed];
    const nextSettings = { ...settings, customFolders: nextFolders };
    handleSaveSettings(nextSettings);
  };

  const handleDeleteFolder = (name: string) => {
    const nextFolders = (settings.customFolders || []).filter((f) => f !== name);
    const nextSettings = { ...settings, customFolders: nextFolders };
    handleSaveSettings(nextSettings);
    if (selectedUserFolder === name) {
      setSelectedUserFolder(null);
    }
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);

    // If scanned folders were emptied
    if (!newSettings.scannedFolders || newSettings.scannedFolders.length === 0) {
      saveLibrary([], []);
      setAnimeList([]);
      setSelectedAnime(null);
    } else {
      // Prune anime that are no longer in any scanned folder
      setAnimeList((prevList) => {
        const remainingAnime = prevList.filter((a) =>
          isAnimeInFolders(a.folderPath, newSettings.scannedFolders)
        );
        const validIds = new Set(remainingAnime.map((a) => a.id));
        const remainingEpisodes = remainingAnime.flatMap((a) =>
          a.episodes.filter((e) => validIds.has(e.animeId))
        );
        saveLibrary(remainingAnime, remainingEpisodes);
        if (selectedAnime && !validIds.has(selectedAnime.id)) {
          setSelectedAnime(null);
        }
        return remainingAnime;
      });
    }
  };

  const handleClearLibrary = () => {
    saveLibrary([], []);
    setAnimeList([]);
    setSelectedAnime(null);
    showToast('Библиотека полностью очищена', 'info');
  };

  const handleDeleteAnime = (animeId: string) => {
    setAnimeList((prev) => {
      const nextAnime = prev.filter((a) => a.id !== animeId);
      const nextEpisodes = nextAnime.flatMap((a) => a.episodes);
      saveLibrary(nextAnime, nextEpisodes);
      return nextAnime;
    });
    if (selectedAnime?.id === animeId) {
      setSelectedAnime(null);
      setActiveView('library');
    }
    showToast('Тайтл удален из библиотеки', 'info');
  };

  const handleBrowseFolder = async (): Promise<string[]> => {
    const electron = (window as any).electronAPI;
    if (electron?.openFolderDialog) {
      return await electron.openFolderDialog();
    }
    return [];
  };

  const handleAddFolderDirectly = async () => {
    try {
      const folders = await handleBrowseFolder();
      if (folders && folders.length > 0) {
        const unique = Array.from(new Set([...settings.scannedFolders, ...folders]));
        const updated = { ...settings, scannedFolders: unique };
        handleSaveSettings(updated);
        showToast(`Добавлена папка: ${folders[0]}. Запуск сканирования...`, 'info');
        runScan(unique);
      } else {
        setActiveView('settings');
      }
    } catch {
      setActiveView('settings');
    }
  };

  const handleApplyRemap = (animeId: string, candidate: any) => {
    setAnimeList((prev) => {
      const next: AnimeWithEpisodes[] = prev.map((item) => {
        if (item.id !== animeId) return item;
        const status: 'RELEASING' | 'FINISHED' =
          candidate.status === 'RELEASING' ? 'RELEASING' : 'FINISHED';
        const coverChanged = Boolean(candidate.coverImage && candidate.coverImage !== item.coverImage);
        return {
          ...item,
          shikimoriId: candidate.shikimoriId || item.shikimoriId,
          aniListId: candidate.aniListId || item.aniListId,
          titleRomaji: candidate.titleRomaji || item.titleRomaji,
          titleEnglish: candidate.titleEnglish || item.titleEnglish,
          titleRussian: candidate.titleRussian || item.titleRussian,
          coverImage: candidate.coverImage || item.coverImage,
          localCover: coverChanged ? undefined : item.localCover,
          totalEpisodes: candidate.episodes || item.totalEpisodes,
          airingStatus: status,
          score: candidate.score || item.score,
        };
      });

      saveLibrary(next, next.flatMap((a) => a.episodes));
      if (selectedAnime?.id === animeId) {
        const updated = next.find((a) => a.id === animeId);
        if (updated) setSelectedAnime(updated);
      }
      return next;
    });

    setRemapAnime(null);
  };

  const handleToggleLanguage = () => {
    const nextLang: UILanguage = settings.uiLanguage === 'ru' ? 'en' : 'ru';
    const newSettings = { ...settings, uiLanguage: nextLang };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (activeView === 'anime-detail') {
      setActiveView('library');
    }
  };

  const handleSelectAnime = (anime: AnimeWithEpisodes) => {
    setSelectedAnime(anime);
    setActiveView('anime-detail');
  };

  // Filtered & Searched & Sorted List (searches globally if query is typed)
  const filteredAnime = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = animeList.filter((item) => {
      // User collection / folder filter
      if (selectedUserFolder && !item.userFolders?.includes(selectedUserFolder)) {
        return false;
      }

      // Genre filter
      if (selectedGenre && !item.genres?.includes(selectedGenre)) {
        return false;
      }

      // Studio filter
      if (selectedStudio && !item.studios?.includes(selectedStudio)) {
        return false;
      }

      // If user typed a search query, search globally across all titles!
      if (q) {
        const tokens = q
          .replace(/ё/g, 'е')
          .replace(/[^a-zа-я0-9\s]/gi, ' ')
          .split(/\s+/)
          .filter(Boolean);

        const searchableText = `${item.titleRomaji} ${item.titleRussian || ''} ${item.titleEnglish || ''} ${item.folderPath}`
          .toLowerCase()
          .replace(/ё/g, 'е')
          .replace(/[^a-zа-я0-9\s]/gi, ' ');

        if (tokens.length === 0) {
          return `${item.titleRomaji} ${item.titleRussian || ''} ${item.titleEnglish || ''} ${item.folderPath}`
            .toLowerCase()
            .includes(q);
        }

        return tokens.every((token) => searchableText.includes(token));
      }

      // If no query, apply standard status filter (AIRING removed!)
      if (filter === 'WATCHING' && (item.isCompleted || item.watchedCount === 0)) {
        return false;
      }
      if (filter === 'COMPLETED' && !item.isCompleted) {
        return false;
      }
      if (filter === 'MISSING' && !item.hasMissingFiles) {
        return false;
      }

      return true;
    });

    // Multi-criteria sorting
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return (b.score || 0) - (a.score || 0);
        case 'size':
          return (b.totalSizeBytes || 0) - (a.totalSizeBytes || 0);
        case 'date': {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        }
        case 'remaining': {
          const remA = Math.max(0, (a.totalEpisodes || a.episodes.length) - a.watchedCount);
          const remB = Math.max(0, (b.totalEpisodes || b.episodes.length) - b.watchedCount);
          return remB - remA;
        }
        case 'title':
        default: {
          const titleA = (settings.preferRussianTitles && a.titleRussian) ? a.titleRussian : a.titleRomaji;
          const titleB = (settings.preferRussianTitles && b.titleRussian) ? b.titleRussian : b.titleRomaji;
          return titleA.localeCompare(titleB, 'ru', { sensitivity: 'base' });
        }
      }
    });
  }, [
    animeList,
    filter,
    searchQuery,
    selectedUserFolder,
    selectedGenre,
    selectedStudio,
    sortBy,
    settings.preferRussianTitles,
  ]);

  // Show loading screen until bootstrap completes — prevents black screen in production
  if (!isBooted) {
    return (
      <div className="h-screen w-screen bg-[#121212] overflow-hidden rounded-[16px] border border-white/10 flex flex-col items-center justify-center shadow-2xl gap-4">
        <img src={CheckListerLogo} alt="CheckLister" className="w-10 h-10 rounded-[10px] opacity-80" />
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen bg-[#121212] overflow-hidden rounded-[16px] border border-white/10 flex flex-col shadow-2xl">
      {/* Exactly ONE Unified Header Row (56px) - No Double or Triple Stacked Headers! */}
      <UnifiedHeader
        activeView={activeView}
        onViewChange={(view) => {
          setActiveView(view);
          if (view === 'library') setSelectedAnime(null);
        }}
        currentFilter={filter}
        onFilterChange={setFilter}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        animeList={animeList}
        selectedAnime={selectedAnime}
        isScanning={isScanning}
        scanProgressText={scanProgressText}
        onScan={() => runScan(settings.scannedFolders)}
        onAddFolder={handleAddFolderDirectly}
        uiLanguage={settings.uiLanguage}
        preferRussian={settings.preferRussianTitles}
        devMode={settings.devMode}
        onOpenRemap={selectedAnime ? () => setRemapAnime(selectedAnime) : undefined}
        onSaveSettings={activeView === 'settings' ? () => settingsActionsRef.current?.save() : undefined}
        onScanSettings={activeView === 'settings' ? () => settingsActionsRef.current?.scan() : undefined}
        customFolders={settings.customFolders || []}
        selectedUserFolder={selectedUserFolder}
        onSelectUserFolder={setSelectedUserFolder}
        isFilterSidebarOpen={isFilterSidebarOpen}
        onToggleFilterSidebar={() => setIsFilterSidebarOpen((v) => !v)}
        activeFiltersCount={(selectedGenre ? 1 : 0) + (selectedStudio ? 1 : 0)}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeView === 'library' && (
          <LibraryView
            animeList={filteredAnime}
            filter={filter}
            searchQuery={searchQuery}
            selectedUserFolder={selectedUserFolder || undefined}
            preferRussian={settings.preferRussianTitles}
            uiLanguage={settings.uiLanguage}
            onSelectAnime={handleSelectAnime}
            onContinueWatching={handleContinueWatching}
            onOpenFolder={handleShowInFolder}
            onOpenFolderModal={(anime) => setFolderModalAnime(anime)}
            onOpenSettings={() => setActiveView('settings')}
            isFilterSidebarOpen={isFilterSidebarOpen}
            sortBy={sortBy}
            onSortChange={setSortBy}
            allGenres={allGenres}
            selectedGenre={selectedGenre}
            onSelectGenre={setSelectedGenre}
            allStudios={allStudios}
            selectedStudio={selectedStudio}
            onSelectStudio={setSelectedStudio}
            totalAnimeCount={animeList.length}
          />
        )}

        {activeView === 'anime-detail' && selectedAnime && (
          <AnimeDetailView
            anime={selectedAnime}
            preferRussian={settings.preferRussianTitles}
            uiLanguage={settings.uiLanguage}
            allFolders={settings.customFolders || []}
            onToggleEpisodeWatch={handleToggleEpisodeWatch}
            onPlayEpisode={handlePlayEpisode}
            onContinueWatching={handleContinueWatching}
            onShowInFolder={handleShowInFolder}
            onDeleteAnime={handleDeleteAnime}
            onUpdateAnimeFolders={handleUpdateAnimeFolders}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            onRenamedEpisodes={handleRenamedEpisodes}
          />
        )}

        {activeView === 'settings' && (
          <SettingsView
            settings={settings}
            onSave={handleSaveSettings}
            onBrowseFolder={handleBrowseFolder}
            onScanNow={(folders) => runScan(folders)}
            onRegisterActions={handleRegisterSettingsActions}
            onClearLibrary={handleClearLibrary}
          />
        )}
      </main>

      {/* Remap Metadata Modal */}
      <RemapModal
        anime={remapAnime}
        uiLanguage={settings.uiLanguage}
        preferRussian={settings.preferRussianTitles}
        onClose={() => setRemapAnime(null)}
        onApplyRemap={handleApplyRemap}
      />

      {/* User Folders Modal */}
      {folderModalAnime && (
        <UserFoldersModal
          anime={folderModalAnime}
          allFolders={settings.customFolders || []}
          uiLanguage={settings.uiLanguage}
          onClose={() => setFolderModalAnime(null)}
          onUpdateAnimeFolders={handleUpdateAnimeFolders}
          onCreateFolder={handleCreateFolder}
          onDeleteFolder={handleDeleteFolder}
        />
      )}

      {/* Feedback Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-[8px] text-xs font-medium flex items-center gap-2.5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 ${
            toastMessage.type === 'error'
              ? 'bg-[#1c1c1c] text-[#FF5252] border border-[#FF5252]/20'
              : 'bg-white text-black'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertTriangle size={15} />
          ) : (
            <Check size={15} strokeWidth={3} />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
};

export default App;
