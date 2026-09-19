'use client';

import { AdherenceLevel } from '@/lib/domain/types';

export interface ConfessionAffirmationItem {
  confessional_standard_id: string;
  confessional_standard_name?: string;
  adherence_level: AdherenceLevel;
  exception_notes?: string | null;
}

interface ConfessionalStandardsSelectorProps {
  value: ConfessionAffirmationItem[];
  onChange: (confessions: ConfessionAffirmationItem[]) => void;
}

const HISTORIC_STANDARDS = [
  {
    id: 'standard-westminster',
    name: 'Westminster Confession of Faith (1646)',
    slug: 'westminster-confession',
    year: 1646,
    tradition: 'Reformed & Presbyterian'
  },
  {
    id: 'standard-1689',
    name: '1689 London Baptist Confession of Faith',
    slug: '1689-london-baptist',
    year: 1689,
    tradition: 'Confessional Baptist'
  },
  {
    id: 'standard-nicene',
    name: 'Nicene-Constantinopolitan Creed (381)',
    slug: 'nicene-creed',
    year: 381,
    tradition: 'Classical Ecumenical'
  },
  {
    id: 'standard-39articles',
    name: 'Thirty-Nine Articles of Religion (1571)',
    slug: 'thirty-nine-articles',
    year: 1571,
    tradition: 'Anglican & Episcopalian'
  },
  {
    id: 'standard-augsburg',
    name: 'Augsburg Confession (1530)',
    slug: 'augsburg-confession',
    year: 1530,
    tradition: 'Lutheran'
  },
  {
    id: 'standard-chicago',
    name: 'Chicago Statement on Biblical Inerrancy (1978)',
    slug: 'chicago-inerrancy',
    year: 1978,
    tradition: 'Evangelical'
  },
  {
    id: 'standard-heidelberg',
    name: 'Heidelberg Catechism (1563)',
    slug: 'heidelberg-catechism',
    year: 1563,
    tradition: 'Continental Reformed'
  },
  {
    id: 'standard-lausanne',
    name: 'Lausanne Covenant (1974)',
    slug: 'lausanne-covenant',
    year: 1974,
    tradition: 'Global Evangelical'
  }
];

export function ConfessionalStandardsSelector({ value, onChange }: ConfessionalStandardsSelectorProps) {
  function isSelected(id: string) {
    return value.some((c) => c.confessional_standard_id === id);
  }

  function getAffirmation(id: string) {
    return value.find((c) => c.confessional_standard_id === id);
  }

  function toggleStandard(id: string, name: string) {
    if (isSelected(id)) {
      onChange(value.filter((c) => c.confessional_standard_id !== id));
    } else {
      onChange([
        ...value,
        {
          confessional_standard_id: id,
          confessional_standard_name: name,
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {HISTORIC_STANDARDS.map((standard) => {
          const selected = isSelected(standard.id);
          const current = getAffirmation(standard.id);

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
                    onChange={() => toggleStandard(standard.id, standard.name)}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white block leading-tight">
                      {standard.name}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {standard.tradition} • {standard.year}
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
                      value={current?.adherence_level || 'full_subscription'}
                      onChange={(e) =>
                        updateAdherence(
                          standard.id,
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
                        value={current.exception_notes || ''}
                        onChange={(e) => updateExceptions(standard.id, e.target.value)}
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
