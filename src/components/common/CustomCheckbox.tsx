import React from 'react';
import { Check } from 'lucide-react';

interface CustomCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
  size = 'md',
}) => {
  const boxDimensions = size === 'sm' ? 'w-4 h-4 rounded-[4px]' : 'w-5 h-5 rounded-[5px]';
  const iconSize = size === 'sm' ? 11 : 13;

  return (
    <label
      onClick={(e) => {
        if (disabled) return;
        e.preventDefault();
        onChange(!checked);
      }}
      className={`inline-flex items-center gap-2.5 cursor-pointer select-none transition-opacity ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90'
      } ${className}`}
    >
      <div
        className={`${boxDimensions} flex items-center justify-center transition-all duration-150 border ${
          checked
            ? 'bg-white border-white text-black'
            : 'bg-[#161616] border-[rgba(255,255,255,0.16)] hover:border-[rgba(255,255,255,0.32)] text-transparent'
        }`}
      >
        <Check size={iconSize} strokeWidth={3} className={checked ? 'opacity-100 scale-100' : 'opacity-0 scale-75'} />
      </div>
      {label && <span className="text-xs text-[#E0E0E0]">{label}</span>}
    </label>
  );
};
