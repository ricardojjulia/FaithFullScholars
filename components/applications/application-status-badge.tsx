'use client';

import { useTranslation } from '@/lib/i18n/i18n-context';
import type { ApplicationStatus } from '@/lib/postings/application-status';

const TONE: Record<ApplicationStatus, string> = {
  submitted: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
  under_review: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
  interview_scheduled: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
  declined: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800',
  withdrawn: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700',
};

/** The real application status, translated. The tone never carries meaning on its own: the label is always shown. */
export function ApplicationStatusBadge({ status, className = '' }: { status: ApplicationStatus; className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      data-testid="application-status"
      data-status={status}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${TONE[status]} ${className}`}
    >
      {t(`common_app.status_${status}`)}
    </span>
  );
}
