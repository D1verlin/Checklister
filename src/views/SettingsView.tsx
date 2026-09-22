import React, { useState, useRef, useEffect } from 'react';
import {
  Folder,
  Trash2,
  Plus,
  HardDrive,
  Check,
  Languages,
  PlaySquare,
  Terminal,
  Save,
  RefreshCw,
  Info,
  ExternalLink,
  Download,
  Sparkles,
  Database,
  FolderPlus,
} from 'lucide-react';
import type { AppSettings, UILanguage } from '../types/index.ts';
import { useI18n } from '../i18n/translations.ts';
import { CustomCheckbox } from '../components/common/CustomCheckbox.tsx';
import { CustomSelect, SelectOption } from '../components/common/CustomSelect.tsx';
import {
  checkForAppUpdates,
  openExternalUrl,
  CURRENT_APP_VERSION,
  GITHUB_REPO_URL,
  type UpdateInfo,
} from '../services/updater.ts';
import CheckListerLogo from '../assets/CheckLister.svg';

interface SettingsViewProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  onBrowseFolder: () => Promise<string[]>;
  onScanNow?: (folders: string[]) => void;
  onRegisterActions?: (saveFn: () => void, scanFn: () => void) => void;
  onClearLibrary?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSave,
  onBrowseFolder,
  onScanNow,
  onRegisterActions,
  onClearLibrary,
}) => {
  const [form, setForm] = useState<AppSettings>({
    ...settings,
    customFolders: settings.customFolders || ['Шедевры', 'Посмотреть позже'],
    discordRpcEnabled: settings.discordRpcEnabled ?? true,
    autoTrackPlayback: settings.autoTrackPlayback ?? true,
  });
  const [manualFolder, setManualFolder] = useState('');
  const [newFolderInput, setNewFolderInput] = useState('');
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [toastText, setToastText] = useState('');
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [hasCheckedUpdates, setHasCheckedUpdates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { t } = useI18n(form.uiLanguage);

  const handleAddUserFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newFolderInput.trim().slice(0, 12);
    if (!clean || form.customFolders.includes(clean)) return;
    const updated = { ...form, customFolders: [...form.customFolders, clean] };
    setForm(updated);
    onSave(updated);
    setNewFolderInput('');
    triggerToast(t('folderCreated'));
  };

  const handleDeleteUserFolder = (folderName: string) => {
    const updated = {
      ...form,
      customFolders: form.customFolders.filter((f) => f !== folderName),
    };
    setForm(updated);
    onSave(updated);
    triggerToast(t('folderDeleted'));
  };

  const handleCheckUpdates = async () => {
    setIsCheckingUpdates(true);
    try {
      const info = await checkForAppUpdates();
      setUpdateInfo(info);
      setHasCheckedUpdates(true);
    } catch {
      setHasCheckedUpdates(true);
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const triggerToast = (msg: string) => {
    setToastText(msg);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  const languageOptions: SelectOption<UILanguage>[] = [
    { value: 'ru', label: 'Русский (Russian)', description: 'Интерфейс на русском языке' },
    { value: 'en', label: 'English (US)', description: 'English interface' },
  ];

  const playerOptions: SelectOption<'system' | 'custom'>[] = [
    {
      value: 'system',
      label: t('playerSystemDefault'),
      description: t('playerSystemDefaultDesc'),
    },
    {
      value: 'custom',
      label: t('playerCustom'),
      description: t('playerCustomDesc'),
    },
  ];

  const applyFolderAddition = (newFolders: string[]) => {
    const unique = Array.from(new Set([...form.scannedFolders, ...newFolders]));
    const updatedForm = { ...form, scannedFolders: unique };
    setForm(updatedForm);
    onSave(updatedForm);
    triggerToast('Папка сохранена. Запуск сканирования...');
    onScanNow?.(unique);
  };

  const handleAddManualFolder = () => {
    if (!manualFolder.trim()) return;
    applyFolderAddition([manualFolder.trim()]);
    setManualFolder('');
  };

  const handleBrowse = async () => {
    try {
      const folders = await onBrowseFolder();
      if (folders && folders.length > 0) {
        applyFolderAddition(folders);
        return;
      }
    } catch {
      // ignore
    }

    // Web fallback if Electron dialog is not used
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const firstFile = files[0];
      const relPath = firstFile.webkitRelativePath;
      const folderName = relPath ? relPath.split('/')[0] : 'SelectedFolder';
      const guessedPath = (firstFile as any).path
        ? (firstFile as any).path.replace(/[/\\][^/\\]+$/, '')
        : `D:\\Anime\\${folderName}`;

      applyFolderAddition([guessedPath]);
    }
  };

  const handleRemoveFolder = (folder: string) => {
    const updated = form.scannedFolders.filter((f) => f !== folder);
    const updatedForm = { ...form, scannedFolders: updated };
    setForm(updatedForm);
    onSave(updatedForm);
    triggerToast('Папка удалена из списка');
    if (updated.length === 0) {
      onClearLibrary?.();
    } else {
      onScanNow?.(updated);
    }
  };

  const handleSave = () => {
    onSave(form);
    triggerToast(t('settingsSavedToast'));

    const electron = (window as any).electronAPI;
    if (electron?.setDevTools) {
      electron.setDevTools(form.devMode);
    }
  };

  useEffect(() => {
    onRegisterActions?.(handleSave, () => {
      onScanNow?.(form.scannedFolders);
    });
  }, [form, onSave, onScanNow, onRegisterActions]);

  return (
    <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-12 pt-20 select-none bg-[#121212]">
      {/* Invisible directory input fallback for web mode */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        multiple
        className="hidden"
      />

      {/* Uniform Width Container for the entire Settings Page */}
      <div className="max-w-2xl mx-auto space-y-8 pb-20">
        {/* Header Title */}
        <div className="border-b border-white/10 pb-5">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gradient-brand">
            {t('settingsTitle')}
          </h1>
          <p className="text-xs text-[#888888] mt-1">
            {t('settingsSubtitle')}
          </p>
        </div>

        {/* Section 1: Anime Folders */}
        <div className="space-y-4 border-b border-white/5 pb-8 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Folder size={16} className="text-[#DF8DC6]" />
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {t('sectionFoldersTitle')}
                </h2>
                <p className="text-xs text-[#888888]">
                  {t('sectionFoldersDesc')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBrowse}
              className="btn-secondary py-1.5 px-3.5 text-xs gap-1.5 border-white/10 hover:border-white/20 shrink-0"
            >
              <Plus size={13} />
              <span>{t('btnBrowse')}</span>
            </button>
          </div>

          {/* Folder List (Full Width) */}
          <div className="w-full border border-white/5 rounded-[10px] bg-[#161616]/40 divide-y divide-white/5 overflow-hidden">
            {form.scannedFolders.length === 0 ? (
              <div className="p-6 text-xs text-[#888888] font-mono text-center">
                {t('noFoldersConfigured')}
              </div>
            ) : (
              form.scannedFolders.map((folder) => (
                <div
                  key={folder}
                  className="p-3 px-4 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 font-mono text-[#E0E0E0] truncate">
                    <HardDrive size={13} className="shrink-0 text-[#888888]" />
                    <span className="truncate" title={folder}>
                      {folder}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFolder(folder)}
                    className="btn-icon w-7 h-7 text-[#888888] hover:text-white border-transparent"
                    title="Remove"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Manual Path Input (Full Width) */}
          <div className="flex gap-2 w-full">
            <input
              type="text"
              value={manualFolder}
              onChange={(e) => setManualFolder(e.target.value)}
              placeholder={t('pathPlaceholder')}
              className="input-dark flex-1 text-xs font-mono py-2 bg-[#161616] border-white/10"
              onKeyDown={(e) => e.key === 'Enter' && handleAddManualFolder()}
            />
            <button
              type="button"
              onClick={handleAddManualFolder}
              disabled={!manualFolder.trim()}
              className="btn-secondary py-2 px-4 text-xs border-white/10 hover:border-white/20 shrink-0"
            >
              {t('btnAddPath')}
            </button>
          </div>
        </div>

        {/* Section 2: Custom User Folders (Uniform Full Width) */}
        <div className="space-y-4 border-b border-white/5 pb-8 w-full">
          <div className="flex items-center gap-2.5">
            <FolderPlus size={16} className="text-[#DF8DC6]" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                {t('customFoldersTitle')}
              </h2>
              <p className="text-xs text-[#888888]">
                {t('customFoldersDesc')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {form.customFolders?.map((folder) => (
              <div
                key={folder}
                className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[#181818] border border-white/10 text-xs text-white"
              >
                <Folder size={13} className="text-[#888888]" />
                <span>{folder}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteUserFolder(folder)}
                  className="text-[#666666] hover:text-red-400 p-0.5 rounded transition-colors"
                  title="Удалить"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddUserFolder} className="flex gap-2 w-full">
            <div className="relative flex-1">
              <input
                type="text"
                value={newFolderInput}
                onChange={(e) => setNewFolderInput(e.target.value.slice(0, 12))}
                maxLength={12}
                placeholder={t('folderNamePlaceholder')}
                className="input-dark w-full text-xs py-2 bg-[#161616] border-white/10 pr-10"
              />
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono pointer-events-none ${
                newFolderInput.length >= 12 ? 'text-amber-400' : 'text-[#444444]'
              }`}>
                {newFolderInput.length}/12
              </span>
            </div>
            <button
              type="submit"
              disabled={!newFolderInput.trim()}
              className="btn-secondary py-2 px-4 text-xs border-white/10 hover:border-white/20 shrink-0 gap-1.5"
            >
              <Plus size={13} />
              <span>{t('btnCreateFolder')}</span>
            </button>
          </form>
        </div>

        {/* Section 3: Media Player (Uniform Full Width) */}
        <div className="space-y-4 border-b border-white/5 pb-8 relative z-20 w-full">
          <div className="flex items-center gap-2.5">
            <PlaySquare size={16} className="text-[#DF8DC6]" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                {t('sectionPlayerTitle')}
              </h2>
              <p className="text-xs text-[#888888]">
                {t('sectionPlayerDesc')}
              </p>
            </div>
          </div>

          <div className="space-y-3 w-full">
            <CustomSelect<'system' | 'custom'>
              value={form.playerType}
              onChange={(val) => setForm({ ...form, playerType: val })}
              options={playerOptions}
              className="w-full"
            />

            {form.playerType === 'custom' && (
              <div className="space-y-1.5 pt-1 w-full">
                <label className="text-xs text-[#888888]">
                  {t('customPlayerPlaceholder')}
                </label>
                <input
                  type="text"
                  value={form.customPlayerPath}
                  onChange={(e) => setForm({ ...form, customPlayerPath: e.target.value })}
                  placeholder={t('customPlayerPlaceholder')}
                  className="input-dark w-full text-xs font-mono py-2 bg-[#161616] border-white/10"
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Interface & Language (Uniform Full Width) */}
        <div className="space-y-5 border-b border-white/5 pb-8 relative z-10 w-full">
          <div className="flex items-center gap-2.5">
            <Languages size={16} className="text-[#DF8DC6]" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                {t('sectionLangTitle')}
              </h2>
            </div>
          </div>

          <div className="space-y-4 w-full">
            <div className="space-y-2 w-full">
              <label className="text-xs text-[#888888]">
                {t('langSelectLabel')}
              </label>
              <CustomSelect<UILanguage>
                value={form.uiLanguage}
                onChange={(val) => setForm({ ...form, uiLanguage: val })}
                options={languageOptions}
                className="w-full"
              />
            </div>

            <div className="pt-2 space-y-3 w-full border-t border-white/5">
              <div className="flex items-center justify-between gap-4 py-1">
                <div>
                  <div className="text-xs font-medium text-white">
                    {t('preferRussianLabel')}
                  </div>
                  <div className="text-[11px] text-[#888888]">
                    {t('preferRussianDesc')}
                  </div>
                </div>
                <CustomCheckbox
                  checked={form.preferRussianTitles}
                  onChange={(checked) => setForm({ ...form, preferRussianTitles: checked })}
                />
              </div>

              <div className="flex items-center justify-between gap-4 py-1">
                <div>
                  <div className="text-xs font-medium text-white">
                    {t('autoScanLabel')}
                  </div>
                  <div className="text-[11px] text-[#888888]">
                    {t('autoScanDesc')}
                  </div>
                </div>
                <CustomCheckbox
                  checked={form.autoScanOnStartup}
                  onChange={(checked) => setForm({ ...form, autoScanOnStartup: checked })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Automation & Integrations (Uniform Full Width) */}
        <div className="space-y-4 border-b border-white/5 pb-8 w-full">
          <div className="flex items-center gap-2.5">
            <Sparkles size={16} className="text-[#DF8DC6]" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                {t('sectionAutomationTitle')}
              </h2>
              <p className="text-xs text-[#888888]">
                {t('sectionAutomationDesc')}
              </p>
            </div>
          </div>

          <div className="space-y-3 w-full">
            <div className="flex items-center justify-between gap-4 py-1">
              <div>
                <div className="text-xs font-medium text-white">
                  {t('settingSmartTracking')}
                </div>
                <div className="text-[11px] text-[#888888]">
                  {t('settingSmartTrackingDesc')}
                </div>
              </div>
              <CustomCheckbox
                checked={form.autoTrackPlayback}
                onChange={(checked) => setForm({ ...form, autoTrackPlayback: checked })}
              />
            </div>

            <div className="flex items-center justify-between gap-4 py-1 border-t border-white/5 pt-3">
              <div>
                <div className="text-xs font-medium text-white">
                  {t('settingDiscordRpc')}
                </div>
                <div className="text-[11px] text-[#888888]">
                  {t('settingDiscordRpcDesc')}
                </div>
              </div>
              <CustomCheckbox
                checked={form.discordRpcEnabled}
                onChange={(checked) => {
                  setForm({ ...form, discordRpcEnabled: checked });
                  (window as any).electronAPI?.setDiscordRpcEnabled?.(checked);
                }}
              />
            </div>
          </div>
        </div>

        {/* Section 6: Developer Tools (Uniform Full Width) */}
        <div className="space-y-4 border-b border-white/5 pb-8 w-full">
          <div className="flex items-center gap-2.5">
            <Terminal size={16} className="text-[#DF8DC6]" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                {t('sectionDevTitle')}
              </h2>
              <p className="text-xs text-[#888888]">
                {t('sectionDevDesc')}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 py-2 w-full">
            <div>
              <div className="text-xs font-medium text-white">
                {t('devModeLabel')}
              </div>
              <div className="text-[11px] text-[#888888]">
                {t('devModeWarning')}
              </div>
            </div>
            <CustomCheckbox
              checked={form.devMode}
              onChange={(checked) => setForm({ ...form, devMode: checked })}
            />
          </div>
        </div>

        {/* Section 5: Data Management (Uniform Full Width) */}
        <div className="space-y-4 border-b border-white/5 pb-8 w-full">
          <div className="flex items-center gap-2.5">
            <Database size={16} className="text-[#DF8DC6]" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                {t('sectionDataTitle')}
              </h2>
              <p className="text-xs text-[#888888]">
                {t('sectionDataDesc')}
              </p>
            </div>
          </div>

          <div className="w-full border border-white/5 rounded-[10px] bg-[#161616]/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-xs font-medium text-white">
                {t('btnClearLibrary')}
              </div>
              <div className="text-[11px] text-[#888888]">
                {t('clearLibraryDesc')}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (window.confirm(t('confirmClearLibrary'))) {
                  const updatedForm = { ...form, scannedFolders: [] };
                  setForm(updatedForm);
                  onSave(updatedForm);
                  onClearLibrary?.();
                  triggerToast(t('libraryClearedToast'));
                }
              }}
              className="btn-secondary py-2 px-4 text-xs gap-2 border-red-500/20 text-red-400 hover:text-red-300 hover:border-red-500/40 hover:bg-red-500/10 shrink-0 whitespace-nowrap self-start sm:self-center"
            >
              <Trash2 size={14} />
              <span>{t('btnClearLibrary')}</span>
            </button>
          </div>
        </div>

        {/* Section 6: About & OTA Updates (Uniform Full Width) */}
        <div className="space-y-4 w-full">
          <div className="flex items-center gap-2.5">
            <Info size={16} className="text-[#DF8DC6]" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                {t('sectionAboutTitle')}
              </h2>
              <p className="text-xs text-[#888888]">
                {t('sectionAboutDesc')}
              </p>
            </div>
          </div>

          <div className="w-full border border-white/5 rounded-[10px] bg-[#161616]/40 p-5 space-y-5">
            {/* App Branding & Version Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div className="flex items-center gap-3.5">
                <img
                  src={CheckListerLogo}
                  alt="CheckLister"
                  className="w-10 h-10 rounded-[8px] shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold tracking-tight text-gradient-brand">
                      CheckLister
                    </span>
                    <span className="px-2 py-0.5 rounded-[4px] bg-white/10 text-white font-mono text-[11px]">
                      v{CURRENT_APP_VERSION}
                    </span>
                  </div>
                  <p className="text-xs text-[#888888] mt-0.5 font-sans">
                    Minimalist Offline Anime Tracker & Library
                  </p>
                </div>
              </div>

              {/* GitHub Link */}
              <button
                type="button"
                onClick={() => openExternalUrl(GITHUB_REPO_URL)}
                className="btn-secondary py-1.5 px-3 text-xs gap-1.5 border-white/10 hover:border-white/20 shrink-0 self-start sm:self-center"
              >
                <span>GitHub</span>
                <ExternalLink size={12} className="text-[#888888]" />
              </button>
            </div>

            {/* Updates Row */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-white flex items-center gap-2">
                    <Sparkles size={13} className="text-[#DF8DC6]" />
                    <span>OTA Обновления через GitHub</span>
                  </div>
                  <div className="text-[11px] text-[#888888] mt-0.5 font-mono">
                    {hasCheckedUpdates
                      ? updateInfo?.isAvailable
                        ? `${t('updateAvailableTitle')}: v${updateInfo.latestVersion}`
                        : updateInfo?.error
                        ? `${t('updateCheckError')}: ${updateInfo.error}`
                        : t('latestVersionInstalled')
                      : 'Проверить наличие обновлений на GitHub.'}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCheckUpdates}
                    disabled={isCheckingUpdates}
                    className="btn-secondary py-2 px-3.5 text-xs font-semibold gap-2 border-white/10 hover:border-white/20 shrink-0 whitespace-nowrap"
                  >
                    <RefreshCw size={13} className={isCheckingUpdates ? 'animate-spin' : ''} />
                    <span>{isCheckingUpdates ? t('checkingUpdates') : t('btnCheckUpdates')}</span>
                  </button>
                </div>
              </div>

              {/* Update Available Card */}
              {updateInfo?.isAvailable && (
                <div className="p-4 rounded-[8px] bg-[#1a1a1a] border border-[#DF8DC6]/30 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#DF8DC6]" />
                      <span className="text-xs font-semibold text-white">
                        {updateInfo.releaseName || `CheckLister v${updateInfo.latestVersion}`}
                      </span>
                      {updateInfo.publishedAt && (
                        <span className="text-[10px] text-[#888888] font-mono">
                          {updateInfo.publishedAt}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openExternalUrl(updateInfo.downloadUrl || updateInfo.htmlUrl)}
                      className="btn-primary py-1.5 px-3 text-xs gap-1.5 shrink-0 shadow-none font-semibold"
                    >
                      <Download size={13} />
                      <span>{t('btnDownloadUpdate')}</span>
                    </button>
                  </div>

                  {updateInfo.releaseNotes && (
                    <div className="text-xs text-[#A0A0A0] bg-[#141414] p-3 rounded-[6px] border border-white/5 font-mono max-h-40 overflow-y-auto whitespace-pre-wrap">
                      {updateInfo.releaseNotes}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Toast */}
        {showSavedToast && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-[8px] bg-white text-black text-xs font-medium flex items-center gap-2 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
            <Check size={14} strokeWidth={3} />
            <span>{toastText || t('settingsSavedToast')}</span>
          </div>
        )}
      </div>
    </div>
  );
};
