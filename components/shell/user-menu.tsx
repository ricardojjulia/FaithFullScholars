'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="User account and profile menu"
        className="flex flex-col items-center justify-center text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1 rounded-lg"
      >
        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-semibold">
          👤
        </div>
        <span className="text-[10px] font-medium hidden sm:flex items-center gap-0.5 mt-0.5">
          Me <span className="text-[8px]">▼</span>
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-indigo-900 text-amber-300 font-serif font-bold text-sm flex items-center justify-center shadow-sm">
                FS
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Welcome to FaithFull Scholars
                </p>
                <p className="text-[10px] text-slate-500">
                  Theological Academic Network
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="w-full py-1.5 px-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors text-center"
              >
                Sign In
              </button>
              <button
                type="button"
                className="w-full py-1.5 px-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors text-center"
              >
                Register
              </button>
            </div>
          </div>

          <div className="py-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
            <Link
              href="/scholars"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span>Faculty Directory</span>
              <span className="text-[10px] text-slate-400">Browse</span>
            </Link>
            <Link
              href="/courses"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span>Course Catalog</span>
              <span className="text-[10px] text-slate-400">Syllabi</span>
            </Link>
            <Link
              href="/scholars?available=true"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span>Available for Hire</span>
              <span className="text-[10px] text-emerald-600 font-semibold">Adjunct</span>
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span>Scholar Workspace</span>
              <span className="text-[10px] text-indigo-600 font-semibold">Faculty</span>
            </Link>
            <Link
              href="/institution"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span>Institution Portal</span>
              <span className="text-[10px] text-emerald-600 font-semibold">Seminary</span>
            </Link>
            <Link
              href="/admin/reviews"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span>Admin Trust Hub</span>
              <span className="text-[10px] text-amber-600 font-semibold">Moderation</span>
            </Link>
            <Link
              href="/dev/status"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span>System Health</span>
              <span className="text-[10px] text-indigo-600 font-semibold">Diagnostics</span>
            </Link>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 text-center">
            Dedicated to Christ-Centered Scholarship
          </div>
        </div>
      )}
    </div>
  );
}
