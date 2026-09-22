import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type {
  AnimeWithEpisodes,
  FilterStatus,
  AppSettings,
  Episode,
  ActiveView,
  UILanguage,
} from './types/index.ts';
import { UnifiedHeader } from './components/UnifiedHeader.tsx';
import { LibraryView } from './views/LibraryView.tsx';
import { AnimeDetailView } from './views/AnimeDetailView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { RemapModal } from './components/RemapModal.tsx';
import {
  loadSettings,
  saveSettings,
  loadLibrary,
  saveLibrary,
} from './services/storage.ts';
import {
  scanLibraryFolders,
  buildAnimeWithEpisodes,
  isAnimeInFolders,
} from './services/scanner.ts';
import { openVideoFile, showInFileExplorer } from './services/player.ts';
import { AlertTriangle, Check } from 'lucide-react';

export const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [animeList, setAnimeList] = useState<AnimeWithEpisodes[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('library');
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAnime, setSelectedAnime] = useState<AnimeWithEpisodes | null>(null);
  const [remapAnime, setRemapAnime] = useState<AnimeWithEpisodes | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgressText, setScanProgressText] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'error' } | null>(null);

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

  // Initial load
  useEffect(() => {
    const cached = loadLibrary();
    // If no folders are configured in settings, ensure library is empty
    if (!settings.scannedFolders || settings.scannedFolders.length === 0) {
      if (cached.anime.length > 0 || cached.episodes.length > 0) {
        saveLibrary([], []);
      }
      setAnimeList([]);
      return;
    }

    if (cached.anime.length > 0) {
      // Filter out anime that do not belong to any configured scannedFolders
      const validAnime = cached.anime.filter((a) =>
        isAnimeInFolders(a.folderPath, settings.scannedFolders)
      );
      const validAnimeIds = new Set(validAnime.map((a) => a.id));
      const validEpisodes = cached.episodes.filter((ep) => validAnimeIds.has(ep.animeId));

      if (validAnime.length !== cached.anime.length || validEpisodes.length !== cached.episodes.length) {
        saveLibrary(validAnime, validEpisodes);
      }
      setAnimeList(buildAnimeWithEpisodes(validAnime, validEpisodes));
    } else {
      setAnimeList([]);
    }

    if (settings.autoScanOnStartup && settings.scannedFolders.length > 0) {
      runScan(settings.scannedFolders);
    }
  }, []);

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
    const res = await openVideoFile(episode.filePath);
    if (!res.success && res.error) {
      showToast(res.error, 'error');
    }
  };

  const handleContinueWatching = async (anime: AnimeWithEpisodes, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = anime.nextEpisodeToWatch || anime.episodes[0];
    if (target) {
      const res = await openVideoFile(target.filePath);
      if (!res.success && res.error) {
        showToast(res.error, 'error');
      }
    }
  };

  const handleShowInFolder = async (filePath: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const res = await showInFileExplorer(filePath);
    if (!res.success && res.error) {
      showToast(res.error, 'error');
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

  // Filtered & Searched List (searches globally if query is typed)
  const filteredAnime = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return animeList.filter((item) => {
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

      // If no query, apply standard status filter
      if (filter === 'WATCHING' && (item.isCompleted || item.watchedCount === 0)) {
        return false;
      }
      if (filter === 'COMPLETED' && !item.isCompleted) {
        return false;
      }
      if (filter === 'AIRING' && item.airingStatus !== 'RELEASING') {
        return false;
      }
      if (filter === 'MISSING' && !item.hasMissingFiles) {
        return false;
      }

      return true;
    });
  }, [animeList, filter, searchQuery]);

  return (
    <div className="h-screen w-screen bg-[#121212] overflow-hidden rounded-[16px] border border-white/10 flex flex-col shadow-2xl">
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
        onToggleLanguage={handleToggleLanguage}
        preferRussian={settings.preferRussianTitles}
        devMode={settings.devMode}
        onOpenRemap={selectedAnime ? () => setRemapAnime(selectedAnime) : undefined}
        onSaveSettings={activeView === 'settings' ? () => settingsActionsRef.current?.save() : undefined}
        onScanSettings={activeView === 'settings' ? () => settingsActionsRef.current?.scan() : undefined}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#121212]">
        {activeView === 'library' && (
          <LibraryView
            animeList={filteredAnime}
            filter={filter}
            searchQuery={searchQuery}
            preferRussian={settings.preferRussianTitles}
            uiLanguage={settings.uiLanguage}
            onSelectAnime={handleSelectAnime}
            onContinueWatching={handleContinueWatching}
            onOpenFolder={handleShowInFolder}
            onOpenSettings={() => setActiveView('settings')}
          />
        )}

        {activeView === 'anime-detail' && selectedAnime && (
          <AnimeDetailView
            anime={selectedAnime}
            preferRussian={settings.preferRussianTitles}
            uiLanguage={settings.uiLanguage}
            onToggleEpisodeWatch={handleToggleEpisodeWatch}
            onPlayEpisode={handlePlayEpisode}
            onContinueWatching={handleContinueWatching}
            onShowInFolder={handleShowInFolder}
            onDeleteAnime={handleDeleteAnime}
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
