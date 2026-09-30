'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';

export function UniversalSearchBar() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 w-44 sm:w-64 md:w-72 h-9 px-3 text-xs text-slate-400">
          Search scholars, courses...
        </div>
      }
    >
      <UniversalSearchBarContent />
    </Suspense>
  );
}

function UniversalSearchBarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const currentSearchParam = searchParams.get('search') || '';
  const [prevSearchParam, setPrevSearchParam] = useState(currentSearchParam);
  const [query, setQuery] = useState(currentSearchParam);
  const [scope, setScope] = useState<'scholars' | 'courses'>('scholars');
  const [isFocused, setIsFocused] = useState(false);

  // Sync with searchParams if changed externally during render
  if (prevSearchParam !== currentSearchParam) {
    setPrevSearchParam(currentSearchParam);
    setQuery(currentSearchParam);
  }

  // Global keyboard shortcut ('/' focuses search)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    const destination = scope === 'courses' ? '/courses' : '/scholars';

    if (trimmed) {
      router.push(`${destination}?search=${encodeURIComponent(trimmed)}`);
    } else {
      router.push(destination);
    }
    inputRef.current?.blur();
    setIsFocused(false);
  }

  function handleClear() {
    setQuery('');
    inputRef.current?.focus();
  }

  return (
    <form
      onSubmit={handleSearch}
      role="search"
      className={`relative flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl transition-all border ${
        isFocused
          ? 'border-indigo-600 ring-2 ring-indigo-500/20 w-full sm:w-80 md:w-96 shadow-sm'
          : 'border-slate-200/80 dark:border-slate-700 w-44 sm:w-64 md:w-72 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      <div className="pl-3 pr-1 text-slate-400 flex items-center pointer-events-none">
        <Search className="w-4 h-4 text-slate-400" />
      </div>

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
        aria-label={scope === 'courses' ? 'Search syllabi and courses' : 'Search scholars, fields, and confessions'}
        placeholder={scope === 'courses' ? 'Search syllabi & courses...' : 'Search scholars, fields, confessions...'}
        className="w-full bg-transparent py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
      />

      {query ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search query"
          className="pr-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs flex items-center justify-center"
          title="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        <div className="hidden sm:flex pr-2.5 pointer-events-none">
          <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded">
            /
          </kbd>
        </div>
      )}

      {/* Quick Search Dropdown when focused */}
      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 text-[11px]">
            <span className="text-slate-400 font-medium px-2">Target Scope:</span>
            <div className="flex gap-1">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setScope('scholars');
                }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                  scope === 'scholars'
                    ? 'bg-indigo-900 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Faculty
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setScope('courses');
                }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                  scope === 'courses'
                    ? 'bg-indigo-900 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Courses
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 px-2 py-1">
            <span>Popular quick searches:</span>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {['Old Testament', 'New Testament Greek', 'Westminster Confession', 'Historical Theology'].map(
                (term) => (
                  <button
                    key={term}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setQuery(term);
                      router.push(`/scholars?search=${encodeURIComponent(term)}`);
                    }}
                    className="px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-900 dark:hover:text-indigo-300 text-[10px] border border-slate-200/60 dark:border-slate-700"
                  >
                    {term}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
