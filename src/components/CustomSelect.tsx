import { Check, ChevronDown } from 'lucide-react';
import React, { useEffect, useId, useRef, useState } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  meta?: string;
  badge?: string;
}

export interface CustomSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  ariaLabel?: string;
  align?: 'left' | 'right';
}

export function CustomSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  disabled = false,
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  ariaLabel,
  align = 'left',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const autoId = useId();
  const selectId = id || autoId;

  const selectedOption = options.find((opt) => opt.value === value);

  // Auto-adjust dropdown placement (top or bottom) so it never gets cut off
  const updatePlacement = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    // If space below is less than 240px and space above is larger, open upwards
    if (spaceBelow < 240 && spaceAbove > spaceBelow) {
      setPlacement('top');
    } else {
      setPlacement('bottom');
    }
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePlacement();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePlacement();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        updatePlacement();
        setIsOpen(true);
        return;
      }
      const currentIndex = options.findIndex((o) => o.value === value);
      const nextIndex =
        e.key === 'ArrowDown'
          ? Math.min(currentIndex + 1, options.length - 1)
          : Math.max(currentIndex - 1, 0);
      const nextOption = options[nextIndex];
      if (nextOption) {
        onChange(nextOption.value);
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (!isOpen) {
        e.preventDefault();
        updatePlacement();
        setIsOpen(true);
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }
  };

  const handleSelectOption = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${isOpen ? 'z-50' : 'z-auto'} ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button / Box */}
      <button
        ref={buttonRef}
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        aria-label={ariaLabel || placeholder}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`group flex min-h-[44px] w-full items-center justify-between gap-2.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-left text-sm text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:border-slate-400 focus:border-[#0D4F3C] focus:outline-none focus:ring-2 focus:ring-[#0D4F3C]/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${
          isOpen ? 'border-[#0D4F3C] ring-2 ring-[#0D4F3C]/20 shadow-sm' : ''
        } ${buttonClassName}`}
      >
        <span className="min-w-0 flex-1 truncate">
          {selectedOption ? (
            <span className="flex items-center gap-2 truncate">
              <span className="font-medium text-slate-900 truncate">
                {selectedOption.label}
              </span>
              {selectedOption.meta && (
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono font-medium text-slate-600 shrink-0">
                  {selectedOption.meta}
                </span>
              )}
              {selectedOption.badge && (
                <span className="rounded-md bg-[#E8F6EE] px-1.5 py-0.5 text-[10px] font-bold text-[#0D4F3C] shrink-0">
                  {selectedOption.badge}
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:text-[#0D4F3C] ${
            isOpen ? 'rotate-180 text-[#0D4F3C]' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Floating Dropdown Options Menu */}
      {isOpen && (
        <div
          className={`absolute z-[70] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_20px_45px_-10px_rgba(15,23,42,0.30)] animate-in fade-in duration-150 ${
            align === 'right'
              ? 'right-0 sm:left-auto min-w-full sm:min-w-[260px] max-w-[calc(100vw-2rem)]'
              : 'left-0 min-w-full max-w-[calc(100vw-2rem)]'
          } ${
            placement === 'top'
              ? 'bottom-full mb-1.5 slide-in-from-bottom-2'
              : 'top-full mt-1.5 slide-in-from-top-2'
          } ${dropdownClassName}`}
        >
          <ul
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={selectId}
            className="max-h-64 overflow-y-auto p-1.5 divide-y divide-slate-100/70 focus:outline-none"
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectOption(option.value)}
                  className={`flex cursor-pointer items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm transition-colors ${
                    isSelected
                      ? 'bg-[#E8F6EE] text-[#0D4F3C] font-semibold'
                      : 'text-slate-800 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{option.label}</span>
                    {option.meta && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[11px] font-mono shrink-0 ${
                          isSelected
                            ? 'bg-emerald-100/80 text-[#0D4F3C]'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {option.meta}
                      </span>
                    )}
                    {option.badge && (
                      <span className="rounded-md bg-emerald-100/90 px-1.5 py-0.5 text-[10px] font-bold text-[#0D4F3C] shrink-0">
                        {option.badge}
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <Check className="h-4 w-4 shrink-0 text-[#0D4F3C] stroke-[2.5]" />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
