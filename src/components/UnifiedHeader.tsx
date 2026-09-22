import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  X,
  RefreshCw,
  FolderPlus,
  Settings,
  Languages,
  Minus,
  Square,
  HardDrive,
  Terminal,
  Edit3,
  ExternalLink,
  Save,
} from 'lucide-react';
import type {
  ActiveView,
  FilterStatus,
  UILanguage,
  AnimeWithEpisodes,
} from '../types/index.ts';
import { useI18n } from '../i18n/translations.ts';

interface UnifiedHeaderProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  currentFilter: FilterStatus;
  onFilterChange: (filter: FilterStatus) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  animeList: AnimeWithEpisodes[];
  selectedAnime: AnimeWithEpisodes | null;
  isScanning: boolean;
  scanProgressText?: string;
  onScan: () => void;
  onAddFolder: () => void;
  uiLanguage: UILanguage;
  onToggleLanguage: () => void;
  preferRussian: boolean;
  devMode: boolean;
  onOpenRemap?: () => void;
  onSaveSettings?: () => void;
  onScanSettings?: () => void;
}

export const UnifiedHeader: React.FC<UnifiedHeaderProps> = ({
  activeView,
  onViewChange,
  currentFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  animeList,
  selectedAnime,
  isScanning,
  scanProgressText,
  onScan,
  onAddFolder,
  uiLanguage,
  onToggleLanguage,
  preferRussian,
  devMode,
  onOpenRemap,
  onSaveSettings,
  onScanSettings,
}) => {
  const { t } = useI18n(uiLanguage);
  const [isMaximized, setIsMaximized] = useState(false);
  const electron = (window as any).electronAPI;

  useEffect(() => {
    const electron = (window as any).electronAPI;
    if (electron?.windowControls?.isMaximized) {
      electron.windowControls.isMaximized().then(setIsMaximized);
    }
    if (electron?.windowControls?.onMaximizedChange) {
      const cleanup = electron.windowControls.onMaximizedChange((max: boolean) => {
        setIsMaximized(max);
      });
      return cleanup;
    }
  }, []);

  const handleMinimize = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const electron = (window as any).electronAPI;
    if (electron?.windowControls?.minimize) {
      electron.windowControls.minimize();
    }
  };

  const handleMaximize = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const electron = (window as any).electronAPI;
    if (electron?.windowControls?.maximize) {
      const max = await electron.windowControls.maximize();
      setIsMaximized(max);
    } else {
      // Browser fallback (toggle fullscreen)
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => setIsMaximized(true)).catch(() => {});
      } else {
        document.exitFullscreen().then(() => setIsMaximized(false)).catch(() => {});
      }
    }
  };

  const handleClose = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const electron = (window as any).electronAPI;
    if (electron?.windowControls?.close) {
      electron.windowControls.close();
    } else {
      window.close();
    }
  };

  const handleToggleDevTools = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const electron = (window as any).electronAPI;
    electron?.toggleDevTools?.();
  };

  const counts = {
    ALL: animeList.length,
    WATCHING: animeList.filter(a => !a.isCompleted && a.watchedCount > 0).length,
    COMPLETED: animeList.filter(a => a.isCompleted).length,
    AIRING: animeList.filter(a => a.airingStatus === 'RELEASING').length,
    MISSING: animeList.filter(a => a.hasMissingFiles).length,
  };

  const filterItems: { id: FilterStatus; label: string }[] = [
    { id: 'ALL', label: t('filterAll') },
    { id: 'WATCHING', label: t('filterWatching') },
    { id: 'COMPLETED', label: t('filterCompleted') },
    { id: 'AIRING', label: t('filterAiring') },
  ];
  if (counts.MISSING > 0) {
    filterItems.push({ id: 'MISSING', label: t('filterMissing') });
  }

  const displayDetailTitle = selectedAnime
    ? ((preferRussian || uiLanguage === 'ru') && selectedAnime.titleRussian)
      ? selectedAnime.titleRussian
      : selectedAnime.titleRomaji
    : '';

  return (
    <header
      className="absolute top-0 left-0 right-0 h-14 w-full flex items-center justify-between px-4 select-none shrink-0 z-40 transition-all drag-region bg-[#121212]/60 backdrop-blur-md border-b border-white/10 shadow-sm"
      style={{ WebkitAppRegion: 'drag' } as any}
      onDoubleClick={(e) => {
        // Only maximize if double clicked on the header bar itself, not interactive children
        if (e.target === e.currentTarget) {
          handleMaximize();
        }
      }}
    >
      {/* Left Section */}
      <div
        className="flex items-center gap-3 shrink-0"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {activeView === 'library' ? (
          <>
            {/* Logo */}
            <div className="flex items-center gap-2 pr-2">
              <img
                src="/CheckLister.svg"
                alt="CheckLister"
                className="w-5 h-5 rounded-[5px] shrink-0"
              />
              <span className="text-sm font-bold tracking-tight font-sans text-gradient-brand">
                CheckLister
              </span>
            </div>

            {/* Seamless Filter Tabs */}
            <nav className="flex items-center gap-1">
              {filterItems.map((item) => {
                const isActive = currentFilter === item.id && !searchQuery;
                const count = counts[item.id];
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onFilterChange(item.id);
                      if (searchQuery) onSearchChange('');
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs transition-all ${
                      isActive
                        ? 'bg-white/10 text-white font-medium'
                        : 'text-[#888888] hover:text-[#E0E0E0] hover:bg-white/5'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="font-mono text-[10px] text-[#888888]">
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </>
        ) : (
          /* Back to Library Button for Detail / Settings views */
          <div className="flex items-center gap-3">
            <button
              onClick={() => onViewChange('library')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] text-xs text-[#E0E0E0] hover:text-white hover:bg-white/5 transition-colors"
            >
              <ArrowLeft size={14} />
              <span className="font-medium">{t('backToLibrary')}</span>
            </button>

            <span className="text-white/20">/</span>

            <span className="text-xs text-[#888888] font-medium truncate max-w-xs md:max-w-md">
              {activeView === 'anime-detail' ? displayDetailTitle : t('settingsTitle')}
            </span>
          </div>
        )}
      </div>

      {/* Center Section: Airy Search Bar (only in library) */}
      <div
        className="flex-1 max-w-md mx-4"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {activeView === 'library' ? (
          <div className="relative w-full">
            <Search
              size={15}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888888] pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="input-dark w-full !pl-12 !pr-10 !py-1.5 text-xs bg-white/5 hover:bg-white/[0.08] focus:bg-[#161616] rounded-[8px] border-white/10 focus:border-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* Right Section: Actions + Window Controls */}
      <div
        className="flex items-center gap-1.5 shrink-0"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {activeView === 'library' && (
          <>
            {/* Language Switcher */}
            <button
              onClick={onToggleLanguage}
              title={uiLanguage === 'ru' ? 'Switch to English' : 'Переключить на русский'}
              className="px-2.5 py-1 rounded-[6px] text-xs font-mono text-[#888888] hover:text-white hover:bg-white/5 transition-colors"
            >
              {uiLanguage.toUpperCase()}
            </button>

            {/* Scan Button */}
            <button
              onClick={onScan}
              disabled={isScanning}
              className="btn-icon w-8 h-8 text-[#888888] hover:text-white border-transparent hover:border-white/10"
              title={t('btnScan')}
            >
              <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
            </button>

            {/* Add Folder */}
            <button
              onClick={onAddFolder}
              className="btn-icon w-8 h-8 text-[#888888] hover:text-white border-transparent hover:border-white/10"
              title={t('btnAddFolder')}
            >
              <FolderPlus size={14} />
            </button>

            {/* Settings */}
            <button
              onClick={() => onViewChange('settings')}
              className="btn-icon w-8 h-8 text-[#888888] hover:text-white border-transparent hover:border-white/10"
              title={t('navSettings')}
            >
              <Settings size={14} />
            </button>
          </>
        )}

        {activeView === 'anime-detail' && selectedAnime && (
          <>
            {onOpenRemap && (
              <button
                onClick={onOpenRemap}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs text-[#888888] hover:text-white hover:bg-white/5 transition-colors"
              >
                <Edit3 size={13} />
                <span>{t('btnRemap')}</span>
              </button>
            )}

            {selectedAnime.aniListId && (
              <a
                href={`https://anilist.co/anime/${selectedAnime.aniListId}`}
                target="_blank"
                rel="noreferrer"
                className="btn-icon w-8 h-8 text-[#888888] hover:text-white border-transparent hover:border-white/10"
                title={t('viewOnAnilist')}
              >
                <ExternalLink size={13} />
              </a>
            )}

            <button
              onClick={() => onViewChange('settings')}
              className="btn-icon w-8 h-8 text-[#888888] hover:text-white border-transparent hover:border-white/10"
              title={t('navSettings')}
            >
              <Settings size={14} />
            </button>
          </>
        )}

        {activeView === 'settings' && (
          <div className="flex items-center gap-2">
            {onScanSettings && (
              <button
                type="button"
                onClick={onScanSettings}
                disabled={isScanning}
                className="btn-secondary py-1.5 px-3 text-xs font-semibold gap-1.5 border-white/10 hover:border-white/20 text-[#E0E0E0] hover:text-white shrink-0 whitespace-nowrap"
                title={t('btnScan')}
              >
                <RefreshCw size={13} className={`shrink-0 ${isScanning ? 'animate-spin' : ''}`} />
                <span className="whitespace-nowrap">{t('btnScan')}</span>
              </button>
            )}

            {onSaveSettings && (
              <button
                type="button"
                onClick={onSaveSettings}
                className="btn-primary py-1.5 px-3.5 text-xs font-semibold gap-1.5 shadow-none shrink-0 whitespace-nowrap"
                title={t('btnSaveSettings')}
              >
                <Save size={13} className="shrink-0" />
                <span className="whitespace-nowrap">{t('btnSaveSettings')}</span>
              </button>
            )}
          </div>
        )}

        {/* Vertical Divider before Window Controls */}
        <div className="w-[1px] h-4 bg-white/10 mx-1" />

        {/* Window Controls */}
        <div
          className="flex items-center gap-0.5 no-drag-region"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <button
            type="button"
            onClick={handleMinimize}
            className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[#888888] hover:text-white hover:bg-white/5 transition-colors no-drag-region cursor-pointer"
            style={{ WebkitAppRegion: 'no-drag' } as any}
            title="Minimize"
          >
            <Minus size={13} className="pointer-events-none" />
          </button>
          <button
            type="button"
            onClick={handleMaximize}
            className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[#888888] hover:text-white hover:bg-white/5 transition-colors no-drag-region cursor-pointer"
            style={{ WebkitAppRegion: 'no-drag' } as any}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            <Square size={11} className="pointer-events-none" />
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[#888888] hover:text-white hover:bg-[#D32F2F] transition-colors no-drag-region cursor-pointer"
            style={{ WebkitAppRegion: 'no-drag' } as any}
            title="Close"
          >
            <X size={13} className="pointer-events-none" />
          </button>
        </div>
      </div>
    </header>
  );
};
