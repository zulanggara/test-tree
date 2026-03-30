'use client';

import { useState, useCallback } from 'react';
import { SearchMode } from '@/types';

interface SearchBarProps {
  onSearch: (query: string, mode: SearchMode) => void;
  onClear: () => void;
}

export function SearchBar({ onSearch, onClear }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('descendants');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim()) {
      onSearch(val.trim(), mode);
    } else {
      onClear();
    }
  }, [mode, onSearch, onClear]);

  const handleModeChange = useCallback((newMode: SearchMode) => {
    setMode(newMode);
    if (query.trim()) {
      onSearch(query.trim(), newMode);
    }
  }, [query, onSearch]);

  const handleClear = () => {
    setQuery('');
    onClear();
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-2xl mx-auto">
      {/* Search input */}
      <div className="relative flex-1 w-full">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]"
          width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Cari nama anggota keluarga..."
          className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] 
                     text-[var(--text)] placeholder-[var(--text-subtle)] text-sm
                     focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]
                     transition-all duration-200"
        />
        {query && (
          <button onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] hover:text-[var(--text)] transition-colors">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => handleModeChange('descendants')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200
            ${mode === 'descendants'
              ? 'bg-[var(--green)] text-white shadow-lg shadow-green-500/20'
              : 'bg-[var(--card)] border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--green)] hover:text-[var(--green)]'
            }`}
        >
          <span className="w-2 h-2 rounded-full bg-current opacity-80" />
          Keturunan
        </button>
        <button
          onClick={() => handleModeChange('ancestors')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200
            ${mode === 'ancestors'
              ? 'bg-[var(--blue)] text-white shadow-lg shadow-blue-500/20'
              : 'bg-[var(--card)] border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--blue)] hover:text-[var(--blue)]'
            }`}
        >
          <span className="w-2 h-2 rounded-full bg-current opacity-80" />
          Orang Tua
        </button>
      </div>
    </div>
  );
}
