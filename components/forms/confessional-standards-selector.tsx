'use client';

import { X } from 'lucide-react';
import { AdherenceLevel, TaxonomyOption } from '@/lib/domain/types';

export interface ConfessionAffirmationItem {
  /** The confessional_standards slug (ADR 0025). */
  confessional_standard_id: string;
  /** @deprecated No longer emitted. */
  confessional_standard_name?: string;
  adherence_level: AdherenceLevel;
  exception_notes?: string | null;
}

interface ConfessionalStandardsSelectorProps {
  value: ConfessionAffirmationItem[];
  onChange: (confessions: ConfessionAffirmationItem[]) => void;
  /** Options from the database; the selected value is the slug. */
  standards: TaxonomyOption[];
}

export function ConfessionalStandardsSelector({ value, onChange, standards }: ConfessionalStandardsSelectorProps) {
  const unmatched = value.filter((c) => !standards.some((s) => s.slug === c.confessional_standard_id));

  function removeUnmatched(id: string) {
    onChange(value.filter((c) => c.confessional_standard_id !== id));
  }

  function isSelected(id: string) {
    return value.some((c) => c.confessional_standard_id === id);
  }

  function getAffirmation(id: string) {
    return value.find((c) => c.confessional_standard_id === id);
  }

  function toggleStandard(id: string) {
    if (isSelected(id)) {
      onChange(value.filter((c) => c.confessional_standard_id !== id));
    } else {
      onChange([
        ...value,
        {
          confessional_standard_id: id,
          adherence_level: 'full_subscription'
        }
      ]);
    }
  }

  function updateAdherence(id: string, adherence: AdherenceLevel) {
    onChange(
      value.map((c) =>
        c.confessional_standard_id === id ? { ...c, adherence_level: adherence } : c
      )
    );
  }

  function updateExceptions(id: string, notes: string) {
    onChange(
      value.map((c) =>
        c.confessional_standard_id === id ? { ...c, exception_notes: notes } : c
      )
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Affirmed Confessional Standards & Historic Creeds
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Select the historic confessions or creeds you subscribe to, along with your adherence level and any stated exceptions.
        </p>
      </div>

      {unmatched.length > 0 && (
        <div
          role="alert"
          data-testid="confession-unmatched"
          className="p-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs space-y-2"
        >
          <p className="font-semibold">
            These confessional standards do not match the list below. Remove them and choose from the list before submitting.
          </p>
          <ul className="space-y-1">
            {unmatched.map((c) => (
              <li key={c.confessional_standard_id} className="flex items-center justify-between gap-2">
                <span className="font-mono">{c.confessional_standard_id}</span>
                <button
                  type="button"
                  onClick={() => removeUnmatched(c.confessional_standard_id)}
                  aria-label={`Remove unmatched standard ${c.confessional_standard_id}`}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {standards.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 italic">No confessional standards are available yet.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="confession-options">
        {standards.map((standard) => {
          const selected = isSelected(standard.slug);
          const current = getAffirmation(standard.slug);

          return (
            <div
              key={standard.slug}
              className={`p-3.5 rounded-xl border transition-all ${
                selected
                  ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleStandard(standard.slug)}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white block leading-tight">
                      {standard.name}
                    </span>
                  </div>
                </label>
              </div>

              {selected && (
                <div className="mt-3 pt-3 border-t border-indigo-100 dark:border-indigo-900/40 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 uppercase">
                      Adherence Level:
                    </span>
                    <select
                      aria-label={`Adherence level for ${standard.name}`}
                      value={current?.adherence_level || 'full_subscription'}
                      onChange={(e) =>
                        updateAdherence(
                          standard.slug,
                          e.target.value as AdherenceLevel
                        )
                      }
                      className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="full_subscription">Full Subscription / Strict</option>
                      <option value="with_exceptions">With Stated Exceptions</option>
                      <option value="general_agreement">General Agreement</option>
                      <option value="substantial_agreement">Substantial Agreement</option>
                    </select>
                  </div>

                  {current?.adherence_level === 'with_exceptions' && (
                    <div>
                      <input
                        type="text"
                        aria-label={`Stated exceptions for ${standard.name}`}
                        value={current.exception_notes || ''}
                        onChange={(e) => updateExceptions(standard.slug, e.target.value)}
                        placeholder="State specific exceptions (e.g. Chapter 21.8)..."
                        className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
