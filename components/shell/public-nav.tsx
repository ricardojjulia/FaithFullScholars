'use client';

import Link from 'next/link';
import { Home, Users, BookOpen, Briefcase, GraduationCap, Mic } from 'lucide-react';
import { UniversalSearchBar } from './universal-search-bar';
import { UserMenu } from './user-menu';
import { LanguageSwitcher } from './language-switcher';
import { useTranslation } from '@/lib/i18n/i18n-context';

export function PublicNav() {
  const { t } = useTranslation();

  return (
    <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand & Universal Search */}
        <div className="flex items-center gap-3 sm:gap-5 flex-1 max-w-xl">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-indigo-950 text-amber-300 font-display font-bold text-base flex items-center justify-center shadow-xs group-hover:bg-indigo-900 transition-all border border-indigo-900/80 tracking-tight">
              FS
            </div>
            <div className="hidden lg:flex flex-col">
              <span className="font-display font-bold text-[15px] tracking-tight text-slate-900 dark:text-white leading-tight">
                FaithFull <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Scholars</span>
              </span>
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">
                {t('nav.brand_sub') || 'Theological Faculty Network'}
              </span>
            </div>
          </Link>

          {/* Persistent Universal Search Bar */}
          <div className="flex-1">
            <UniversalSearchBar />
          </div>
        </div>

        {/* Center / Right: Primary Navigation Icons (LinkedIn-style) */}
        <nav className="flex items-center gap-1 sm:gap-4 shrink-0">
          <Link
            href="/"
            className="flex flex-col items-center justify-center px-2 py-1 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-lg group"
            title={t('nav.home') || 'Home Feed'}
          >
            <Home className="w-4 h-4 mb-0.5 group-hover:scale-110 transition-transform stroke-[1.75]" />
            <span className="text-[10px] font-medium hidden md:block">{t('nav.home') || 'Home'}</span>
          </Link>

          <Link
            href="/scholars"
            className="flex flex-col items-center justify-center px-2 py-1 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-lg group"
            title={t('nav.directory') || 'Faculty Network Directory'}
          >
            <Users className="w-4 h-4 mb-0.5 group-hover:scale-110 transition-transform stroke-[1.75]" />
            <span className="text-[10px] font-medium hidden md:block">{t('nav.directory') || 'Directory'}</span>
          </Link>

          <Link
            href="/courses"
            className="flex flex-col items-center justify-center px-2 py-1 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-lg group"
            title={t('nav.courses') || 'Course Syllabi & Lecture Showcase'}
          >
            <BookOpen className="w-4 h-4 mb-0.5 group-hover:scale-110 transition-transform stroke-[1.75]" />
            <span className="text-[10px] font-medium hidden md:block">{t('nav.courses') || 'Courses'}</span>
          </Link>

          <Link
            href="/opportunities"
            className="flex flex-col items-center justify-center px-2 py-1 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-lg group"
            title={t('nav.opportunities') || 'Academic Opportunities & Teaching Calls'}
          >
            <Briefcase className="w-4 h-4 mb-0.5 group-hover:scale-110 transition-transform stroke-[1.75]" />
            <span className="text-[10px] font-medium hidden md:block">{t('nav.opportunities') || 'Opportunities'}</span>
          </Link>

          <Link
            href="/speakers"
            className="flex flex-col items-center justify-center px-2 py-1 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-lg group"
            title={t('nav.speakers') || 'Theological Conference Speaker Bureau & Keynotes'}
          >
            <Mic className="w-4 h-4 mb-0.5 group-hover:scale-110 transition-transform stroke-[1.75]" />
            <span className="text-[10px] font-medium hidden md:block">{t('nav.speakers') || 'Speakers'}</span>
          </Link>

          <Link
            href="/scholars?available=true"
            className="flex flex-col items-center justify-center px-2 py-1 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-lg group relative"
            title={t('nav.teaching') || 'Scholars Available for Adjunct Teaching'}
          >
            <GraduationCap className="w-4 h-4 mb-0.5 group-hover:scale-110 transition-transform stroke-[1.75]" />
            <span className="text-[10px] font-medium hidden md:block">{t('nav.teaching') || 'Teaching'}</span>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse md:hidden" />
          </Link>

          <div className="h-7 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

          {/* Language Switcher (EN / ES) */}
          <LanguageSwitcher />

          {/* Me Dropdown */}
          <UserMenu />

          {/* Join Call to Action */}
          <Link
            href="/scholars"
            className="hidden sm:inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white shadow-xs transition-colors whitespace-nowrap ml-1"
          >
            {t('nav.browse_all') || 'Browse All'}
          </Link>
        </nav>
      </div>
    </header>
  );
}
