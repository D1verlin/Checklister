import React, { useState, useEffect } from 'react';
import {
  Play,
  Check,
  Folder,
  Star,
  Film,
  Trash2,
} from 'lucide-react';
import type { AnimeWithEpisodes, Episode, UILanguage } from '../types/index.ts';
import { useI18n } from '../i18n/translations.ts';
import { CustomCheckbox } from '../components/common/CustomCheckbox.tsx';

interface AnimeDetailViewProps {
  anime: AnimeWithEpisodes;
  preferRussian: boolean;
  uiLanguage: UILanguage;
  onToggleEpisodeWatch: (animeId: string, episodeId: string) => void;
  onPlayEpisode: (episode: Episode) => void;
  onContinueWatching: (anime: AnimeWithEpisodes) => void;
  onShowInFolder: (filePath: string) => void;
  onDeleteAnime?: (animeId: string) => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '--';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

function formatCountdown(seconds?: number): string {
  if (!seconds || seconds <= 0) return '';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `in ${days}d ${hours}h`;
  return `in ${hours}h`;
}

const pendingDetailCoverDownloads = new Set<string>();

export const AnimeDetailView: React.FC<AnimeDetailViewProps> = ({
  anime,
  preferRussian,
  uiLanguage,
  onToggleEpisodeWatch,
  onPlayEpisode,
  onContinueWatching,
  onShowInFolder,
  onDeleteAnime,
}) => {
  const { t } = useI18n(uiLanguage);
  const initialSrc = anime.localCover || anime.coverImage || anime.shikimoriCoverImage;
  const [currentCoverSrc, setCurrentCoverSrc] = useState<string | undefined>(initialSrc);
  const [coverError, setCoverError] = useState(false);
  const [coverLoading, setCoverLoading] = useState(
    initialSrc ? !initialSrc.startsWith('checklister-media://') : false
  );
  const [bannerError, setBannerError] = useState(false);

  useEffect(() => {
    const src = anime.localCover || anime.coverImage || anime.shikimoriCoverImage;
    setCurrentCoverSrc(src);
    setCoverError(false);
    setCoverLoading(src ? !src.startsWith('checklister-media://') : false);
    setBannerError(false);

    // If localCover is missing, cache in background safely
    if (
      !anime.localCover &&
      (anime.coverImage || anime.shikimoriCoverImage) &&
      (window as any).electronAPI?.cacheCover
    ) {
      if (!pendingDetailCoverDownloads.has(anime.id)) {
        pendingDetailCoverDownloads.add(anime.id);
        const candidates = [anime.coverImage, anime.shikimoriCoverImage].filter(Boolean) as string[];
        (window as any).electronAPI
          .cacheCover(anime.id, candidates)
          .then((local: string | null) => {
            if (local) {
              anime.localCover = local;
              setCurrentCoverSrc(local);
              setCoverLoading(false);
            }
          })
          .catch(() => {})
          .finally(() => {
            pendingDetailCoverDownloads.delete(anime.id);
          });
      }
    }
  }, [anime.id, anime.localCover, anime.coverImage, anime.shikimoriCoverImage, anime.bannerImage]);

  const handleCoverError = () => {
    if (currentCoverSrc === anime.localCover) {
      const fallback = anime.coverImage || anime.shikimoriCoverImage;
      if (fallback) {
        setCurrentCoverSrc(fallback);
        setCoverLoading(true);
        return;
      }
    } else if (currentCoverSrc === anime.coverImage && anime.shikimoriCoverImage) {
      setCurrentCoverSrc(anime.shikimoriCoverImage);
      setCoverLoading(true);
      return;
    }
    setCoverError(true);
    setCoverLoading(false);
  };

  const isRussian = (preferRussian || uiLanguage === 'ru') && Boolean(anime.titleRussian);
  const displayTitle = isRussian
    ? anime.titleRussian!
    : anime.titleRomaji;

  const secondaryTitle = isRussian
    ? anime.titleRomaji
    : anime.titleRussian || anime.titleEnglish;

  const nextEp = anime.nextEpisodeToWatch;
  const totalEpCount = Math.max(anime.totalEpisodes || 0, anime.totalLocalEpisodes);

  return (
    <div className="flex-1 overflow-y-auto select-none bg-[#121212]">
      {/* Widescreen Hero Banner */}
      <div className="relative w-full h-64 md:h-72 bg-[#141414] overflow-hidden">
        {anime.bannerImage && !bannerError ? (
          <img
            src={anime.bannerImage}
            alt={displayTitle}
            referrerPolicy="no-referrer"
            onError={() => setBannerError(true)}
            className="w-full h-full object-cover opacity-35 filter blur-[1px]"
          />
        ) : currentCoverSrc && !coverError ? (
          <img
            src={currentCoverSrc}
            alt={displayTitle}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-20 filter blur-[3px]"
          />
        ) : null}

        {/* Soft gradient into background */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/70 to-transparent" />
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-6 md:px-8 -mt-36 relative z-10 pb-20">
        <div className="flex flex-col md:flex-row items-start gap-8">
          {/* Left Column: Poster & Actions */}
          <div className="w-full md:w-60 shrink-0 flex flex-col items-center md:items-start gap-4">
            {/* 2:3 Vertical Poster */}
            <div className="w-48 md:w-full aspect-[2/3] rounded-[14px] overflow-hidden bg-[#181818] border border-white/10 shadow-xl relative">
              {/* Dark Monolith Minimalist Shimmer Skeleton */}
              {currentCoverSrc && !coverError && coverLoading && (
                <div className="absolute inset-0 skeleton-shimmer flex flex-col items-center justify-center text-[#444444] z-0">
                  <Film size={32} className="opacity-30" />
                </div>
              )}

              {currentCoverSrc && !coverError ? (
                <img
                  src={currentCoverSrc}
                  alt={displayTitle}
                  referrerPolicy="no-referrer"
                  onLoad={() => setCoverLoading(false)}
                  onError={handleCoverError}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    coverLoading ? 'opacity-0' : 'opacity-100'
                  }`}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#888888] p-4 text-center">
                  <Film size={36} className="text-[#888888] mb-2" />
                  <span className="text-xs font-semibold text-white">{displayTitle}</span>
                </div>
              )}
            </div>

            {/* Quick Action Button */}
            {nextEp ? (
              <button
                onClick={() => onContinueWatching(anime)}
                className="btn-primary w-full py-2.5 text-xs font-semibold shadow-none"
              >
                <Play size={13} fill="currentColor" />
                <span>{t('btnContinue')}: EP {String(nextEp.episodeNumber).padStart(2, '0')}</span>
              </button>
            ) : (
              <div className="w-full py-2 px-3 rounded-[8px] bg-white/5 border border-white/5 text-xs text-[#888888] flex items-center justify-center gap-2 font-mono">
                <Check size={14} />
                <span>{t('allEpisodesWatched')}</span>
              </div>
            )}

            {/* Explorer Button */}
            <button
              onClick={() => onShowInFolder(anime.folderPath)}
              className="btn-secondary w-full py-2 text-xs gap-2 border-white/10"
            >
              <Folder size={14} />
              <span>{t('btnShowFolder')}</span>
            </button>

            {/* Delete Anime from Library Button */}
            {onDeleteAnime && (
              <button
                onClick={() => {
                  if (window.confirm(t('confirmDeleteAnime'))) {
                    onDeleteAnime(anime.id);
                  }
                }}
                className="btn-secondary w-full py-2 text-xs gap-2 border-white/10 hover:border-red-500/30 text-[#888888] hover:text-red-400"
                title={t('btnDeleteAnime')}
              >
                <Trash2 size={14} />
                <span>{t('btnDeleteAnime')}</span>
              </button>
            )}

            {/* Quick Attributes */}
            <div className="w-full p-4 rounded-[10px] bg-[#161616]/60 border border-white/5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[#888888]">{t('scoreLabel')}</span>
                <span className="font-mono text-white flex items-center gap-1 font-semibold">
                  <Star size={12} className="text-white" fill="currentColor" />
                  {anime.score || '--'}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[#888888]">Status</span>
                <span className="font-mono text-white">
                  {anime.airingStatus === 'RELEASING' ? t('statusAiring') : t('statusCompleted')}
                </span>
              </div>

              {anime.studios && anime.studios.length > 0 && (
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-[#888888]">Studio</span>
                  <span className="text-white truncate max-w-[120px] font-sans">
                    {anime.studios.join(', ')}
                  </span>
                </div>
              )}

              <div className="pt-0.5">
                <span className="text-[#888888] text-[11px] block mb-1">Folder</span>
                <span className="font-mono text-[10px] text-[#888888] break-all block">
                  {anime.folderPath}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Titles, Synopsis & Episodes */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Title & Badges */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {anime.airingStatus === 'RELEASING' && (
                  <span className="badge-pill badge-active">
                    {t('statusAiring')} {anime.nextAiringEpisode && `(EP ${anime.nextAiringEpisode.episode} ${t('nextEpisodeIn')} ${formatCountdown(anime.nextAiringEpisode.timeUntilAiring)})`}
                  </span>
                )}
                {anime.isCompleted && (
                  <span className="badge-pill bg-white/5 text-[#888888]">
                    {t('statusCompleted')}
                  </span>
                )}
                {anime.genres && anime.genres.map((g) => (
                  <span key={g} className="badge-pill">
                    {g}
                  </span>
                ))}
              </div>

              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gradient-brand">
                {displayTitle}
              </h1>

              {secondaryTitle && (
                <p className="text-sm text-[#888888] font-sans">
                  {secondaryTitle}
                </p>
              )}
            </div>

            {/* Progress Bar Line */}
            <div className="space-y-2 p-4 rounded-[10px] bg-[#161616]/40 border border-white/5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#888888]">{t('watchProgress')}</span>
                <span className="font-mono text-white font-semibold">
                  {anime.watchedCount} / {totalEpCount} {t('episodesCount')} ({anime.progressPercent}%)
                </span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-[2px] overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-300"
                  style={{ width: `${anime.progressPercent}%` }}
                />
              </div>
            </div>

            {/* Synopsis */}
            {(anime.synopsisRussian || anime.synopsis) && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
                  {t('synopsisTitle')}
                </h3>
                <p className="text-xs md:text-sm text-[#E0E0E0] leading-relaxed">
                  {preferRussian && anime.synopsisRussian
                    ? anime.synopsisRussian
                    : anime.synopsis || anime.synopsisRussian}
                </p>
              </div>
            )}

            {/* Episode List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#888888]">
                <span>{t('episodesHeader')} ({anime.episodes.length} {t('totalFiles')})</span>
                <span className="font-mono text-[11px] text-[#888888]">{t('tableStatusSize')}</span>
              </div>

              <div className="divide-y divide-white/5 border border-white/5 rounded-[12px] bg-[#161616]/40 overflow-hidden">
                {anime.episodes.length === 0 ? (
                  <div className="p-8 text-xs text-[#888888] text-center font-mono">
                    {t('noEpisodesDiscovered')}
                  </div>
                ) : (
                  anime.episodes.map((ep) => (
                    <div
                      key={ep.id}
                      className="p-3 px-4 flex items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors"
                    >
                      {/* Checkbox & Name */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <CustomCheckbox
                          checked={ep.isWatched}
                          onChange={() => onToggleEpisodeWatch(anime.id, ep.id)}
                        />

                        <span className="font-mono text-xs font-semibold text-white shrink-0">
                          EP {String(ep.episodeNumber).padStart(2, '0')}
                        </span>

                        <span
                          className={`text-xs font-mono truncate ${
                            ep.isWatched ? 'text-[#888888] line-through' : 'text-[#E0E0E0]'
                          }`}
                          title={ep.fileName}
                        >
                          {ep.fileName}
                        </span>
                      </div>

                      {/* Right Meta & Actions */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="font-mono text-[11px] text-[#888888]">
                          {formatBytes(ep.fileSize)}
                        </span>

                        <button
                          onClick={() => onPlayEpisode(ep)}
                          disabled={ep.fileMissing}
                          className="btn-icon w-7 h-7 text-[#888888] hover:text-white border-transparent hover:border-white/10"
                          title={t('btnPlayInPlayer')}
                        >
                          <Play size={12} fill="currentColor" />
                        </button>

                        <button
                          onClick={() => onShowInFolder(ep.filePath)}
                          className="btn-icon w-7 h-7 text-[#888888] hover:text-white border-transparent hover:border-white/10"
                          title={t('btnShowInExplorer')}
                        >
                          <Folder size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
