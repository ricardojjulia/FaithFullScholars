import { FullPublicScholarProfile } from '@/lib/domain/queries';
import { formatAdherenceLevel } from '@/lib/domain/taxonomies';
import { AdherenceLevel } from '@/lib/domain/types';

interface ScholarDoctrinalCardProps {
  scholar: FullPublicScholarProfile;
}

export function ScholarDoctrinalCard({ scholar }: ScholarDoctrinalCardProps) {
  const hasStatement = Boolean(scholar.doctrinal_statement_text);
  const hasConfessions = scholar.confessions.length > 0;

  if (!hasStatement && !hasConfessions) {
    return null;
  }

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
        <h2 className="font-serif font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
          <span>✝️</span> Doctrinal Stance & Historic Confessional Alignment
        </h2>
        <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-900">
          ADR 0001
        </span>
      </div>

      {/* 1. Personal Doctrinal Statement Callout */}
      {scholar.doctrinal_statement_text && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
            Personal Faith Affirmation
          </h3>
          <div className="relative bg-slate-50 dark:bg-slate-950/60 p-5 sm:p-6 rounded-2xl border border-slate-200/70 dark:border-slate-800 font-serif text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            <span className="text-3xl text-indigo-300 dark:text-indigo-800 absolute top-2 left-3 select-none leading-none">
              &ldquo;
            </span>
            <p className="pl-4 whitespace-pre-wrap">
              {scholar.doctrinal_statement_text}
            </p>
          </div>
        </div>
      )}

      {/* 2. Affirmed Historic Confessions */}
      {hasConfessions && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Affirmed Historic Confessions & Creeds
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scholar.confessions.map((c) => (
              <div
                key={c.confessional_standard.id}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h4 className="font-serif font-bold text-sm text-slate-900 dark:text-white">
                      {c.confessional_standard.name}
                    </h4>
                    {c.confessional_standard.year && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({c.confessional_standard.year})
                      </span>
                    )}
                  </div>
                  <div className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
                    {formatAdherenceLevel(c.adherence_level as AdherenceLevel)}
                  </div>
                </div>

                {c.exception_notes && (
                  <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <p className="text-[11px] text-amber-900 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-900 leading-snug">
                      <strong className="font-semibold">Exception:</strong> {c.exception_notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
