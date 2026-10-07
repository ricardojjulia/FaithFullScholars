'use client';

import { useId } from 'react';
import { Check, Plus, Star, X } from 'lucide-react';
import type { TaxonomyOption } from '@/lib/domain/types';
import { makePrimary } from '@/lib/profiles/profile-rows';

interface TaxonomyMultiSelectProps {
  /** Group label, e.g. "Disciplines". Also used in button names. */
  label: string;
  /** Singular noun for messages, e.g. "discipline". */
  noun: string;
  /** Options from the database. */
  options: TaxonomyOption[];
  /** Selected slugs; the first one is primary. Values that match no option are shown as unmatched. */
  value: string[];
  onChange: (slugs: string[]) => void;
  /** Prefix for data-testid hooks, e.g. "discipline" or "tradition". */
  testIdPrefix: string;
}

export function TaxonomyMultiSelect({ label, noun, options, value, onChange, testIdPrefix }: TaxonomyMultiSelectProps) {
  const groupId = useId();
  const known = new Set(options.map((o) => o.slug));
  const unmatched = value.filter((v) => !known.has(v));
  const primary = value[0];

  function toggle(slug: string) {
    onChange(value.includes(slug) ? value.filter((v) => v !== slug) : [...value, slug]);
  }

  return (
    <div className="space-y-3" data-testid={`${testIdPrefix}-select`}>
      {unmatched.length > 0 && (
        <div
          role="alert"
          data-testid={`${testIdPrefix}-unmatched`}
          className="p-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs space-y-2"
        >
          <p className="font-semibold">
            These {noun} entries do not match the list below, so they cannot be published. Remove them and choose from the list before submitting.
          </p>
          <ul className="flex flex-wrap gap-2">
            {unmatched.map((v) => (
              <li key={v} className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg bg-amber-100 font-medium">
                <span>{v}</span>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((x) => x !== v))}
                  aria-label={`Remove unmatched ${noun} ${v}`}
                  className="p-0.5 rounded hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {options.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 italic">No {noun} options are available yet.</p>
      ) : (
        <div role="group" aria-labelledby={groupId} className="space-y-2">
          <span id={groupId} className="sr-only">
            {label}
          </span>
          <div className="flex flex-wrap gap-2">
            {options.map((opt) => {
              const active = value.includes(opt.slug);
              return (
                <button
                  key={opt.slug}
                  type="button"
                  aria-pressed={active}
                  data-testid={`${testIdPrefix}-option-${opt.slug}`}
                  onClick={() => toggle(opt.slug)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
                    active
                      ? 'bg-indigo-900 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {active ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Plus className="w-3.5 h-3.5" aria-hidden="true" />}
                  <span>{opt.name}</span>
                  {active && opt.slug === primary && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-900 text-[10px] font-bold uppercase">
                      Primary
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {value.filter((v) => known.has(v)).length > 1 && (
        <ul className="space-y-1" aria-label={`Selected ${noun} entries`}>
          {value
            .filter((v) => known.has(v))
            .map((slug) => {
              const opt = options.find((o) => o.slug === slug)!;
              const isPrimary = slug === primary;
              return (
                <li key={slug} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <span>{opt.name}</span>
                  {isPrimary ? (
                    <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                      <Star className="w-3 h-3" aria-hidden="true" />
                      Primary
                    </span>
                  ) : (
                    <button
                      type="button"
                      data-testid={`${testIdPrefix}-make-primary-${slug}`}
                      onClick={() => onChange(makePrimary(value, slug))}
                      aria-label={`Make ${opt.name} the primary ${noun}`}
                      className="px-2 py-0.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      Make primary
                    </button>
                  )}
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
