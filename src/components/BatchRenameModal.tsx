import React, { useState, useMemo } from 'react';
import { X, FileText, Check, AlertCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import type { AnimeWithEpisodes, UILanguage, RenameOperation } from '../types/index.ts';
import { useI18n } from '../i18n/translations.ts';
import { parseAnimeFileName } from '../services/parser.ts';

interface BatchRenameModalProps {
  anime: AnimeWithEpisodes | null;
  uiLanguage: UILanguage;
  preferRussian: boolean;
  onClose: () => void;
  onRenamed: (animeId: string, updatedEpisodes: { id: string; fileName: string; filePath: string; episodeNumber?: number }[]) => void;
}

type NamingPreset = 'standard' | 'season' | 'russian' | 'simple';
type TitleSource = 'russian' | 'romaji' | 'folder';

export const BatchRenameModal: React.FC<BatchRenameModalProps> = ({
  anime,
  uiLanguage,
  preferRussian,
  onClose,
  onRenamed,
}) => {
  if (!anime) return null;

  const { t } = useI18n(uiLanguage);
  const [preset, setPreset] = useState<NamingPreset>('standard');
  const [titleSource, setTitleSource] = useState<TitleSource>(
    anime.titleRussian ? 'russian' : 'romaji'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Determine base title to use
  const folderName = anime.folderPath.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || anime.titleRomaji;
  const baseTitle = useMemo(() => {
    let raw = '';
    if (titleSource === 'russian' && anime.titleRussian) raw = anime.titleRussian;
    else if (titleSource === 'romaji') raw = anime.titleRomaji;
    else raw = folderName;

    // Sanitize Windows prohibited characters: < > : " / \ | ? *
    return raw.replace(/[<>:"/\\|?*]/g, '').trim();
  }, [titleSource, anime.titleRussian, anime.titleRomaji, folderName]);

  // Compute preview for all episodes
  const renameOperations = useMemo((): { epId: string; oldPath: string; oldName: string; newName: string; willChange: boolean; newEpNum: number }[] => {
    const usedNames = new Map<string, number>();

    const allWereOne = anime.episodes.length > 1 && anime.episodes.every((e) => e.episodeNumber === 1);
    const sortedEps = [...anime.episodes].sort((a, b) => {
      if (allWereOne) {
        return a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' });
      }
      return a.episodeNumber - b.episodeNumber;
    });

    return sortedEps.map((ep, idx) => {
      const extIndex = ep.fileName.lastIndexOf('.');
      const ext = extIndex !== -1 ? ep.fileName.substring(extIndex) : '';

      // Determine accurate episode number
      let resolvedEp = ep.episodeNumber;
      if (allWereOne) {
        const parsed = parseAnimeFileName(ep.fileName, folderName);
        resolvedEp = parsed.episode !== undefined ? parsed.episode : (idx + 1);
      }

      const epNum = String(resolvedEp).padStart(2, '0');
      const seasonNum = String(ep.seasonNumber || 1).padStart(2, '0');

      let rawBase = '';
      if (preset === 'standard') {
        rawBase = `${baseTitle} - ${epNum}`;
      } else if (preset === 'season') {
        rawBase = `${baseTitle} - S${seasonNum}E${epNum}`;
      } else if (preset === 'russian') {
        rawBase = `${baseTitle} - Серия ${epNum}`;
      } else if (preset === 'simple') {
        rawBase = `Эпизод ${epNum}`;
      }

      // Disambiguate duplicate episode numbers within the same anime
      const key = `${rawBase.toLowerCase()}${ext.toLowerCase()}`;
      const count = usedNames.get(key) || 0;
      usedNames.set(key, count + 1);

      const suffix = count > 0 ? ` (${count + 1})` : '';
      const newName = `${rawBase}${suffix}${ext}`;

      return {
        epId: ep.id,
        newEpNum: resolvedEp,
        oldPath: ep.filePath,
        oldName: ep.fileName,
        newName,
        willChange: ep.fileName !== newName,
      };
    });
  }, [anime.episodes, baseTitle, preset, folderName]);

  const changesCount = renameOperations.filter((o) => o.willChange).length;

  const handleApply = async () => {
    if (changesCount === 0) {
      onClose();
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const electron = (window as any).electronAPI;
    if (!electron?.renameFiles) {
      setErrorMessage('Операция доступна только в приложении Electron.');
      setIsProcessing(false);
      return;
    }

    try {
      const opsToRun: RenameOperation[] = renameOperations
        .filter((o) => o.willChange)
        .map((o) => ({
          oldPath: o.oldPath,
          newName: o.newName,
          episodeId: o.epId,
          animeId: anime.id,
        }));

      const results = await electron.renameFiles(opsToRun);
      const failures = results.filter((r: any) => !r.success);

      if (failures.length > 0) {
        setErrorMessage(failures[0].error || t('renameErrorToast'));
        setIsProcessing(false);
        return;
      }

      // Map new file paths
      const updatedMap = new Map<string, string>();
      for (const r of results) {
        if (r.success) updatedMap.set(r.oldPath, r.newPath);
      }

      const updatedEpisodes = anime.episodes.map((ep) => {
        const op = renameOperations.find((o) => o.epId === ep.id);
        const newPath = updatedMap.get(ep.filePath);
        const finalEpNum = op?.newEpNum ?? ep.episodeNumber;
        if (newPath) {
          const newFileName = newPath.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || ep.fileName;
          return { id: ep.id, fileName: newFileName, filePath: newPath, episodeNumber: finalEpNum };
        }
        return { id: ep.id, fileName: ep.fileName, filePath: ep.filePath, episodeNumber: finalEpNum };
      });

      onRenamed(anime.id, updatedEpisodes);
      onClose();
    } catch (err) {
      setErrorMessage((err as Error).message || t('renameErrorToast'));
      setIsProcessing(false);
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
            <FileText size={16} className="text-[#DF8DC6]" />
            <h2 className="text-sm font-semibold text-white tracking-tight">
              {t('batchRenameTitle')}
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

        {/* Options Bar */}
        <div className="p-5 border-b border-white/5 bg-[#121212]/50 space-y-4">
          <div className="text-xs text-[#888888]">
            {t('batchRenameDesc')}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title Source Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#888888]">{t('titleSourceLabel')}</label>
              <div className="flex items-center p-0.5 rounded-[8px] bg-[#181818] border border-white/10">
                {anime.titleRussian && (
                  <button
                    type="button"
                    onClick={() => setTitleSource('russian')}
                    className={`flex-1 px-2.5 py-1 text-xs rounded-[6px] transition-all truncate font-medium ${
                      titleSource === 'russian'
                        ? 'bg-white text-black font-semibold'
                        : 'text-[#888888] hover:text-[#E0E0E0]'
                    }`}
                  >
                    {t('titleSourceRussian')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setTitleSource('romaji')}
                  className={`flex-1 px-2.5 py-1 text-xs rounded-[6px] transition-all truncate font-medium ${
                    titleSource === 'romaji'
                      ? 'bg-white text-black font-semibold'
                      : 'text-[#888888] hover:text-[#E0E0E0]'
                  }`}
                >
                  {t('titleSourceRomaji')}
                </button>
                <button
                  type="button"
                  onClick={() => setTitleSource('folder')}
                  className={`flex-1 px-2.5 py-1 text-xs rounded-[6px] transition-all truncate font-medium ${
                    titleSource === 'folder'
                      ? 'bg-white text-black font-semibold'
                      : 'text-[#888888] hover:text-[#E0E0E0]'
                  }`}
                >
                  {t('titleSourceFolder')}
                </button>
              </div>
            </div>

            {/* Template Preset Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#888888]">{t('templatePresetLabel')}</label>
              <div className="flex items-center p-0.5 rounded-[8px] bg-[#181818] border border-white/10">
                {(['standard', 'season', 'russian', 'simple'] as const).map((p) => {
                  const isSelected = preset === p;
                  const label =
                    p === 'standard'
                      ? '01'
                      : p === 'season'
                      ? 'S01E01'
                      : p === 'russian'
                      ? 'Серия 01'
                      : 'Эп. 01';

                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPreset(p)}
                      className={`flex-1 px-2 py-1 text-xs rounded-[6px] transition-all font-medium ${
                        isSelected
                          ? 'bg-white text-black font-semibold'
                          : 'text-[#888888] hover:text-[#E0E0E0]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-[8px] bg-red-950/40 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Diff Preview Table */}
        <div className="flex-1 overflow-y-auto p-5 min-h-[220px] space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#888888] px-2 font-mono uppercase tracking-wider pb-1">
            <span>{t('previewOriginal')}</span>
            <span>{t('previewNew')}</span>
          </div>

          <div className="divide-y divide-white/5 border border-white/5 rounded-[10px] bg-[#161616]/40 overflow-hidden font-mono text-xs">
            {renameOperations.map((op) => (
              <div
                key={op.epId}
                className="p-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-[#888888] truncate max-w-[45%]" title={op.oldName}>
                  {op.oldName}
                </span>

                <ArrowRight size={13} className="text-[#666666] shrink-0" />

                <span
                  className={`truncate max-w-[48%] text-right font-medium ${
                    op.willChange ? 'text-white' : 'text-[#888888]'
                  }`}
                  title={op.newName}
                >
                  {op.newName}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between bg-[#181818]/80">
          <div className="text-xs text-[#888888] font-mono">
            {changesCount} {t('totalFiles')}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary py-1.5 px-4 text-xs font-semibold"
            >
              Отмена
            </button>

            <button
              type="button"
              disabled={isProcessing || changesCount === 0}
              onClick={handleApply}
              className="btn-primary py-1.5 px-4 text-xs font-semibold gap-1.5"
            >
              {isProcessing ? (
                <Loader2 size={13} className="animate-spin shrink-0" />
              ) : (
                <Check size={13} className="shrink-0" />
              )}
              <span>{t('btnApplyRename')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
