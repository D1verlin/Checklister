import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  X,
  RefreshCw,
  Settings,
  Minus,
  Square,
  Edit3,
  ExternalLink,
  Save,
  Folder,
  Check,
  PanelLeftOpen,
  PanelLeftClose,
} from 'lucide-react';
import type {
  ActiveView,
  FilterStatus,
  UILanguage,
  AnimeWithEpisodes,
} from '../types/index.ts';
import { useI18n } from '../i18n/translations.ts';
import CheckListerLogo from '../assets/CheckLister.svg';

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
  preferRussian: boolean;
  devMode: boolean;
  onOpenRemap?: () => void;
  onSaveSettings?: () => void;
  onScanSettings?: () => void;
  customFolders?: string[];
  selectedUserFolder?: string | null;
  onSelectUserFolder?: (folder: string | null) => void;
  isFilterSidebarOpen?: boolean;
  onToggleFilterSidebar?: () => void;
  activeFiltersCount?: number;
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
  onScan,
  onAddFolder,
  uiLanguage,
  preferRussian,
  onOpenRemap,
  onSaveSettings,
  onScanSettings,
  customFolders = [],
  selectedUserFolder = null,
  onSelectUserFolder,
  isFilterSidebarOpen,
  onToggleFilterSidebar,
  activeFiltersCount = 0,
}) => {
  const { t } = useI18n(uiLanguage);
  const [isMaximized, setIsMaximized] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const folderEl = (e.target as Element).closest('[data-folder-dropdown]');
      if (!folderEl) setFolderOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    electron?.windowControls?.minimize?.();
  };

  const handleMaximize = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const electron = (window as any).electronAPI;
    if (electron?.windowControls?.maximize) {
      const max = await electron.windowControls.maximize();
      setIsMaximized(max);
    }
  };

  const handleClose = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const electron = (window as any).electronAPI;
    electron?.windowControls?.close?.();
  };

  const counts = {
    ALL: animeList.length,
    WATCHING: animeList.filter((a) => !a.isCompleted && a.watchedCount > 0).length,
    COMPLETED: animeList.filter((a) => a.isCompleted).length,
    MISSING: animeList.filter((a) => a.hasMissingFiles).length,
  };

  const filterItems: { id: FilterStatus; label: string }[] = [
    { id: 'ALL', label: t('filterAll') },
    { id: 'WATCHING', label: t('filterWatching') },
    { id: 'COMPLETED', label: t('filterCompleted') },
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
            <div className="flex items-center gap-2 pr-1">
              <img
                src={CheckListerLogo}
                alt="CheckLister"
                className="w-5 h-5 rounded-[5px] shrink-0"
              />
              <span className="text-sm font-bold tracking-tight font-sans text-gradient-brand">
                CheckLister
              </span>
            </div>

            {/* Sidebar Panel Toggle — логично рядом с логотипом, перед статусами */}
            {onToggleFilterSidebar && (
              <button
                type="button"
                onClick={onToggleFilterSidebar}
                title={isFilterSidebarOpen
                  ? (activeFiltersCount > 0 ? `Скрыть панель (активно фильтров: ${activeFiltersCount})` : 'Скрыть панель')
                  : (activeFiltersCount > 0 ? `Показать панель (активно фильтров: ${activeFiltersCount})` : 'Показать панель')}
                className={`btn-icon w-8 h-8 relative border-transparent transition-colors ${
                  activeFiltersCount > 0
                    ? 'text-white hover:text-white hover:border-white/10'
                    : isFilterSidebarOpen
                      ? 'text-white/70 hover:text-white hover:border-white/10'
                      : 'text-[#888888] hover:text-white hover:border-white/10'
                }`}
              >
                {isFilterSidebarOpen
                  ? <PanelLeftClose size={15} />
                  : <PanelLeftOpen size={15} />
                }
                {activeFiltersCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-[6px] h-[6px] rounded-full bg-white" />
                )}
              </button>
            )}

            {/* Separator */}
            <div className="w-px h-4 bg-white/10" />

            {/* Status Filter Tabs */}
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

      {/* Center Section: Search Bar & Controls (only in library) */}
      <div
        className="flex-1 max-w-lg mx-3 flex items-center gap-2"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {activeView === 'library' && (
          <>
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888] pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="input-dark w-full !pl-10 !pr-9 !py-1 text-xs bg-white/5 hover:bg-white/[0.08] focus:bg-[#161616] rounded-[8px] border-white/10 focus:border-white transition-all font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* User Folders Dropdown */}
            {customFolders.length > 0 && onSelectUserFolder && (
              <div data-folder-dropdown className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setFolderOpen(!folderOpen)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-xs border transition-all w-[130px] ${
                    selectedUserFolder
                      ? 'bg-white/15 text-white border-white/25 font-semibold'
                      : 'bg-white/5 text-[#888888] hover:text-white border-white/10'
                  }`}
                  title={t('customFoldersTitle')}
                >
                  <Folder size={12} className={`shrink-0 ${selectedUserFolder ? 'text-white' : 'text-[#888888]'}`} />
                  <span className="flex-1 text-left">{selectedUserFolder || t('folderAll')}</span>
                </button>

                {folderOpen && (
                  <div className="absolute left-0 mt-1.5 w-[130px] rounded-[8px] bg-[#181818] border border-white/15 shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectUserFolder(null);
                        setFolderOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between transition-colors ${
                        !selectedUserFolder ? 'bg-white/10 text-white font-semibold' : 'text-[#888888] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>{t('folderAll')}</span>
                      {!selectedUserFolder && <Check size={12} />}
                    </button>
                    {customFolders.map((f) => {
                      const isSel = selectedUserFolder === f;
                      return (
                        <button
                          key={f}
                          type="button"
                          onClick={() => {
                            onSelectUserFolder(f);
                            setFolderOpen(false);
                          }}
                          className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between transition-colors ${
                            isSel ? 'bg-white/10 text-white font-semibold' : 'text-[#888888] hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span>{f}</span>
                          {isSel && <Check size={12} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Right Section: Actions + Window Controls */}
      <div
        className="flex items-center gap-1.5 shrink-0"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {activeView === 'library' && (
          <>
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

        {/* Separator before window controls */}
        <div className="w-[1px] h-4 bg-white/10 mx-1" />

        {/* Windows Caption Controls */}
        <div className="flex items-center">
          <button
            onClick={handleMinimize}
            className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[#888888] hover:text-white hover:bg-white/5 transition-colors"
            title="Minimize"
          >
            <Minus size={13} />
          </button>

          <button
            onClick={handleMaximize}
            className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[#888888] hover:text-white hover:bg-white/5 transition-colors"
            title="Maximize"
          >
            <Square size={11} className={isMaximized ? 'opacity-80' : ''} />
          </button>

          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[#888888] hover:text-white hover:bg-[#E81123] transition-colors"
            title="Close"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </header>
  );
};
