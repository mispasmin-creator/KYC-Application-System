import { ArrowUpRight, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KycLead } from '../types/kyc';

interface GlobalSearchBarProps {
  query: string;
  onQueryChange: (nextQuery: string) => void;
  matches: KycLead[];
  onSelectLead: (lead: KycLead) => void;
}

export function GlobalSearchBar({
  query,
  onQueryChange,
  matches,
  onSelectLead,
}: GlobalSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isMac = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /Mac|iPod|iPhone|iPad/i.test(navigator.platform);
  }, []);

  const topMatches = useMemo(() => matches.slice(0, 6), [matches]);
  const showDropdown = isFocused && query.trim().length > 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (lead: KycLead) => {
    onSelectLead(lead);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (showDropdown) {
        setIsFocused(false);
        inputRef.current?.blur();
      } else if (query) {
        onQueryChange('');
      }
      return;
    }

    if (!showDropdown || topMatches.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % topMatches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + topMatches.length) % topMatches.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = topMatches[activeIndex];
      if (target) {
        handleSelect(target);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <div className="relative flex items-center">
        <Search
          className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#0D4F3C]/70"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            if (!isFocused) setIsFocused(true);
          }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search company, GSTIN, ID, city, or rep..."
          aria-label="Global company search"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          className="w-full min-h-[40px] rounded-xl border border-white/80 bg-white/80 py-2 pl-10 pr-12 sm:pr-16 text-base sm:text-sm text-slate-900 placeholder:text-slate-500 transition-colors duration-150 focus:border-[#0D4F3C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D4F3C]/20"
        />

        <div className="absolute right-1.5 flex items-center gap-1">
          {query ? (
            <button
              type="button"
              onClick={() => {
                onQueryChange('');
                inputRef.current?.focus();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-[#E8F6EE] hover:text-[#0D4F3C] transition-colors"
              aria-label="Clear global search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center rounded-md border border-slate-200/80 bg-white/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500 whitespace-nowrap mr-1">
              {isMac ? '⌘K' : 'Ctrl K'}
            </kbd>
          )}
        </div>
      </div>

      {/* Quick-Jump Results Dropdown */}
      {showDropdown && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-2 rounded-2xl border border-white/85 bg-white/95 backdrop-blur-xl shadow-[0_18px_40px_-15px_rgba(11,109,119,0.22)] overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-slate-200/70 bg-teal-50/50 px-4 py-2.5 text-[11px] font-medium text-slate-600">
            <span className="tabular-nums">
              {matches.length} {matches.length === 1 ? 'match' : 'matches'} across directory
            </span>
            <span className="hidden sm:inline font-mono text-[10px] text-slate-400">
              ↑↓ navigate · Enter open · Esc close
            </span>
          </div>

          {topMatches.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs font-medium text-slate-800">No companies match "{query.trim()}"</p>
              <p className="mt-1 text-[11px] text-slate-500">
                Try searching by company name, 15-digit GSTIN, ID, city, or salesperson.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[340px] overflow-y-auto">
              {topMatches.map((lead, idx) => {
                const isSelected = idx === activeIndex;
                return (
                  <button
                    key={lead.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => handleSelect(lead)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors duration-100 ${
                      isSelected ? 'bg-teal-50/80' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-semibold text-slate-900">
                          {lead.companyName}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400 shrink-0 tabular-nums">
                          {lead.id}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="font-mono tabular-nums text-slate-700">{lead.gstin}</span>
                        <span aria-hidden="true">·</span>
                        <span>{lead.city}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          GM: {lead.gmName} · TSE: {lead.tseName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={`rounded-lg border px-2 py-0.5 text-[11px] font-medium ${
                          lead.entityType === 'customer'
                            ? 'border-teal-200/80 bg-teal-50/90 text-[#0B6D77]'
                            : 'border-amber-200/80 bg-amber-50/90 text-amber-800'
                        }`}
                      >
                        {lead.entityType === 'customer' ? 'Customer' : 'Vendor'}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-teal-700" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
