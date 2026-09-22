import React from 'react';
import {
  X,
  Play,
  Check,
  Folder,
  ExternalLink,
  Edit3,
  Clock,
  Star,
  CheckSquare,
  Square,
  AlertTriangle
} from 'lucide-react';
import type { AnimeWithEpisodes, Episode } from '../types/index.ts';

interface AnimeDetailModalProps {
  anime: AnimeWithEpisodes | null;
  preferRussian: boolean;
  onClose: () => void;
  onToggleEpisodeWatch: (animeId: string, episodeId: string) => void;
  onPlayEpisode: (episode: Episode) => void;
  onContinueWatching: (anime: AnimeWithEpisodes) => void;
  onShowInFolder: (filePath: string) => void;
  onOpenRemap: (anime: AnimeWithEpisodes) => void;
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

export const AnimeDetailModal: React.FC<AnimeDetailModalProps> = ({
  anime,
  preferRussian,
  onClose,
  onToggleEpisodeWatch,
  onPlayEpisode,
  onContinueWatching,
  onShowInFolder,
  onOpenRemap,
}) => {
  if (!anime) return null;

  const displayTitle = preferRussian && anime.titleRussian
    ? anime.titleRussian
    : anime.titleRomaji;

  const secondaryTitle = preferRussian && anime.titleRussian
    ? anime.titleRomaji
    : anime.titleRussian || anime.titleEnglish;

  const nextEp = anime.nextEpisodeToWatch;
  const totalEpCount = anime.totalEpisodes || anime.totalLocalEpisodes;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col glass-panel rounded-[14px] overflow-hidden shadow-lg border border-[rgba(255,255,255,0.12)] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 btn-icon bg-[#121212]/80 text-[#888888] hover:text-white"
        >
          <X size={16} />
        </button>

        {/* Hero Header Banner */}
        <div className="relative h-48 sm:h-60 w-full overflow-hidden bg-[#161616]">
          {anime.bannerImage ? (
            <img
              src={anime.bannerImage}
              alt={displayTitle}
              className="w-full h-full object-cover opacity-40 filter blur-[1px]"
            />
          ) : anime.coverImage ? (
            <img
              src={anime.coverImage}
              alt={displayTitle}
              className="w-full h-full object-cover opacity-25 filter blur-[2px]"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/70 to-transparent" />

          {/* Banner Meta Info */}
          <div className="absolute bottom-4 left-6 right-6 flex items-end gap-5">
            {/* Poster Thumbnail */}
            <div className="w-24 sm:w-28 aspect-[2/3] rounded-[8px] overflow-hidden border border-[rgba(255,255,255,0.12)] bg-[#1c1c1c] shrink-0 shadow-lg hidden xs:block">
              {anime.coverImage && (
                <img
                  src={anime.coverImage}
                  alt={displayTitle}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {anime.airingStatus === 'RELEASING' && (
                  <span className="badge-pill badge-active">
                    Онгоинг {anime.nextAiringEpisode && `(EP ${anime.nextAiringEpisode.episode} ${formatCountdown(anime.nextAiringEpisode.timeUntilAiring)})`}
                  </span>
                )}
                {anime.isCompleted && (
                  <span className="badge-pill bg-[rgba(255,255,255,0.06)] text-[#888888]">
                    Завершено
                  </span>
                )}
                {anime.score && (
                  <span className="badge-pill text-[#E0E0E0] flex items-center gap-1">
                    <Star size={11} fill="currentColor" />
                    <span>{anime.score}</span>
                  </span>
                )}
                {anime.studios && anime.studios.length > 0 && (
                  <span className="badge-pill">
                    {anime.studios.join(', ')}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight line-clamp-1">
                {displayTitle}
              </h1>

              {secondaryTitle && (
                <p className="text-xs text-[#888888] font-sans line-clamp-1">
                  {secondaryTitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-3 border-y border-[rgba(255,255,255,0.08)] bg-[#161616]/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {nextEp ? (
              <button
                onClick={() => onContinueWatching(anime)}
                className="btn-primary py-2 px-4 text-xs"
              >
                <Play size={13} fill="currentColor" />
                <span>Continue: Episode {nextEp.episodeNumber}</span>
              </button>
            ) : (
              <div className="px-3 py-1.5 rounded-[6px] bg-[#1c1c1c] border border-[rgba(255,255,255,0.08)] text-xs text-[#888888] flex items-center gap-1.5 font-mono">
                <Check size={13} />
                <span>All Episodes Watched</span>
              </div>
            )}

            <button
              onClick={() => onShowInFolder(anime.folderPath)}
              className="btn-secondary py-2 px-3 text-xs"
              title="Open folder in File Explorer"
            >
              <Folder size={13} />
              <span>Show Folder</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenRemap(anime)}
              className="btn-secondary py-2 px-3 text-xs"
              title="Search and rematch metadata"
            >
              <Edit3 size={13} />
              <span>Remap Metadata</span>
            </button>

            {anime.aniListId && (
              <a
                href={`https://anilist.co/anime/${anime.aniListId}`}
                target="_blank"
                rel="noreferrer"
                className="btn-icon text-[#888888] hover:text-white"
                title="View on AniList"
              >
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>

        {/* Modal Body: Details + Episode List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Progress overview */}
          <div className="glass-panel p-4 rounded-[10px] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#888888]">Watch Progress</span>
              <span className="font-mono text-white">
                {anime.watchedCount} / {totalEpCount} ({anime.progressPercent}%)
              </span>
            </div>
            {/* Flat progress bar */}
            <div className="w-full h-1 bg-[rgba(255,255,255,0.08)] rounded-[2px] overflow-hidden">
              <div
                className="h-full bg-white transition-all"
                style={{ width: `${anime.progressPercent}%` }}
              />
            </div>
          </div>

          {/* Synopsis */}
          {(anime.synopsisRussian || anime.synopsis) && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
                Synopsis
              </div>
              <p className="text-xs text-[#E0E0E0] leading-relaxed">
                {preferRussian && anime.synopsisRussian
                  ? anime.synopsisRussian
                  : anime.synopsis || anime.synopsisRussian}
              </p>
            </div>
          )}

          {/* Episode List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#888888]">
              <span>Episodes ({anime.episodes.length} files)</span>
              <span className="font-mono text-[11px] text-[#888888]">Status / Size</span>
            </div>

            <div className="divide-y divide-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] rounded-[10px] bg-[#161616]/40 overflow-hidden">
              {anime.episodes.length === 0 ? (
                <div className="p-4 text-xs text-[#888888] text-center font-mono">
                  No video files discovered in this folder.
                </div>
              ) : (
                anime.episodes.map((ep) => (
                  <div
                    key={ep.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-[#1c1c1c]/60 transition-colors group"
                  >
                    {/* Checkbox & Episode Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        onClick={() => onToggleEpisodeWatch(anime.id, ep.id)}
                        className="text-[#888888] hover:text-white transition-colors"
                        title={ep.isWatched ? 'Mark unwatched' : 'Mark watched'}
                      >
                        {ep.isWatched ? (
                          <CheckSquare size={16} className="text-white" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>

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

                    {/* Metadata & Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-[11px] text-[#888888]">
                        {formatBytes(ep.fileSize)}
                      </span>

                      {ep.fileMissing && (
                        <span className="text-[10px] font-mono text-[#E0E0E0] flex items-center gap-1" title="File not found on disk">
                          <AlertTriangle size={11} />
                        </span>
                      )}

                      {/* Play Button */}
                      <button
                        onClick={() => onPlayEpisode(ep)}
                        disabled={ep.fileMissing}
                        className="btn-icon w-7 h-7 text-[#888888] hover:text-white"
                        title="Play in external player"
                      >
                        <Play size={12} fill="currentColor" />
                      </button>

                      {/* Show File in Explorer */}
                      <button
                        onClick={() => onShowInFolder(ep.filePath)}
                        className="btn-icon w-7 h-7 text-[#888888] hover:text-white"
                        title="Show file in Explorer"
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
  );
};
