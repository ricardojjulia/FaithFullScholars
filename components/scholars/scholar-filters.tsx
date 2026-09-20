'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { SlidersHorizontal } from 'lucide-react';

interface TaxonomyOption {
  id: string;
  name: string;
  slug: string;
  category?: string;
  year?: number | null;
}

interface ScholarFiltersProps {
  disciplines: TaxonomyOption[];
  traditions: TaxonomyOption[];
  confessionalStandards: TaxonomyOption[];
}

export function ScholarFilters({
  disciplines,
  traditions,
  confessionalStandards,
}: ScholarFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [discipline, setDiscipline] = useState(searchParams.get('discipline') || '');
  const [tradition, setTradition] = useState(searchParams.get('tradition') || '');
  const [confession, setConfession] = useState(searchParams.get('confession') || '');
  const [available, setAvailable] = useState(searchParams.get('available') === 'true');

  function applyFilters(updates: Record<string, string | boolean | undefined>) {
    const params = new URLSearchParams(searchParams.toString());

    const nextState = {
      search,
      discipline,
      tradition,
      confession,
      available,
      ...updates,
    };

    if (nextState.search) params.set('search', nextState.search as string);
    else params.delete('search');

    if (nextState.discipline) params.set('discipline', nextState.discipline as string);
    else params.delete('discipline');

    if (nextState.tradition) params.set('tradition', nextState.tradition as string);
    else params.delete('tradition');

    if (nextState.confession) params.set('confession', nextState.confession as string);
    else params.delete('confession');

    if (nextState.available) params.set('available', 'true');
    else params.delete('available');

    startTransition(() => {
      router.push(`/scholars?${params.toString()}`);
    });
  }

  function handleReset() {
    setSearch('');
    setDiscipline('');
    setTradition('');
    setConfession('');
    setAvailable(false);
    startTransition(() => {
      router.push('/scholars');
    });
  }

  const hasActiveFilters =
    Boolean(search) || Boolean(discipline) || Boolean(tradition) || Boolean(confession) || available;

  return (
    <div className="card-crisp p-5 space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h3 className="font-display font-bold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400 stroke-[2]" />
          <span>Filter Faculty</span>
        </h3>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Search Input */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Keyword Search
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyFilters({ search });
            }}
            placeholder="Name, bio, institution..."
            className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 dark:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => applyFilters({ search })}
            className="px-3 py-2 bg-indigo-900 text-white rounded-xl text-xs font-semibold hover:bg-indigo-800 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Discipline Select */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Theological Discipline
        </label>
        <select
          value={discipline}
          onChange={(e) => {
            setDiscipline(e.target.value);
            applyFilters({ discipline: e.target.value });
          }}
          className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 dark:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Disciplines</option>
          {disciplines.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tradition Select */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Theological Tradition
        </label>
        <select
          value={tradition}
          onChange={(e) => {
            setTradition(e.target.value);
            applyFilters({ tradition: e.target.value });
          }}
          className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 dark:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Traditions</option>
          {traditions.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Confessional Standard Select */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Confessional Affirmation
        </label>
        <select
          value={confession}
          onChange={(e) => {
            setConfession(e.target.value);
            applyFilters({ confession: e.target.value });
          }}
          className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 dark:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Confessions</option>
          {confessionalStandards.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name} {c.year ? `(${c.year})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Availability Toggle */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => {
              setAvailable(e.target.checked);
              applyFilters({ available: e.target.checked });
            }}
            className="w-4 h-4 rounded border-slate-300 text-indigo-900 focus:ring-indigo-500"
          />
          <span>Available for Teaching / Speaking</span>
        </label>
      </div>

      {isPending && (
        <div className="text-[11px] text-indigo-600 dark:text-indigo-400 text-center animate-pulse">
          Updating faculty directory...
        </div>
      )}
    </div>
  );
}
