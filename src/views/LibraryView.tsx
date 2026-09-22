import React from 'react';
import type { AnimeWithEpisodes, FilterStatus, UILanguage } from '../types/index.ts';
import { AnimeCard } from '../components/AnimeCard.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { useI18n } from '../i18n/translations.ts';

interface LibraryViewProps {
  animeList: AnimeWithEpisodes[];
  filter: FilterStatus;
  searchQuery: string;
  preferRussian: boolean;
  uiLanguage: UILanguage;
  onSelectAnime: (anime: AnimeWithEpisodes) => void;
  onContinueWatching: (anime: AnimeWithEpisodes, e: React.MouseEvent) => void;
  onOpenFolder: (folderPath: string, e: React.MouseEvent) => void;
  onOpenSettings: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  animeList,
  filter,
  searchQuery,
  preferRussian,
  uiLanguage,
  onSelectAnime,
  onContinueWatching,
  onOpenFolder,
  onOpenSettings,
}) => {
  const { t } = useI18n(uiLanguage);

  if (animeList.length === 0) {
    let emptyTitle = t('emptyLibraryTitle');
    let emptyDesc = t('emptyLibraryDesc');

    if (searchQuery) {
      emptyTitle = t('emptySearchTitle');
      emptyDesc = t('emptySearchDesc');
    } else if (filter === 'WATCHING') {
      emptyTitle = t('emptyWatchingTitle');
      emptyDesc = t('emptyWatchingDesc');
    } else if (filter === 'COMPLETED') {
      emptyTitle = t('emptyCompletedTitle');
      emptyDesc = t('emptyCompletedDesc');
    } else if (filter === 'AIRING') {
      emptyTitle = t('emptyAiringTitle');
      emptyDesc = t('emptyAiringDesc');
    } else if (filter === 'MISSING') {
      emptyTitle = t('emptyMissingTitle');
      emptyDesc = t('emptyMissingDesc');
    }

    return (
      <div className="flex-1 flex items-center justify-center p-8 pt-20">
        <EmptyState
          title={emptyTitle}
          description={emptyDesc}
          actionLabel={t('btnAddFolder')}
          onAction={onOpenSettings}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8 pt-20">
      {/* Auto-fill responsive grid with minimum card width of 210px to prevent squishing */}
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
          />
        ))}
      </div>
    </div>
  );
};
