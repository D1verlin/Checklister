import React, { useState } from 'react';
import { X, FolderPlus, Check, Folder, Plus, Trash2 } from 'lucide-react';
import type { AnimeWithEpisodes, UILanguage } from '../types/index.ts';
import { useI18n } from '../i18n/translations.ts';

interface UserFoldersModalProps {
  anime: AnimeWithEpisodes;
  allFolders: string[];
  uiLanguage: UILanguage;
  onClose: () => void;
  onUpdateAnimeFolders: (animeId: string, folders: string[]) => void;
  onCreateFolder: (folderName: string) => void;
  onDeleteFolder: (folderName: string) => void;
}

export const UserFoldersModal: React.FC<UserFoldersModalProps> = ({
  anime,
  allFolders,
  uiLanguage,
  onClose,
  onUpdateAnimeFolders,
  onCreateFolder,
  onDeleteFolder,
}) => {
  const { t } = useI18n(uiLanguage);
  const [selectedFolders, setSelectedFolders] = useState<string[]>(anime.userFolders || []);
  const [newFolderName, setNewFolderName] = useState('');

  const handleToggle = (folder: string) => {
    const next = selectedFolders.includes(folder)
      ? selectedFolders.filter((f) => f !== folder)
      : [...selectedFolders, folder];
    setSelectedFolders(next);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newFolderName.trim().slice(0, 12);
    if (!clean || allFolders.includes(clean)) return;
    onCreateFolder(clean);
    setSelectedFolders((prev) => [...prev, clean]);
    setNewFolderName('');
  };

  const handleSave = () => {
    onUpdateAnimeFolders(anime.id, selectedFolders);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div
        className="relative w-full max-w-md flex flex-col bg-[#141414] rounded-[14px] overflow-hidden shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#181818]/60">
          <div className="flex items-center gap-2.5">
            <Folder size={16} className="text-[#DF8DC6]" />
            <h2 className="text-sm font-semibold text-white tracking-tight">
              {t('addToFolder')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[#888888] hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-[#888888]">
            {t('selectFolderHint')}
          </p>

          {/* Folder List */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {allFolders.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#888888]">
                {t('noFoldersConfigured')}
              </div>
            ) : (
              allFolders.map((folder) => {
                const isChecked = selectedFolders.includes(folder);
                return (
                  <div
                    key={folder}
                    onClick={() => handleToggle(folder)}
                    className={`p-2.5 rounded-[8px] border transition-all cursor-pointer flex items-center justify-between ${
                      isChecked
                        ? 'bg-white/10 border-white/25 text-white'
                        : 'bg-[#181818] border-white/5 text-[#888888] hover:text-white hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Folder size={14} className={isChecked ? 'text-white' : 'text-[#888888]'} />
                      <span className="text-xs font-medium truncate">{folder}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${
                          isChecked ? 'bg-white border-white text-black' : 'border-white/20'
                        }`}
                      >
                        {isChecked && <Check size={11} strokeWidth={3} />}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFolder(folder);
                          setSelectedFolders((prev) => prev.filter((f) => f !== folder));
                        }}
                        className="text-[#666666] hover:text-red-400 p-0.5 rounded transition-colors"
                        title="Удалить папку"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Create New Folder Inline */}
          <form onSubmit={handleCreate} className="flex gap-2 pt-2 border-t border-white/5">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value.slice(0, 12))}
              maxLength={12}
              placeholder={t('folderNamePlaceholder')}
              className="input-dark flex-1 text-xs py-1.5 px-3 bg-[#181818] rounded-[8px] border-white/10"
            />
            <button
              type="submit"
              disabled={!newFolderName.trim()}
              className="btn-secondary py-1.5 px-3 text-xs font-medium gap-1 shrink-0"
            >
              <Plus size={13} />
              <span>{t('btnCreateFolder')}</span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/10 flex items-center justify-end gap-2 bg-[#181818]/60">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary py-1.5 px-3 text-xs font-semibold"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary py-1.5 px-4 text-xs font-semibold"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};
