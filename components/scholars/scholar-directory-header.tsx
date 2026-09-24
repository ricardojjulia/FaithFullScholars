'use client';

import { GraduationCap } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { AiMatcherTriggerButton } from './ai-matcher-trigger-button';

interface ScholarDirectoryHeaderProps {
  totalCount: number;
}

export function ScholarDirectoryHeader({ totalCount }: ScholarDirectoryHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:border-indigo-900 dark:text-indigo-300 text-xs font-semibold mb-1 shadow-2xs">
          <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 stroke-[2]" />
          <span>{t('directory.verified_directory_badge')}</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t('directory.title')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
          {t('directory.subtitle')}
        </p>
      </div>

      <div className="flex items-center gap-3 self-start sm:self-auto">
        <AiMatcherTriggerButton />
        <div className="text-xs text-slate-500 font-medium bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          {t('directory.showing_faculty_count', { count: totalCount })}
        </div>
      </div>
    </div>
  );
}
