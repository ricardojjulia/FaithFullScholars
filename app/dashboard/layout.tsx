import Link from 'next/link';
import { Inbox, BarChart3, Eye } from 'lucide-react';
import { AccessRestricted } from '@/components/shell/access-restricted';
import { getSessionContext } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionContext();

  if (!session) {
    return (
      <AccessRestricted
        title="Scholar Workspace"
        message="Please sign in to manage your scholar profile."
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Dashboard Sub-Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-16 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-display font-bold tracking-tight text-slate-900 dark:text-white">
              Scholar Workspace
            </span>
          </div>

          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Overview
            </Link>
            <Link
              href="/dashboard/profile"
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Profile & Doctrinal
            </Link>
            <Link
              href="/dashboard/courses"
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Courses & Syllabi
            </Link>
            <Link
              href="/dashboard/availability"
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Availability
            </Link>
            <Link
              href="/dashboard/inquiries"
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Inbox className="w-3.5 h-3.5 stroke-[2]" />
              <span>Inquiries</span>
            </Link>
            <Link
              href="/dashboard/analytics"
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <BarChart3 className="w-3.5 h-3.5 stroke-[2]" />
              <span>Analytics</span>
            </Link>
            <Link
              href="/dashboard/preview"
              className="px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 stroke-[2]" />
              <span>Draft Preview</span>
            </Link>
          </nav>
        </div>
      </div>

      <main className="flex-1 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
