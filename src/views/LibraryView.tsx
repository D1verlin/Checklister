import React, { useState, useEffect, useRef } from 'react';
import type { AnimeWithEpisodes, FilterStatus, UILanguage, SortOption } from '../types/index.ts';
import { AnimeCard } from '../components/AnimeCard.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { useI18n } from '../i18n/translations.ts';
import { X, Check, ChevronDown } from 'lucide-react';

interface LibraryViewProps {
  animeList: AnimeWithEpisodes[];
  filter: FilterStatus;
  searchQuery: string;
  selectedUserFolder?: string;
  preferRussian: boolean;
  uiLanguage: UILanguage;
  onSelectAnime: (anime: AnimeWithEpisodes) => void;
  onContinueWatching: (anime: AnimeWithEpisodes, e: React.MouseEvent) => void;
  onOpenFolder: (folderPath: string, e: React.MouseEvent) => void;
  onOpenFolderModal?: (anime: AnimeWithEpisodes, e: React.MouseEvent) => void;
  onOpenSettings: () => void;
  // Filter sidebar props
  isFilterSidebarOpen?: boolean;
  sortBy?: SortOption;
  onSortChange?: (sort: SortOption) => void;
  allGenres?: string[];
  selectedGenre?: string | null;
  onSelectGenre?: (genre: string | null) => void;
  allStudios?: string[];
  selectedStudio?: string | null;
  onSelectStudio?: (studio: string | null) => void;
  totalAnimeCount?: number;
}

/** Dark Monolith custom dropdown — no native <select>, no browser styling */
const FilterDropdown: React.FC<{
  label: string;
  value: string | null;
  allLabel: string;
  options: string[];
  onChange: (v: string | null) => void;
}> = ({ label, value, allLabel, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-xs border transition-all ${
          value
            ? 'bg-white/10 text-white border-white/20 font-medium'
            : 'bg-[#161616] text-[#888888] border-white/10 hover:border-white/20 hover:text-[#E0E0E0]'
        }`}
      >
        <span className="truncate">{value || allLabel}</span>
        <ChevronDown
          size={11}
          className={`shrink-0 ml-1 text-[#888888] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 rounded-[8px] bg-[#181818] border border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.65)] py-1 z-50 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          {/* All option */}
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between transition-colors ${
              !value ? 'bg-white/10 text-white font-semibold' : 'text-[#888888] hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{allLabel}</span>
            {!value && <Check size={11} />}
          </button>
          {/* Individual options */}
          {options.map((opt) => {
            const isSel = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between transition-colors ${
                  isSel ? 'bg-white/10 text-white font-semibold' : 'text-[#888888] hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="truncate">{opt}</span>
                {isSel && <Check size={11} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const LibraryView: React.FC<LibraryViewProps> = ({
  animeList,
  filter,
  searchQuery,
  selectedUserFolder,
  preferRussian,
  uiLanguage,
  onSelectAnime,
  onContinueWatching,
  onOpenFolder,
  onOpenFolderModal,
  onOpenSettings,
  isFilterSidebarOpen,
  sortBy = 'title',
  onSortChange,
  allGenres = [],
  selectedGenre = null,
  onSelectGenre,
  allStudios = [],
  selectedStudio = null,
  onSelectStudio,
  totalAnimeCount = 0,
}) => {
  const { t } = useI18n(uiLanguage);

  const sortOptions: { id: SortOption; label: string }[] = [
    { id: 'title', label: t('sortTitle') },
    { id: 'score', label: t('sortScore') },
    { id: 'size', label: t('sortSize') },
    { id: 'date', label: t('sortDate') },
    { id: 'remaining', label: t('sortRemaining') },
  ];

  const activeFiltersCount = (selectedGenre ? 1 : 0) + (selectedStudio ? 1 : 0);
  const showSidebar = isFilterSidebarOpen && (allGenres.length > 0 || allStudios.length > 0 || !!onSortChange);

  const emptyContent = (() => {
    if (animeList.length > 0) return null;
    let emptyTitle = t('emptyLibraryTitle');
    let emptyDesc = t('emptyLibraryDesc');
    if (searchQuery) {
      emptyTitle = t('emptySearchTitle');
      emptyDesc = t('emptySearchDesc');
    } else if (selectedUserFolder) {
      emptyTitle = t('noAnimeInFolder');
      emptyDesc = t('noAnimeInFolderDesc');
    } else if (filter === 'WATCHING') {
      emptyTitle = t('emptyWatchingTitle');
      emptyDesc = t('emptyWatchingDesc');
    } else if (filter === 'COMPLETED') {
      emptyTitle = t('emptyCompletedTitle');
      emptyDesc = t('emptyCompletedDesc');
    } else if (filter === 'MISSING') {
      emptyTitle = t('emptyMissingTitle');
      emptyDesc = t('emptyMissingDesc');
    }
    return { emptyTitle, emptyDesc };
  })();

  if (emptyContent && !showSidebar) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 pt-20">
        <EmptyState
          title={emptyContent.emptyTitle}
          description={emptyContent.emptyDesc}
          actionLabel={t('btnAddFolder')}
          onAction={onOpenSettings}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-row overflow-hidden">
      {/* ── Left Filter Sidebar ── */}
      {showSidebar && (
        <aside className="w-48 shrink-0 flex flex-col bg-[#121212] overflow-y-auto pt-16">
          <div className="p-4 pt-5 flex flex-col gap-5">

            {/* Sort */}
            {onSortChange && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#555555] px-1">
                  {uiLanguage === 'ru' ? 'Сортировка' : 'Sort by'}
                </span>
                <div className="flex flex-col gap-0.5">
                  {sortOptions.map((opt) => {
                    const isActive = sortBy === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onSortChange(opt.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-[6px] text-xs transition-all ${
                          isActive
                            ? 'bg-white/8 text-white font-medium'
                            : 'text-[#666666] hover:text-[#E0E0E0] hover:bg-white/5'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Genre */}
            {allGenres.length > 0 && onSelectGenre && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#555555]">
                    {uiLanguage === 'ru' ? 'Жанр' : 'Genre'}
                  </span>
                  {selectedGenre && (
                    <button
                      type="button"
                      onClick={() => onSelectGenre(null)}
                      className="text-[#555555] hover:text-[#E0E0E0] transition-colors"
                      title="Сбросить"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
                <FilterDropdown
                  label={uiLanguage === 'ru' ? 'Жанр' : 'Genre'}
                  value={selectedGenre}
                  allLabel={t('filterGenreAll')}
                  options={allGenres}
                  onChange={onSelectGenre}
                />
              </div>
            )}

            {/* Studio */}
            {allStudios.length > 0 && onSelectStudio && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#555555]">
                    {uiLanguage === 'ru' ? 'Студия' : 'Studio'}
                  </span>
                  {selectedStudio && (
                    <button
                      type="button"
                      onClick={() => onSelectStudio(null)}
                      className="text-[#555555] hover:text-[#E0E0E0] transition-colors"
                      title="Сбросить"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
                <FilterDropdown
                  label={uiLanguage === 'ru' ? 'Студия' : 'Studio'}
                  value={selectedStudio}
                  allLabel={t('filterStudioAll')}
                  options={allStudios}
                  onChange={onSelectStudio}
                />
              </div>
            )}

            {/* Library stats — muted, at the bottom */}
            <div className="mt-auto pt-4 flex flex-col gap-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] text-[#444444]">
                  {uiLanguage === 'ru' ? 'Всего' : 'Total'}
                </span>
                <span className="text-[10px] font-mono text-[#444444]">{totalAnimeCount}</span>
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] text-[#444444]">
                  {uiLanguage === 'ru' ? 'Показано' : 'Shown'}
                </span>
                <span className="text-[10px] font-mono text-[#444444]">{animeList.length}</span>
              </div>
            </div>

          </div>
        </aside>
      )}

      {/* ── Main Grid Area ── */}
      {emptyContent ? (
        <div className="flex-1 flex items-center justify-center p-8 pt-20">
          <EmptyState
            title={emptyContent.emptyTitle}
            description={emptyContent.emptyDesc}
            actionLabel={t('btnAddFolder')}
            onAction={onOpenSettings}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8 pt-20">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-6">
            {animeList.map((anime) => (
              <AnimeCard
                key={anime.id}
                anime={anime}
                preferRussian={preferRussian}
                uiLanguage={uiLanguage}
                onSelect={onSelectAnime}
                onContinueWatching={onContinueWatching}
                onOpenFolder={onOpenFolder}
                onOpenFolderModal={onOpenFolderModal}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
