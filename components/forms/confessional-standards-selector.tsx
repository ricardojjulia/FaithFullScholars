'use client';

import { useId, useState } from 'react';
import { X } from 'lucide-react';
import { AdherenceLevel, TaxonomyOption } from '@/lib/domain/types';
import { formatAdherenceLevel } from '@/lib/domain/taxonomies';
import { ADHERENCE_OPTIONS, ConfessionRow, confessionErrors } from '@/lib/profiles/profile-rows';
import { FIELD_LIMITS } from '@/lib/profiles/limits';
import { FieldError, useFocusAfterRender } from './use-row-editor';
import { PublicDataNotice } from './public-data-notice';

export type ConfessionAffirmationItem = ConfessionRow;

interface ConfessionalStandardsSelectorProps {
  value: ConfessionAffirmationItem[];
  onChange: (confessions: ConfessionAffirmationItem[]) => void;
  /** Options from the database; the selected value is the slug. */
  standards: TaxonomyOption[];
}

export function ConfessionalStandardsSelector({ value, onChange, standards }: ConfessionalStandardsSelectorProps) {
  const groupId = useId();
  const [announcement, setAnnouncement] = useState('');
  // Per unmatched entry: carry its adherence level and notes over to the replacement (default yes).
  const [resetDetails, setResetDetails] = useState<Record<string, boolean>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const { containerRef, requestFocus } = useFocusAfterRender();

  const unmatched = value.filter((c) => !standards.some((s) => s.slug === c.confessional_standard_id));
  const available = standards.filter((s) => !value.some((c) => c.confessional_standard_id === s.slug));

  function removeUnmatched(id: string) {
    const index = unmatched.findIndex((c) => c.confessional_standard_id === id);
    const next = unmatched[index + 1] ?? unmatched[index - 1];
    onChange(value.filter((c) => c.confessional_standard_id !== id));
    requestFocus(
      ...(next ? [`[data-unmatched-remove="${next.confessional_standard_id}"]`] : []),
      '[data-confession-checkbox]'
    );
    setAnnouncement(`Removed unmatched standard ${id}. ${unmatched.length - 1} unmatched remaining.`);
  }

  function replaceUnmatched(oldId: string, newSlug: string) {
    if (!newSlug) return;
    const target = standards.find((s) => s.slug === newSlug);
    const old = value.find((c) => c.confessional_standard_id === oldId);
    if (!target || !old) return;
    const keep = !resetDetails[oldId];
    onChange(
      value.map((c) =>
        c.confessional_standard_id === oldId
          ? {
              confessional_standard_id: newSlug,
              adherence_level: keep ? old.adherence_level : '',
              exception_notes: keep ? (old.exception_notes ?? null) : null
            }
          : c
      )
    );
    requestFocus(`[data-confession-card="${newSlug}"] select`);
    setAnnouncement(
      `Replaced ${oldId} with ${target.name}. ${keep ? 'Adherence level and notes kept.' : 'Choose an adherence level.'}`
    );
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
      // No default: the scholar must choose how they hold the standard.
      onChange([...value, { confessional_standard_id: id, adherence_level: '', exception_notes: null }]);
      requestFocus(`[data-confession-card="${id}"] select`);
    }
  }

  function updateAdherence(id: string, adherence: AdherenceLevel | '') {
    onChange(
      value.map((c) =>
        c.confessional_standard_id === id
          ? {
              ...c,
              adherence_level: adherence,
              // Exceptions only belong to "with exceptions"; do not keep stale text.
              exception_notes: adherence === 'with_exceptions' ? c.exception_notes : null
            }
          : c
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

  const touch = (id: string, field: string) =>
    setTouched((prev) => (prev[`${id}:${field}`] ? prev : { ...prev, [`${id}:${field}`]: true }));

  return (
    <fieldset className="min-w-0 border-0 p-0 m-0">
      <legend className="block p-0 mb-1 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
        Affirmed Confessional Standards & Historic Creeds
      </legend>
      <div ref={containerRef} className="space-y-4">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select the historic confessions or creeds you subscribe to, then choose your adherence level for each. Nothing is assumed for you.
          </p>
          <div className="mt-1.5">
            <PublicDataNotice subject="Your confessional standards" testId="confession-public-notice" />
          </div>
        </div>

        <div role="status" aria-live="polite" className="sr-only" data-testid="confession-live-region">
          {announcement}
        </div>

        {unmatched.length > 0 && (
          <div
            role="alert"
            data-testid="confession-unmatched"
            className="p-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs space-y-2"
          >
            <p className="font-semibold">
              These confessional standards do not match the list below. Replace each with a standard from the list, or remove it, before submitting.
            </p>
            <ul className="space-y-2">
              {unmatched.map((c) => {
                const id = c.confessional_standard_id;
                const selectId = `${groupId}-replace-${id}`;
                return (
                  <li key={id} className="space-y-1.5 border-t border-amber-200 pt-2 first:border-0 first:pt-0">
                    <div className="flex items-center justify-between gap-2">
                      <span>
                        <span className="font-mono">{id}</span>
                        <span className="block text-[11px]" data-testid={`confession-unmatched-details-${id}`}>
                          {c.adherence_level ? formatAdherenceLevel(c.adherence_level) : 'No adherence level set'}
                          {c.exception_notes ? ` — Exceptions: ${c.exception_notes}` : ''}
                        </span>
                      </span>
                      <button
                        type="button"
                        data-unmatched-remove={id}
                        onClick={() => removeUnmatched(id)}
                        aria-label={`Remove unmatched standard ${id}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                      >
                        <X className="w-3 h-3" aria-hidden="true" />
                        Remove
                      </button>
                    </div>
                    {available.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <label htmlFor={selectId} className="font-medium">
                          Replace with
                        </label>
                        <select
                          id={selectId}
                          value=""
                          onChange={(e) => replaceUnmatched(id, e.target.value)}
                          className="text-xs bg-white border border-amber-300 rounded-lg px-2 py-1 text-slate-800 focus:ring-1 focus:ring-amber-600"
                        >
                          <option value="">Choose a standard…</option>
                          {available.map((s) => (
                            <option key={s.slug} value={s.slug}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <label className="inline-flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={!resetDetails[id]}
                            onChange={(e) => setResetDetails((prev) => ({ ...prev, [id]: !e.target.checked }))}
                            className="rounded border-amber-400 text-amber-700 focus:ring-amber-600"
                          />
                          Keep my adherence level and notes
                        </label>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {standards.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic">No confessional standards are available yet.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="confession-options">
          {standards.map((standard, index) => {
            const selected = isSelected(standard.slug);
            const current = getAffirmation(standard.slug);
            const errors = current ? confessionErrors(current) : {};
            const selectId = `${groupId}-level-${standard.slug}`;
            const notesId = `${groupId}-notes-${standard.slug}`;

            return (
              <div
                key={standard.slug}
                data-confession-card={standard.slug}
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
                      {...(index === 0 ? { 'data-confession-checkbox': true } : {})}
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
                      <label htmlFor={selectId} className="text-[10px] font-medium text-slate-600 dark:text-slate-400 uppercase">
                        Adherence level
                      </label>
                      <select
                        id={selectId}
                        aria-label={`Adherence level for ${standard.name}`}
                        value={current?.adherence_level ?? ''}
                        aria-required="true"
                        aria-invalid={!!errors.adherence_level}
                        aria-describedby={errors.adherence_level ? `${selectId}-err` : undefined}
                        onBlur={() => touch(standard.slug, 'level')}
                        onChange={(e) => updateAdherence(standard.slug, e.target.value as AdherenceLevel | '')}
                        className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">Choose your adherence level…</option>
                        {ADHERENCE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <FieldError
                      id={`${selectId}-err`}
                      message={errors.adherence_level ? 'Choose your adherence level.' : undefined}
                      announce={!!touched[`${standard.slug}:level`]}
                    />

                    {current?.adherence_level === 'with_exceptions' && (
                      <div>
                        <input
                          id={notesId}
                          type="text"
                          aria-required="true"
                          maxLength={FIELD_LIMITS.exception_notes}
                          aria-label={`Stated exceptions for ${standard.name}`}
                          aria-invalid={!!errors.exception_notes}
                          aria-describedby={errors.exception_notes ? `${notesId}-err` : undefined}
                          value={current.exception_notes || ''}
                          onBlur={() => touch(standard.slug, 'notes')}
                          onChange={(e) => updateExceptions(standard.slug, e.target.value)}
                          placeholder="State specific exceptions (e.g. Chapter 21.8)..."
                          className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500"
                        />
                        <FieldError
                          id={`${notesId}-err`}
                          message={errors.exception_notes}
                          announce={!!touched[`${standard.slug}:notes`]}
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
    </fieldset>
  );
}
