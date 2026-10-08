import { AlertTriangle } from 'lucide-react';

/**
 * Shown when a portal page cannot load its data. Deliberately generic: no
 * database detail reaches the page, and it replaces (never accompanies) the
 * numbers, so an outage can't be mistaken for "zero".
 */
export function DataErrorPanel({ what }: { what: string }) {
  return (
    <div
      role="alert"
      data-testid="data-error-panel"
      className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-5 text-amber-900 dark:text-amber-200"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-bold">We couldn&rsquo;t load {what}</h2>
          <p className="text-xs mt-1">
            This is a temporary problem on our side, not an empty account. Please refresh the page in a moment.
          </p>
        </div>
      </div>
    </div>
  );
}
