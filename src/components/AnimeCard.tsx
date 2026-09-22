import React, { useState, useEffect } from 'react';
import { Play, Check, Folder, AlertTriangle, Film } from 'lucide-react';
import type { AnimeWithEpisodes, UILanguage } from '../types/index.ts';
import { useI18n } from '../i18n/translations.ts';

interface AnimeCardProps {
  anime: AnimeWithEpisodes;
  preferRussian: boolean;
  uiLanguage: UILanguage;
  onSelect: (anime: AnimeWithEpisodes) => void;
  onContinueWatching: (anime: AnimeWithEpisodes, e: React.MouseEvent) => void;
  onOpenFolder: (folderPath: string, e: React.MouseEvent) => void;
}

const pendingCoverDownloads = new Set<string>();

export const AnimeCard: React.FC<AnimeCardProps> = ({
  anime,
  preferRussian,
  uiLanguage,
  onSelect,
  onContinueWatching,
  onOpenFolder,
}) => {
  const { t } = useI18n(uiLanguage);
  const initialSrc = anime.localCover || anime.coverImage || anime.shikimoriCoverImage;
  const [currentImgSrc, setCurrentImgSrc] = useState<string | undefined>(initialSrc);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(
    initialSrc ? !initialSrc.startsWith('checklister-media://') : false
  );

  // Reset error & loading states if image changes or library refreshes
  useEffect(() => {
    const src = anime.localCover || anime.coverImage || anime.shikimoriCoverImage;
    setCurrentImgSrc(src);
    setImageError(false);
    // If local file, load instantly without skeleton delay
    setImageLoading(src ? !src.startsWith('checklister-media://') : false);

    // If localCover is missing, cache it in background safely
    if (
      !anime.localCover &&
      (anime.coverImage || anime.shikimoriCoverImage) &&
      (window as any).electronAPI?.cacheCover
    ) {
      if (!pendingCoverDownloads.has(anime.id)) {
        pendingCoverDownloads.add(anime.id);
        const candidates = [anime.coverImage, anime.shikimoriCoverImage].filter(Boolean) as string[];
        (window as any).electronAPI
          .cacheCover(anime.id, candidates)
          .then((local: string | null) => {
            if (local) {
              anime.localCover = local;
              setCurrentImgSrc(local);
              setImageLoading(false);
            }
          })
          .catch(() => {})
          .finally(() => {
            pendingCoverDownloads.delete(anime.id);
          });
      }
    }
  }, [anime.localCover, anime.coverImage, anime.shikimoriCoverImage, anime.id]);

  const handleImageError = () => {
    if (currentImgSrc === anime.localCover) {
      const fallback = anime.coverImage || anime.shikimoriCoverImage;
      if (fallback) {
        setCurrentImgSrc(fallback);
        setImageLoading(true);
        return;
      }
    } else if (currentImgSrc === anime.coverImage && anime.shikimoriCoverImage) {
      setCurrentImgSrc(anime.shikimoriCoverImage);
      setImageLoading(true);
      return;
    }
    setImageError(true);
    setImageLoading(false);
  };

  const isRussian = (preferRussian || uiLanguage === 'ru') && Boolean(anime.titleRussian);
  const displayTitle = isRussian
    ? anime.titleRussian!
    : anime.titleRomaji;

  const subTitle = isRussian
    ? anime.titleRomaji
    : anime.titleEnglish || anime.titleRussian;

  const totalDisplay = Math.max(anime.totalEpisodes || 0, anime.totalLocalEpisodes);
  const nextEp = anime.nextEpisodeToWatch;

  let statusText = t('statusWatching');
  let statusClass = 'bg-black/60 text-[#E0E0E0]';
  if (anime.isCompleted) {
    statusText = t('statusCompleted');
    statusClass = 'bg-black/60 text-[#888888]';
  } else if (anime.airingStatus === 'RELEASING') {
    statusText = t('statusAiring');
    statusClass = 'bg-white/20 text-white font-medium';
  }

  return (
    <div
      onClick={() => onSelect(anime)}
      className="group relative flex flex-col rounded-[12px] bg-[#161616]/80 hover:bg-[#1a1a1a] transition-all duration-200 cursor-pointer overflow-hidden border border-white/5 hover:border-white/20 select-none shadow-sm hover:shadow-lg"
    >
      {/* 2:3 Vertical Poster Container */}
      <div className="relative aspect-[2/3] w-full bg-[#141414] overflow-hidden">
        {/* Shimmer skeleton while image is downloading */}
        {currentImgSrc && !imageError && imageLoading && (
          <div className="absolute inset-0 skeleton-shimmer flex flex-col items-center justify-center text-[#444444] z-0">
            <Film size={24} className="opacity-30" />
          </div>
        )}

        {currentImgSrc && !imageError ? (
          <img
            src={currentImgSrc}
            alt={displayTitle}
            referrerPolicy="no-referrer"
            onLoad={() => setImageLoading(false)}
            onError={handleImageError}
            className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-[1.03] ${
              imageLoading ? 'opacity-0' : 'opacity-100'
            }`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#888888] p-4 text-center bg-[#181818]">
            <Film size={28} className="text-[#888888] mb-2" />
            <span className="text-[11px] font-semibold text-white line-clamp-2 px-2">
              {displayTitle}
            </span>
          </div>
        )}

        {/* Top Overlay Badges */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
          <div className={`px-2 py-0.5 rounded-[5px] text-[10px] font-mono tracking-wide backdrop-blur-md ${statusClass}`}>
            {statusText}
          </div>

          {anime.hasMissingFiles && (
            <div className="px-2 py-0.5 rounded-[5px] text-[10px] font-mono text-white bg-black/60 backdrop-blur-md flex items-center gap-1">
              <AlertTriangle size={11} />
              <span>{t('statusMissing')}</span>
            </div>
          )}
        </div>

        {/* Bottom Episode Pill */}
        <div className="absolute bottom-2.5 right-2.5 pointer-events-none">
          <div className="px-2 py-0.5 rounded-[5px] text-[11px] font-mono text-white bg-black/70 backdrop-blur-md">
            {String(anime.watchedCount).padStart(2, '0')} / {String(totalDisplay).padStart(2, '0')}
          </div>
        </div>

        {/* Hover Quick Actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
          {nextEp ? (
            <button
              onClick={(e) => onContinueWatching(anime, e)}
              className="btn-primary py-1.5 px-3 text-xs"
              title={`Play next: Episode ${nextEp.episodeNumber}`}
            >
              <Play size={12} fill="currentColor" />
              <span>EP {String(nextEp.episodeNumber).padStart(2, '0')}</span>
            </button>
          ) : (
            <div className="px-3 py-1.5 rounded-[6px] bg-white/10 text-xs text-white flex items-center gap-1.5 font-mono backdrop-blur-md">
              <Check size={13} />
              <span>{t('statusCompleted')}</span>
            </div>
          )}

          <button
            onClick={(e) => onOpenFolder(anime.folderPath, e)}
            className="btn-icon bg-black/50 text-[#E0E0E0] hover:text-white"
            title={t('btnShowFolder')}
          >
            <Folder size={14} />
          </button>
        </div>
      </div>

      {/* Flat Progress Bar */}
      <div className="w-full h-1 bg-white/5">
        <div
          className="h-full bg-white transition-all duration-300"
          style={{ width: `${anime.progressPercent}%` }}
        />
      </div>

      {/* Card Info Footer */}
      <div className="p-3.5 flex flex-col justify-between flex-1 gap-1">
        <div>
          <h3
            className="text-xs font-semibold text-[#E0E0E0] line-clamp-1 group-hover:text-white transition-colors"
            title={displayTitle}
          >
            {displayTitle}
          </h3>
          {subTitle && (
            <p className="text-[11px] text-[#888888] line-clamp-1 mt-0.5 font-sans">
              {subTitle}
            </p>
          )}
        </div>

        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#888888] font-mono">
          <span>{anime.totalLocalEpisodes} {t('totalFiles')}</span>
          <span>{anime.progressPercent}%</span>
        </div>
      </div>
    </div>
  );
};
