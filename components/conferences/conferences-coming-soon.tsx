import Link from 'next/link';
import { Calendar } from 'lucide-react';

/** Shown to everyone but platform staff while the conference hub is a preview (ADR 0021). */
export function ConferencesComingSoon() {
  return (
    <div
      data-testid="conferences-coming-soon"
      className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3"
    >
      <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
        <Calendar className="w-6 h-6" />
      </div>
      <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white">
        Conference tools are coming soon
      </h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Interview scheduling and committee scoring for the annual guild conventions are not available yet.
      </p>
      <Link
        href="/institution"
        className="inline-block px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold transition"
      >
        Back to overview
      </Link>
    </div>
  );
}
