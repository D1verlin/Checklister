import React from 'react';
import { Search, FolderPlus, RefreshCw, Languages, X } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddFolder: () => void;
  onScan: () => void;
  isScanning: boolean;
  scanProgressText?: string;
  preferRussian: boolean;
  onToggleLanguage: () => void;
  totalEpisodes: number;
  watchedEpisodes: number;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onAddFolder,
  onScan,
  isScanning,
  scanProgressText,
  preferRussian,
  onToggleLanguage,
  totalEpisodes,
  watchedEpisodes,
}) => {
  return (
    <header className="h-16 px-6 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between gap-4 bg-[#121212]/95 backdrop-blur-md select-none">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#888888]">
          <Search size={14} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by title, romaji, or folder..."
          className="input-dark w-full pl-9 pr-8"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#888888] hover:text-white"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Progress & Actions */}
      <div className="flex items-center gap-3">

        {/* Global Progress Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-[#161616] border border-[rgba(255,255,255,0.08)]">
          <span className="text-[11px] text-[#888888]">Progress</span>
          <span className="font-mono text-xs text-white">
            {watchedEpisodes} / {totalEpisodes}
          </span>
        </div>

        {/* Language Toggle */}
        <button
          onClick={onToggleLanguage}
          title={preferRussian ? 'Switch to Romaji/English' : 'Switch to Russian titles'}
          className="btn-secondary px-3 py-1.5 text-xs font-mono"
        >
          <Languages size={14} />
          <span>{preferRussian ? 'RU' : 'EN'}</span>
        </button>

        {/* Rescan Button */}
        <button
          onClick={onScan}
          disabled={isScanning}
          className="btn-secondary"
        >
          <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Scan</span>
        </button>

        {/* Add Folder Button */}
        <button
          onClick={onAddFolder}
          className="btn-primary"
        >
          <FolderPlus size={14} />
          <span>Add Folder</span>
        </button>
      </div>
    </header>
  );
};
