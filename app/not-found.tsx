import React from 'react';
import Link from 'next/link';
import { Search, Compass, BookOpen, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-sm">
        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl flex items-center justify-center mx-auto text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80">
          <Compass className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-700 dark:text-indigo-400 font-bold">
            404 • Page Not Found
          </span>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">
            Scholar or Resource Not Found
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            The profile, course syllabus, or academic resource you requested could not be located, may have been retired, or is restricted.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
          <Link
            href="/scholars"
            className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center justify-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Faculty</span>
          </Link>
          <Link
            href="/courses"
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Course Catalog</span>
          </Link>
          <Link
            href="/"
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-center transition"
            aria-label="Return to Home"
            title="Return to Home"
          >
            <Home className="w-4 h-4" />
            <span className="sr-only">Return to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
