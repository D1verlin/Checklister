import React, { useState, useEffect } from 'react';
import {
  Play,
  Check,
  Folder,
  Star,
  Film,
  Trash2,
  FileText,
  FolderPlus,
  AlertTriangle,
  HardDrive,
} from 'lucide-react';
import type { AnimeWithEpisodes, Episode, UILanguage } from '../types/index.ts';
import { useI18n } from '../i18n/translations.ts';
import { CustomCheckbox } from '../components/common/CustomCheckbox.tsx';
import { formatBytes } from '../services/scanner.ts';
import { BatchRenameModal } from '../components/BatchRenameModal.tsx';
import { UserFoldersModal } from '../components/UserFoldersModal.tsx';

interface AnimeDetailViewProps {
  anime: AnimeWithEpisodes;
  preferRussian: boolean;
  uiLanguage: UILanguage;
  allFolders?: string[];
  onToggleEpisodeWatch: (animeId: string, episodeId: string) => void;
  onPlayEpisode: (episode: Episode) => void;
  onContinueWatching: (anime: AnimeWithEpisodes) => void;
  onShowInFolder: (filePath: string) => void;
  onDeleteAnime?: (animeId: string) => void;
  onUpdateAnimeFolders?: (animeId: string, folders: string[]) => void;
  onCreateFolder?: (name: string) => void;
  onDeleteFolder?: (name: string) => void;
  onRenamedEpisodes?: (animeId: string, updatedEpisodes: { id: string; fileName: string; filePath: string }[]) => void;
}

function formatCountdown(seconds?: number): string {
  if (!seconds || seconds <= 0) return '';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `in ${days}d ${hours}h`;
  return `in ${hours}h`;
}

function formatSeconds(sec?: number): string {
  if (!sec || sec <= 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const pendingDetailCoverDownloads = new Set<string>();

export const AnimeDetailView: React.FC<AnimeDetailViewProps> = ({
  anime,
  preferRussian,
  uiLanguage,
  allFolders = [],
  onToggleEpisodeWatch,
  onPlayEpisode,
  onContinueWatching,
  onShowInFolder,
  onDeleteAnime,
  onUpdateAnimeFolders,
  onCreateFolder,
  onDeleteFolder,
  onRenamedEpisodes,
}) => {
  const { t } = useI18n(uiLanguage);
  const initialSrc = anime.localCover || anime.coverImage || anime.shikimoriCoverImage;
  const [currentCoverSrc, setCurrentCoverSrc] = useState<string | undefined>(initialSrc);
  const [coverError, setCoverError] = useState(false);
  const [coverLoading, setCoverLoading] = useState(
    initialSrc ? !initialSrc.startsWith('checklister-media://') : false
  );
  const [bannerError, setBannerError] = useState(false);
  const [showBatchRename, setShowBatchRename] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);

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

  const inProgressEp = anime.episodes.find(
    (e) => !e.isWatched && e.playbackProgress && e.playbackProgress.timePos > 0
  );
  const nextEp = inProgressEp || anime.nextEpisodeToWatch || anime.episodes.find((e) => !e.isWatched);
  const totalEpCount = Math.max(anime.totalEpisodes || 0, anime.totalLocalEpisodes);
  const hasMissingGaps = anime.missingEpisodeNumbers && anime.missingEpisodeNumbers.length > 0;

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
          <div className="w-full md:w-60 shrink-0 flex flex-col items-center md:items-start gap-3.5">
            {/* 2:3 Vertical Poster */}
            <div className="w-48 md:w-full aspect-[2/3] rounded-[14px] overflow-hidden bg-[#181818] border border-white/10 shadow-xl relative">
              {/* Shimmer Skeleton */}
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

            {/* Quick Play Button with Integrated Progress Bar */}
            {nextEp ? (
              <button
                onClick={() => onContinueWatching(anime)}
                className="relative overflow-hidden btn-primary w-full py-2.5 text-xs font-semibold shadow-none flex items-center justify-center gap-1.5"
              >
                {/* Progress bar background fill inside button */}
                {nextEp.playbackProgress && nextEp.playbackProgress.timePos > 0 && (
                  <>
                    <div
                      className="absolute inset-y-0 left-0 bg-black/[0.12] transition-all duration-300 pointer-events-none"
                      style={{
                        width: `${Math.min(
                          100,
                          nextEp.playbackProgress.percent ||
                            (nextEp.playbackProgress.duration
                              ? Math.round(
                                  (nextEp.playbackProgress.timePos / nextEp.playbackProgress.duration) * 100
                                )
                              : 0)
                        )}%`,
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-black/15 pointer-events-none">
                      <div
                        className="h-full bg-black/60 transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            nextEp.playbackProgress.percent ||
                              (nextEp.playbackProgress.duration
                                ? Math.round(
                                    (nextEp.playbackProgress.timePos / nextEp.playbackProgress.duration) * 100
                                  )
                                : 0)
                          )}%`,
                        }}
                      />
                    </div>
                  </>
                )}

                <Play size={13} fill="currentColor" className="shrink-0 relative z-10" />
                <span className="truncate relative z-10 flex items-center gap-1.5">
                  <span className="font-mono font-semibold">EP {String(nextEp.episodeNumber).padStart(2, '0')}</span>
                  {nextEp.playbackProgress && nextEp.playbackProgress.timePos > 0 && (
                    <span className="font-mono opacity-80">
                      • {formatSeconds(nextEp.playbackProgress.timePos)}
                      {nextEp.playbackProgress.duration > 0
                        ? ` / ${formatSeconds(nextEp.playbackProgress.duration)}`
                        : ''}
                    </span>
                  )}
                </span>
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

            {/* Batch Renamer Button */}
            <button
              onClick={() => setShowBatchRename(true)}
              className="btn-secondary w-full py-2 text-xs gap-2 border-white/10 text-[#CCCCCC] hover:text-white"
            >
              <FileText size={14} />
              <span>{t('btnBatchRename')}</span>
            </button>

            {/* Assign User Folders Button */}
            <button
              onClick={() => setShowFolderModal(true)}
              className="btn-secondary w-full py-2 text-xs gap-2 border-white/10 text-[#CCCCCC] hover:text-white"
            >
              <FolderPlus size={14} />
              <span>{t('addToFolder')}</span>
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

              {/* Disk Size on Disk */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[#888888]">{t('diskUsageLabel')}</span>
                <span className="font-mono text-white font-medium">
                  {formatBytes(anime.totalSizeBytes)}
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
                {anime.isCompleted && (
                  <span className="badge-pill bg-white/5 text-[#888888]">
                    {t('statusCompleted')}
                  </span>
                )}

                {/* User Folder Badges */}
                {anime.userFolders && anime.userFolders.map((uf) => (
                  <span key={uf} className="badge-pill bg-white/10 text-white font-medium border border-white/15">
                    {uf}
                  </span>
                ))}

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

            {/* Gap Warning Banner */}
            {hasMissingGaps && (
              <div className="p-3 px-4 rounded-[10px] bg-amber-950/30 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-3 font-mono">
                <AlertTriangle size={16} className="shrink-0 text-amber-400" />
                <div>
                  <span className="font-semibold">{t('missingEpisodesBanner')} </span>
                  <span className="text-white font-bold">
                    {anime.missingEpisodeNumbers?.map((n) => `Серия ${n}`).join(', ')}
                  </span>
                </div>
              </div>
            )}

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
                <span>{t('episodesHeader')} ({anime.episodes.length} {t('totalFiles')} • {formatBytes(anime.totalSizeBytes)})</span>
                <span className="font-mono text-[11px] text-[#888888]">{t('tableStatusSize')}</span>
              </div>

              <div className="divide-y divide-white/5 border border-white/5 rounded-[12px] bg-[#161616]/40 overflow-hidden">
                {anime.episodes.length === 0 ? (
                  <div className="p-8 text-xs text-[#888888] text-center font-mono">
                    {t('noEpisodesDiscovered')}
                  </div>
                ) : (
                  anime.episodes.map((ep, idx) => {
                    const prevEp = idx > 0 ? anime.episodes[idx - 1] : null;
                    const isGap = prevEp && ep.episodeNumber - prevEp.episodeNumber > 1;

                    return (
                      <React.Fragment key={ep.id}>
                        {isGap && (
                          <div className="p-2 px-4 bg-amber-950/20 border-y border-amber-500/10 text-amber-400 text-[11px] font-mono flex items-center gap-2">
                            <AlertTriangle size={12} />
                            <span>
                              {t('gapBetweenEpisodes')}: {Array.from(
                                { length: ep.episodeNumber - prevEp.episodeNumber - 1 },
                                (_, i) => prevEp.episodeNumber + i + 1
                              ).join(', ')}
                            </span>
                          </div>
                        )}

                        <div className="relative p-3 px-4 flex items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors">
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

                            {/* Subtle progress indicator when partially watched */}
                            {!ep.isWatched && ep.playbackProgress && ep.playbackProgress.percent > 0 && (
                              <span className="font-mono text-[10px] text-[#888888] bg-white/[0.04] border border-white/10 rounded px-1.5 py-0.5 shrink-0">
                                {formatSeconds(ep.playbackProgress.timePos)} / {formatSeconds(ep.playbackProgress.duration)}
                              </span>
                            )}
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

                          {/* Subtle progress bar at bottom of row */}
                          {!ep.isWatched && ep.playbackProgress && ep.playbackProgress.percent > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5 pointer-events-none">
                              <div
                                className="h-full bg-white/30"
                                style={{ width: `${Math.min(100, ep.playbackProgress.percent)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Batch Rename Modal */}
      {showBatchRename && (
        <BatchRenameModal
          anime={anime}
          uiLanguage={uiLanguage}
          preferRussian={preferRussian}
          onClose={() => setShowBatchRename(false)}
          onRenamed={(animeId, updated) => {
            onRenamedEpisodes?.(animeId, updated);
          }}
        />
      )}

      {/* User Folders Modal */}
      {showFolderModal && (
        <UserFoldersModal
          anime={anime}
          allFolders={allFolders}
          uiLanguage={uiLanguage}
          onClose={() => setShowFolderModal(false)}
          onUpdateAnimeFolders={(animeId, folders) => {
            onUpdateAnimeFolders?.(animeId, folders);
          }}
          onCreateFolder={(name) => {
            onCreateFolder?.(name);
          }}
          onDeleteFolder={(name) => {
            onDeleteFolder?.(name);
          }}
        />
      )}
    </div>
  );
};
