import React, { useState, useEffect } from 'react';
import { Minus, Square, X, HardDrive } from 'lucide-react';

interface TitlebarProps {
  title?: string;
}

export const Titlebar: React.FC<TitlebarProps> = ({ title = 'Anime Monolith' }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const electron = (window as any).electronAPI;

  useEffect(() => {
    if (electron?.windowControls?.isMaximized) {
      electron.windowControls.isMaximized().then(setIsMaximized);
    }
  }, [electron]);

  const handleMinimize = () => {
    electron?.windowControls?.minimize();
  };

  const handleMaximize = async () => {
    if (electron?.windowControls?.maximize) {
      const maximized = await electron.windowControls.maximize();
      setIsMaximized(maximized);
    }
  };

  const handleClose = () => {
    electron?.windowControls?.close();
  };

  return (
    <div
      className="h-9 w-full bg-[#121212] border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between px-3 select-none z-50 shrink-0"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      {/* Left: App Logo & Name */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-[4px] bg-[#1c1c1c] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-white">
          <HardDrive size={11} />
        </div>
        <span className="text-[11px] font-semibold tracking-wider uppercase text-white font-sans">
          {title}
        </span>
        <span className="text-[10px] text-[#888888] font-mono px-1 py-0.2 rounded bg-[#161616] border border-[rgba(255,255,255,0.06)]">
          v1.0
        </span>
      </div>

      {/* Right: Window Controls (No Drag) */}
      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <button
          onClick={handleMinimize}
          className="w-7 h-6 rounded-[4px] flex items-center justify-center text-[#888888] hover:text-white hover:bg-white/5 transition-colors"
          title="Minimize"
        >
          <Minus size={13} />
        </button>
        <button
          onClick={handleMaximize}
          className="w-7 h-6 rounded-[4px] flex items-center justify-center text-[#888888] hover:text-white hover:bg-white/5 transition-colors"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          <Square size={11} />
        </button>
        <button
          onClick={handleClose}
          className="w-7 h-6 rounded-[4px] flex items-center justify-center text-[#888888] hover:text-white hover:bg-[#D32F2F]/80 transition-colors"
          title="Close"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
};
