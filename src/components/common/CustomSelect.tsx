import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: string;
  description?: string;
}

interface CustomSelectProps<T extends string | number = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  className?: string;
  disabled?: boolean;
}

export function CustomSelect<T extends string | number = string>({
  value,
  onChange,
  options,
  className = '',
  disabled = false,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative select-none ${isOpen ? 'z-[100]' : 'z-10'} ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-[8px] bg-[#161616] border transition-all text-xs font-medium ${
          isOpen
            ? 'border-white text-white shadow-lg'
            : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)] text-[#E0E0E0]'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown
          size={14}
          className={`text-[#888888] transition-transform duration-150 ${isOpen ? 'rotate-180 text-white' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute z-[100] mt-1.5 w-full rounded-[8px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.14)] shadow-2xl py-1.5 divide-y divide-[rgba(255,255,255,0.04)] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ minWidth: '220px' }}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left transition-colors ${
                  isSelected
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-[#888888] hover:text-[#E0E0E0] hover:bg-white/5'
                }`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{option.label}</span>
                  {option.description && (
                    <span className="text-[10px] text-[#888888] truncate font-sans">
                      {option.description}
                    </span>
                  )}
                </div>
                {isSelected && <Check size={13} className="text-white shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
