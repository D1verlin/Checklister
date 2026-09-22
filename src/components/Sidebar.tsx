import React from 'react';
import { LayoutGrid, Play, Check, Clock, AlertCircle, Settings, HardDrive, RefreshCw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FilterStatus, AnimeWithEpisodes } from '../types/index.ts';

interface SidebarProps {
  currentFilter: FilterStatus;
  onFilterChange: (filter: FilterStatus) => void;
  animeList: AnimeWithEpisodes[];
  onOpenSettings: () => void;
  onRescan: () => void;
  isScanning: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentFilter,
  onFilterChange,
  animeList,
  onOpenSettings,
  onRescan,
  isScanning,
}) => {
  const counts = {
    ALL: animeList.length,
    WATCHING: animeList.filter(a => !a.isCompleted && a.watchedCount > 0).length,
    COMPLETED: animeList.filter(a => a.isCompleted).length,
    AIRING: animeList.filter(a => a.airingStatus === 'RELEASING').length,
    MISSING: animeList.filter(a => a.hasMissingFiles).length,
  };

  const navItems: { id: FilterStatus; label: string; icon: LucideIcon }[] = [
    { id: 'ALL', label: 'All Titles', icon: LayoutGrid },
    { id: 'WATCHING', label: 'Watching', icon: Play },
    { id: 'COMPLETED', label: 'Completed', icon: Check },
    { id: 'AIRING', label: 'Airing', icon: Clock },
  ];

  if (counts.MISSING > 0) {
    navItems.push({ id: 'MISSING', label: 'Missing Files', icon: AlertCircle });
  }

  return (
    <aside className="w-64 h-full flex flex-col bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded-[10px] m-3 mr-0 overflow-hidden select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[6px] bg-[#1c1c1c] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-white">
            <HardDrive size={16} />
          </div>
          <div>
            <div className="text-xs font-semibold tracking-wider uppercase text-white font-sans">
              Monolith
            </div>
            <div className="text-[11px] text-[#888888] font-mono">
              Tracker v1.0
            </div>
          </div>
        </div>

        <button
          onClick={onRescan}
          disabled={isScanning}
          title="Rescan directories"
          className="btn-icon"
        >
          <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Navigation Filter List */}
      <div className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#888888] font-sans">
          Library
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentFilter === item.id;
          const count = counts[item.id];

          return (
            <button
              key={item.id}
              onClick={() => onFilterChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-[6px] text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#1c1c1c] text-white border border-[rgba(255,255,255,0.16)]'
                  : 'text-[#888888] hover:text-[#E0E0E0] hover:bg-[#161616] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon size={15} />
                <span>{item.label}</span>
              </div>
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-[4px] bg-[#121212] border border-[rgba(255,255,255,0.06)] text-[#888888]">
                {String(count).padStart(2, '0')}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer Info & Settings */}
      <div className="p-3 border-t border-[rgba(255,255,255,0.08)] bg-[#161616]/40">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center justify-between px-3 py-2 rounded-[6px] text-xs text-[#888888] hover:text-white hover:bg-[#1c1c1c] border border-[rgba(255,255,255,0.08)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings size={14} />
            <span>Settings</span>
          </div>
          <span className="font-mono text-[10px] text-[#888888]">Config</span>
        </button>
      </div>
    </aside>
  );
};
