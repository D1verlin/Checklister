import React, { useState } from 'react';
import { X, Folder, Trash2, Plus, HardDrive, Check, Radio } from 'lucide-react';
import type { AppSettings } from '../types/index.ts';

interface SettingsModalProps {
  settings: AppSettings;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newSettings: AppSettings) => void;
  onBrowseFolder: () => Promise<string[]>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isOpen,
  onClose,
  onSave,
  onBrowseFolder,
}) => {
  if (!isOpen) return null;

  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [manualFolder, setManualFolder] = useState('');

  const handleAddManualFolder = () => {
    if (!manualFolder.trim()) return;
    if (!form.scannedFolders.includes(manualFolder.trim())) {
      setForm({
        ...form,
        scannedFolders: [...form.scannedFolders, manualFolder.trim()],
      });
    }
    setManualFolder('');
  };

  const handleBrowse = async () => {
    const folders = await onBrowseFolder();
    if (folders && folders.length > 0) {
      const unique = Array.from(new Set([...form.scannedFolders, ...folders]));
      setForm({ ...form, scannedFolders: unique });
    }
  };

  const handleRemoveFolder = (folder: string) => {
    setForm({
      ...form,
      scannedFolders: form.scannedFolders.filter(f => f !== folder),
    });
  };

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col glass-panel rounded-[14px] overflow-hidden shadow-lg border border-[rgba(255,255,255,0.12)] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive size={16} className="text-white" />
            <h2 className="text-sm font-semibold text-white">
              Application Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="btn-icon w-7 h-7 text-[#888888] hover:text-white"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Section: Scanned Folders */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Anime Directories
                </h3>
                <p className="text-[11px] text-[#888888]">
                  Folders searched for anime videos and subfolders.
                </p>
              </div>
              <button
                onClick={handleBrowse}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                <Plus size={13} />
                <span>Browse</span>
              </button>
            </div>

            {/* Folder list */}
            <div className="border border-[rgba(255,255,255,0.08)] rounded-[8px] bg-[#161616]/50 divide-y divide-[rgba(255,255,255,0.06)] overflow-hidden">
              {form.scannedFolders.length === 0 ? (
                <div className="p-4 text-xs text-[#888888] font-mono text-center">
                  No folders added yet. Click Browse or add a path below.
                </div>
              ) : (
                form.scannedFolders.map((folder) => (
                  <div
                    key={folder}
                    className="p-2.5 px-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 font-mono text-[#E0E0E0] truncate">
                      <Folder size={14} className="shrink-0 text-[#888888]" />
                      <span className="truncate" title={folder}>{folder}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveFolder(folder)}
                      className="text-[#888888] hover:text-white transition-colors"
                      title="Remove folder"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Manual folder input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={manualFolder}
                onChange={(e) => setManualFolder(e.target.value)}
                placeholder="Or paste directory path (e.g. D:\Anime)..."
                className="input-dark flex-1 text-xs font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleAddManualFolder()}
              />
              <button
                onClick={handleAddManualFolder}
                disabled={!manualFolder.trim()}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Add Path
              </button>
            </div>
          </div>

          {/* Section: Video Player Selection */}
          <div className="space-y-3 pt-4 border-t border-[rgba(255,255,255,0.08)]">
            <div>
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Video Player Launcher
              </h3>
              <p className="text-[11px] text-[#888888]">
                Executable used when launching video files.
              </p>
            </div>

            <div className="space-y-2">
              <label
                onClick={() => setForm({ ...form, playerType: 'system' })}
                className={`flex items-start gap-3 p-3 rounded-[8px] border cursor-pointer transition-colors ${
                  form.playerType === 'system'
                    ? 'border-[rgba(255,255,255,0.2)] bg-[#1c1c1c]'
                    : 'border-[rgba(255,255,255,0.08)] bg-[#161616]/40 hover:bg-[#161616]'
                }`}
              >
                <div className="pt-0.5">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    form.playerType === 'system' ? 'border-white bg-white' : 'border-[rgba(255,255,255,0.2)]'
                  }`}>
                    {form.playerType === 'system' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-white">
                    System Default Player
                  </div>
                  <div className="text-[11px] text-[#888888]">
                    Launches using Windows default associated media player (e.g. VLC, PotPlayer, or Windows Media Player).
                  </div>
                </div>
              </label>

              <label
                onClick={() => setForm({ ...form, playerType: 'custom' })}
                className={`flex items-start gap-3 p-3 rounded-[8px] border cursor-pointer transition-colors ${
                  form.playerType === 'custom'
                    ? 'border-[rgba(255,255,255,0.2)] bg-[#1c1c1c]'
                    : 'border-[rgba(255,255,255,0.08)] bg-[#161616]/40 hover:bg-[#161616]'
                }`}
              >
                <div className="pt-0.5">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    form.playerType === 'custom' ? 'border-white bg-white' : 'border-[rgba(255,255,255,0.2)]'
                  }`}>
                    {form.playerType === 'custom' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <div className="text-xs font-medium text-white">
                      Custom Player Executable
                    </div>
                    <div className="text-[11px] text-[#888888]">
                      Direct path to mpv, VLC, or MPC-HC binary.
                    </div>
                  </div>

                  {form.playerType === 'custom' && (
                    <input
                      type="text"
                      value={form.customPlayerPath}
                      onChange={(e) => setForm({ ...form, customPlayerPath: e.target.value })}
                      placeholder="C:\Program Files\mpv\mpv.exe"
                      className="input-dark w-full text-xs font-mono"
                    />
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Section: Metadata & UI */}
          <div className="space-y-3 pt-4 border-t border-[rgba(255,255,255,0.08)]">
            <div>
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Preferences
              </h3>
            </div>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#161616]/40 cursor-pointer">
                <div>
                  <div className="text-xs font-medium text-white">
                    Prefer Russian Titles
                  </div>
                  <div className="text-[11px] text-[#888888]">
                    Display titles in Russian via Shikimori if available.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.preferRussianTitles}
                  onChange={(e) => setForm({ ...form, preferRussianTitles: e.target.checked })}
                  className="rounded border-[rgba(255,255,255,0.2)] bg-[#1c1c1c] text-white"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#161616]/40 cursor-pointer">
                <div>
                  <div className="text-xs font-medium text-white">
                    Auto-scan on Application Startup
                  </div>
                  <div className="text-[11px] text-[#888888]">
                    Automatically verify files when the app launches.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.autoScanOnStartup}
                  onChange={(e) => setForm({ ...form, autoScanOnStartup: e.target.checked })}
                  className="rounded border-[rgba(255,255,255,0.2)] bg-[#1c1c1c] text-white"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[rgba(255,255,255,0.08)] bg-[#161616]/60 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
          >
            <Check size={14} />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
