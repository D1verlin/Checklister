import React, { useState, useEffect } from 'react';
import { Search, X, Check, Loader2, Link2, Film, HardDrive, Globe } from 'lucide-react';
import type { AnimeWithEpisodes, UILanguage } from '../types/index.ts';
import { searchAnimeCandidates, type MetadataProvider, type AnimeCandidate } from '../services/metadata.ts';
import { useI18n } from '../i18n/translations.ts';

interface RemapModalProps {
  anime: AnimeWithEpisodes | null;
  uiLanguage: UILanguage;
  preferRussian: boolean;
  onClose: () => void;
  onApplyRemap: (animeId: string, candidate: AnimeCandidate) => void;
}

export const RemapModal: React.FC<RemapModalProps> = ({
  anime,
  uiLanguage,
  preferRussian,
  onClose,
  onApplyRemap,
}) => {
  if (!anime) return null;

  const { t } = useI18n(uiLanguage);
  const initialSearch = ((preferRussian || uiLanguage === 'ru') && anime.titleRussian)
    ? anime.titleRussian
    : anime.titleRomaji;

  const [query, setQuery] = useState(initialSearch);
  const [provider, setProvider] = useState<MetadataProvider>('all');
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<AnimeCandidate[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = async (searchTerm: string, activeProvider: MetadataProvider = provider) => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const results = await searchAnimeCandidates(searchTerm.trim(), activeProvider);
      setCandidates(results);
    } catch (err) {
      console.error('Candidate search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-search candidate titles upon opening the modal
  useEffect(() => {
    const term = ((preferRussian || uiLanguage === 'ru') && anime.titleRussian)
      ? anime.titleRussian
      : anime.titleRomaji;
    setQuery(term);
    performSearch(term, provider);
  }, [anime.id]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query, provider);
  };

  const handleProviderChange = (newProvider: MetadataProvider) => {
    setProvider(newProvider);
    if (query.trim()) {
      performSearch(query, newProvider);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#141414] rounded-[14px] overflow-hidden shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#181818]/60">
          <div className="flex items-center gap-2.5">
            <Link2 size={16} className="text-[#DF8DC6]" />
            <h2 className="text-sm font-semibold text-white tracking-tight">
              {t('remapTitle')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[#888888] hover:text-white hover:bg-white/5 transition-colors"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Current Info & Search Form */}
        <div className="p-5 border-b border-white/5 bg-[#121212]/50 space-y-3.5">
          <div className="flex items-center gap-2 text-xs text-[#888888] bg-[#181818] px-3 py-1.5 rounded-[6px] border border-white/5">
            <HardDrive size={13} className="shrink-0 text-[#888888]" />
            <span className="shrink-0">{t('currentFolderLabel')}</span>
            <span className="font-mono text-[#E0E0E0] truncate" title={anime.folderPath}>
              {anime.folderPath}
            </span>
          </div>

          <form onSubmit={handleFormSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888] pointer-events-none"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('remapSearchPlaceholder')}
                className="input-dark w-full !pl-10 !pr-9 !py-2 text-xs bg-[#181818] rounded-[8px] border-white/10 focus:border-white transition-all font-sans"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] hover:text-white"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="btn-primary py-2 px-4 text-xs font-semibold gap-1.5 shadow-none shrink-0"
            >
              {loading ? (
                <Loader2 size={13} className="animate-spin shrink-0" />
              ) : (
                <Search size={13} className="shrink-0" />
              )}
              <span>{t('btnSearch')}</span>
            </button>
          </form>

          {/* Provider Selection (Dark Monolith Segmented Tabs) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-[#888888]">
              <Globe size={13} className="shrink-0 text-[#888888]" />
              <span>{t('providerLabel')}</span>
            </div>

            <div className="inline-flex items-center p-0.5 rounded-[8px] bg-[#181818] border border-white/10 self-start sm:self-auto">
              {(['all', 'shikimori', 'anilist'] as const).map((prov) => {
                const isSelected = provider === prov;
                const label =
                  prov === 'all'
                    ? t('providerAll')
                    : prov === 'shikimori'
                    ? t('providerShikimori')
                    : t('providerAniList');

                return (
                  <button
                    key={prov}
                    type="button"
                    onClick={() => handleProviderChange(prov)}
                    className={`px-3 py-1 text-xs rounded-[6px] transition-all font-medium ${
                      isSelected
                        ? 'bg-white text-black font-semibold shadow-sm'
                        : 'text-[#888888] hover:text-[#E0E0E0] hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5 min-h-[220px]">
          {loading ? (
            <div className="py-14 flex flex-col items-center justify-center text-[#888888] gap-3">
              <Loader2 size={22} className="animate-spin text-white opacity-80" />
              <span className="text-xs font-mono">{t('searchingExternal')}</span>
            </div>
          ) : candidates.length > 0 ? (
            <div className="divide-y divide-white/5 border border-white/5 rounded-[10px] bg-[#161616]/40 overflow-hidden">
              {candidates.map((item) => {
                const showRussianPrimary = (preferRussian || uiLanguage === 'ru') && Boolean(item.titleRussian);
                const primaryTitle = showRussianPrimary
                  ? item.titleRussian
                  : item.titleRomaji;

                const secondaryTitle = showRussianPrimary
                  ? item.titleRomaji
                  : item.titleRussian || item.titleEnglish;

                const statusLabel =
                  item.status === 'RELEASING'
                    ? t('statusAiring')
                    : item.status === 'FINISHED'
                    ? t('statusCompleted')
                    : item.status;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 flex items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Vertical Poster Thumbnail */}
                      <div className="w-12 aspect-[2/3] rounded-[6px] bg-[#1a1a1a] overflow-hidden shrink-0 border border-white/10 shadow-sm relative">
                        {item.coverImage ? (
                          <img
                            src={item.coverImage}
                            alt={primaryTitle}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#666666]">
                            <Film size={16} />
                          </div>
                        )}
                      </div>

                      {/* Title & Metadata */}
                      <div className="min-w-0 space-y-1">
                        <div className="text-xs font-semibold text-white truncate">
                          {primaryTitle}
                        </div>
                        {secondaryTitle && (
                          <div className="text-[11px] text-[#888888] truncate font-sans">
                            {secondaryTitle}
                          </div>
                        )}
                        <div className="flex items-center flex-wrap gap-1.5 text-[10px] font-mono text-[#888888] pt-0.5">
                          {/* Provider Badge */}
                          <span className="px-1.5 py-0.5 rounded-[4px] bg-white/5 text-[#CCCCCC] border border-white/10">
                            {item.source === 'shikimori' ? 'Shikimori' : 'AniList'}
                          </span>

                          <span className="px-1.5 py-0.5 rounded-[4px] bg-white/5 text-[#CCCCCC] border border-white/10">
                            {item.episodes
                              ? uiLanguage === 'ru'
                                ? `${item.episodes} эп.`
                                : `${item.episodes} eps`
                              : uiLanguage === 'ru'
                              ? 'Эпизоды неизвестны'
                              : 'Unknown eps'}
                          </span>

                          {item.score && (
                            <span className="px-1.5 py-0.5 rounded-[4px] bg-white/5 text-[#CCCCCC] border border-white/10">
                              {item.score.toFixed(1)}
                            </span>
                          )}

                          {statusLabel && (
                            <span className="px-1.5 py-0.5 rounded-[4px] bg-white/5 text-[#888888] border border-white/10">
                              {statusLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Apply Button */}
                    <button
                      type="button"
                      onClick={() => onApplyRemap(anime.id, item)}
                      className="btn-secondary py-1.5 px-3 text-xs font-semibold gap-1.5 border-white/10 hover:border-white/20 hover:text-white shrink-0"
                    >
                      <Check size={12} className="text-white shrink-0" />
                      <span>{t('btnApply')}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : hasSearched ? (
            <div className="py-14 text-center text-xs text-[#888888] font-mono">
              {t('noCandidatesFound')}
            </div>
          ) : (
            <div className="py-14 text-center text-xs text-[#888888] font-mono">
              {t('initialCandidateHint')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
