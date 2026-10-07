'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { PublicationType } from '@/lib/domain/types';
import {
  MAX_ROWS,
  PUBLICATION_TYPE_OPTIONS,
  PublicationRow,
  moveItem,
  publicationErrors
} from '@/lib/profiles/profile-rows';

interface PublicationsEditorProps {
  value: PublicationRow[];
  onChange: (rows: PublicationRow[]) => void;
}

const INPUT =
  'w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden';
const LABEL = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1';
const ICON_BTN =
  'p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500';

export function PublicationsEditor({ value, onChange }: PublicationsEditorProps) {
  function update(index: number, patch: Partial<PublicationRow>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-3" data-testid="publications-editor">
      {value.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 italic" data-testid="publications-empty">
          No publications yet. Add books, articles and chapters.
        </p>
      )}

      <ol className="space-y-3">
        {value.map((row, i) => {
          const errors = publicationErrors(row);
          const id = `publication-${i}`;
          return (
            <li
              key={i}
              data-testid={`publication-row-${i}`}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Publication {i + 1}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className={ICON_BTN}
                    disabled={i === 0}
                    onClick={() => onChange(moveItem(value, i, i - 1))}
                    aria-label={`Move publication ${i + 1} up`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={ICON_BTN}
                    disabled={i === value.length - 1}
                    onClick={() => onChange(moveItem(value, i, i + 1))}
                    aria-label={`Move publication ${i + 1} down`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={ICON_BTN}
                    onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                    aria-label={`Remove publication ${i + 1}`}
                    data-testid={`publication-remove-${i}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label htmlFor={`${id}-title`} className={LABEL}>Title *</label>
                  <input
                    id={`${id}-title`}
                    type="text"
                    value={row.title}
                    onChange={(e) => update(i, { title: e.target.value })}
                    aria-invalid={!!errors.title}
                    aria-describedby={errors.title ? `${id}-title-err` : undefined}
                    className={INPUT}
                  />
                  {errors.title && <p id={`${id}-title-err`} className="mt-1 text-[11px] text-rose-700">{errors.title}</p>}
                </div>
                <div>
                  <label htmlFor={`${id}-type`} className={LABEL}>Type</label>
                  <select
                    id={`${id}-type`}
                    value={row.publication_type}
                    onChange={(e) => update(i, { publication_type: e.target.value as PublicationType })}
                    className={INPUT}
                  >
                    {PUBLICATION_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`${id}-publisher`} className={LABEL}>Publisher or journal</label>
                  <input
                    id={`${id}-publisher`}
                    type="text"
                    value={row.publisher_or_journal ?? ''}
                    onChange={(e) => update(i, { publisher_or_journal: e.target.value })}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label htmlFor={`${id}-year`} className={LABEL}>Year</label>
                  <input
                    id={`${id}-year`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={2100}
                    value={row.year ?? ''}
                    onChange={(e) => update(i, { year: e.target.value === '' ? null : Number(e.target.value) })}
                    aria-invalid={!!errors.year}
                    aria-describedby={errors.year ? `${id}-year-err` : undefined}
                    className={INPUT}
                  />
                  {errors.year && <p id={`${id}-year-err`} className="mt-1 text-[11px] text-rose-700">{errors.year}</p>}
                </div>
                <div>
                  <label htmlFor={`${id}-link`} className={LABEL}>DOI or URL</label>
                  <input
                    id={`${id}-link`}
                    type="text"
                    value={row.doi_or_url ?? ''}
                    onChange={(e) => update(i, { doi_or_url: e.target.value })}
                    aria-invalid={!!errors.doi_or_url}
                    aria-describedby={errors.doi_or_url ? `${id}-link-err` : undefined}
                    placeholder="https://... or 10.1000/..."
                    className={INPUT}
                  />
                  {errors.doi_or_url && <p id={`${id}-link-err`} className="mt-1 text-[11px] text-rose-700">{errors.doi_or_url}</p>}
                </div>
                <div className="md:col-span-2">
                  <label htmlFor={`${id}-citation`} className={LABEL}>Citation</label>
                  <textarea
                    id={`${id}-citation`}
                    rows={2}
                    value={row.citation_text ?? ''}
                    onChange={(e) => update(i, { citation_text: e.target.value })}
                    className={INPUT}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex items-center gap-3">
        <button
          type="button"
          data-testid="publication-add"
          disabled={value.length >= MAX_ROWS}
          onClick={() => onChange([...value, { title: '', publication_type: 'journal_article', year: null }])}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          Add publication
        </button>
        {value.length >= MAX_ROWS && (
          <span className="text-[11px] text-slate-500" role="status">Maximum of {MAX_ROWS} publications reached.</span>
        )}
      </div>
    </div>
  );
}
