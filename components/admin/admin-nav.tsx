'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Building2, Flag, Bug, ExternalLink } from 'lucide-react';

const ADMIN_TABS = [
  {
    href: '/admin/reviews',
    label: 'Profile Reviews',
    icon: ShieldCheck,
  },
  {
    href: '/admin/institutions',
    label: 'Institutions',
    icon: Building2,
  },
  {
    href: '/admin/reports',
    label: 'Reported Content',
    icon: Flag,
  },
  {
    href: '/admin/triage',
    label: 'Error Triage',
    icon: Bug,
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                <ShieldCheck className="h-4 w-4 text-white stroke-[2]" />
              </span>
              <div>
                <span className="block font-display text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                  FaithFull Scholars
                </span>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Trust & Moderation Hub (Phase 4)
                </span>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {ADMIN_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <span>Scholar Workspace</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
            <Link
              href="/scholars"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <span>Public Directory</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
