'use client';

import Link from 'next/link';
import { Briefcase } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { ApplicationStatusBadge } from '@/components/applications/application-status-badge';
import { WithdrawApplicationButton } from '@/components/applications/withdraw-application-button';
import { isOpenApplication } from '@/lib/postings/application-status';
import type { MyApplication } from '@/lib/postings/my-applications';

/** The scholar's own applications with their real status, and withdraw (with confirmation) while open. */
export function MyApplicationsList({ applications }: { applications: MyApplication[] }) {
  const { t } = useTranslation();

  if (applications.length === 0) {
    return (
      <div
        data-testid="my-applications-empty"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3"
      >
        <Briefcase className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" aria-hidden="true" />
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('common_app.my_empty')}</p>
        <Link
          href="/opportunities"
          className="inline-flex px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
        >
          {t('common_app.my_browse')}
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3" aria-label={t('common_app.my_title')}>
      {applications.map((app) => (
        <li
          key={app.id}
          data-testid="my-application"
          data-application-id={app.id}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {app.postingSlug ? (
                  <Link href={`/opportunities/${app.postingSlug}`} className="hover:underline">
                    {app.postingTitle}
                  </Link>
                ) : (
                  app.postingTitle
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{app.institutionName}</p>
            </div>
            <ApplicationStatusBadge status={app.status} />
          </div>
          <p className="text-[11px] text-slate-500">
            {t('common_app.applied_on', { date: app.appliedAt.slice(0, 10) })}
            {' · '}
            {t('common_app.my_status_changed', { date: app.statusChangedAt.slice(0, 10) })}
          </p>
          {isOpenApplication(app.status) && (
            <WithdrawApplicationButton applicationId={app.id} postingTitle={app.postingTitle} />
          )}
        </li>
      ))}
    </ul>
  );
}
