'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/i18n-context';

export function InstitutionNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems = [
    {
      href: '/institution',
      label: t('institution.nav_overview') || 'Overview',
      exact: true,
    },
    {
      href: '/institution/inquiries',
      label: t('institution.nav_inquiries') || 'Outreach & Inquiries',
      exact: false,
    },
    {
      href: '/institution/saved',
      label: t('institution.nav_saved') || 'Shortlisted Scholars',
      exact: false,
    },
    {
      href: '/institution/profile',
      label: t('institution.nav_profile') || 'Institution Profile',
      exact: false,
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-16 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-base">🏛️</span>
          <span className="text-xs font-serif font-bold text-slate-900 dark:text-white">
            {t('institution.portal_title') || 'Institution Portal'}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            ✓ Verified
          </span>
        </div>

        <nav className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  isActive
                    ? 'bg-indigo-900 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
