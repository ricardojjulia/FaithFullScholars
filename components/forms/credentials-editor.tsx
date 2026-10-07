'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import {
  CredentialRow,
  MAX_ROWS,
  credentialErrors,
  moveItem
} from '@/lib/profiles/profile-rows';

interface CredentialsEditorProps {
  value: CredentialRow[];
  onChange: (rows: CredentialRow[]) => void;
}

const INPUT =
  'w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden';
const LABEL = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1';
const ICON_BTN =
  'p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500';

export function CredentialsEditor({ value, onChange }: CredentialsEditorProps) {
  function update(index: number, patch: Partial<CredentialRow>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-3" data-testid="credentials-editor">
      {value.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 italic" data-testid="credentials-empty">
          No credentials yet. Add your degrees and academic appointments.
        </p>
      )}

      <ol className="space-y-3">
        {value.map((row, i) => {
          const errors = credentialErrors(row);
          const id = `credential-${i}`;
          return (
            <li
              key={i}
              data-testid={`credential-row-${i}`}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Credential {i + 1}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className={ICON_BTN}
                    disabled={i === 0}
                    onClick={() => onChange(moveItem(value, i, i - 1))}
                    aria-label={`Move credential ${i + 1} up`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={ICON_BTN}
                    disabled={i === value.length - 1}
                    onClick={() => onChange(moveItem(value, i, i + 1))}
                    aria-label={`Move credential ${i + 1} down`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={ICON_BTN}
                    onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                    aria-label={`Remove credential ${i + 1}`}
                    data-testid={`credential-remove-${i}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`${id}-degree`} className={LABEL}>Degree *</label>
                  <input
                    id={`${id}-degree`}
                    type="text"
                    value={row.degree}
                    onChange={(e) => update(i, { degree: e.target.value })}
                    aria-invalid={!!errors.degree}
                    aria-describedby={errors.degree ? `${id}-degree-err` : undefined}
                    placeholder="e.g. Ph.D."
                    className={INPUT}
                  />
                  {errors.degree && <p id={`${id}-degree-err`} className="mt-1 text-[11px] text-rose-700">{errors.degree}</p>}
                </div>
                <div>
                  <label htmlFor={`${id}-field`} className={LABEL}>Field of study *</label>
                  <input
                    id={`${id}-field`}
                    type="text"
                    value={row.field_of_study}
                    onChange={(e) => update(i, { field_of_study: e.target.value })}
                    aria-invalid={!!errors.field_of_study}
                    aria-describedby={errors.field_of_study ? `${id}-field-err` : undefined}
                    placeholder="e.g. Old Testament"
                    className={INPUT}
                  />
                  {errors.field_of_study && <p id={`${id}-field-err`} className="mt-1 text-[11px] text-rose-700">{errors.field_of_study}</p>}
                </div>
                <div>
                  <label htmlFor={`${id}-institution`} className={LABEL}>Institution *</label>
                  <input
                    id={`${id}-institution`}
                    type="text"
                    value={row.institution_name}
                    onChange={(e) => update(i, { institution_name: e.target.value })}
                    aria-invalid={!!errors.institution_name}
                    aria-describedby={errors.institution_name ? `${id}-institution-err` : undefined}
                    placeholder="e.g. University of Cambridge"
                    className={INPUT}
                  />
                  {errors.institution_name && <p id={`${id}-institution-err`} className="mt-1 text-[11px] text-rose-700">{errors.institution_name}</p>}
                </div>
                <div>
                  <label htmlFor={`${id}-year`} className={LABEL}>Year awarded</label>
                  <input
                    id={`${id}-year`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={2100}
                    value={row.year_awarded ?? ''}
                    onChange={(e) => update(i, { year_awarded: e.target.value === '' ? null : Number(e.target.value) })}
                    aria-invalid={!!errors.year_awarded}
                    aria-describedby={errors.year_awarded ? `${id}-year-err` : undefined}
                    className={INPUT}
                  />
                  {errors.year_awarded && <p id={`${id}-year-err`} className="mt-1 text-[11px] text-rose-700">{errors.year_awarded}</p>}
                </div>
              </div>

              <label htmlFor={`${id}-terminal`} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  id={`${id}-terminal`}
                  type="checkbox"
                  checked={row.is_terminal}
                  onChange={(e) => update(i, { is_terminal: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Terminal degree
              </label>
            </li>
          );
        })}
      </ol>

      <div className="flex items-center gap-3">
        <button
          type="button"
          data-testid="credential-add"
          disabled={value.length >= MAX_ROWS}
          onClick={() =>
            onChange([...value, { degree: '', field_of_study: '', institution_name: '', year_awarded: null, is_terminal: false }])
          }
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          Add credential
        </button>
        {value.length >= MAX_ROWS && (
          <span className="text-[11px] text-slate-500" role="status">Maximum of {MAX_ROWS} credentials reached.</span>
        )}
      </div>
    </div>
  );
}
