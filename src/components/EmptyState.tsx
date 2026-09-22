import React from 'react';
import { Film, FolderPlus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  onAction?: () => void;
  actionLabel?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  onAction,
  actionLabel,
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
      <div className="w-14 h-14 rounded-[10px] bg-[#1c1c1c] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#888888] mb-4">
        <Film size={24} />
      </div>

      <h3 className="text-sm font-semibold text-white mb-1 tracking-tight">
        {title}
      </h3>

      <p className="text-xs text-[#888888] max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="btn-primary"
        >
          <FolderPlus size={14} />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};
