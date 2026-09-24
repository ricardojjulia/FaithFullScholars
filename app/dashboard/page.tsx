import Link from 'next/link';
import { UploadCloud, Eye, FileEdit, BookOpen, Briefcase, Video } from 'lucide-react';

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-8">
      {/* Top Banner: Profile Status & Staging Status */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm card-crisp flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-950 text-amber-300 font-display font-bold text-2xl flex items-center justify-center border-2 border-indigo-900 shadow-sm shrink-0">
            SC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-display font-bold tracking-tight text-slate-900 dark:text-white">
                Faculty Workspace
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                Approved & Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live Revision #1 active on Directory • Draft Revision #2 ready for editing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/onboarding"
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shadow-2xs"
          >
            <UploadCloud className="w-3.5 h-3.5 stroke-[2]" />
            <span>Re-parse CV</span>
          </Link>

          <Link
            href="/dashboard/preview"
            className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2"
          >
            <Eye className="w-3.5 h-3.5 stroke-[2]" />
            <span>Preview Staged Profile</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/dashboard/inquiries"
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp hover:border-indigo-300 dark:hover:border-indigo-700 transition-all block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Profile Inquiries
            </span>
            <span className="text-xs text-emerald-600 font-semibold">+2 this month</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">4</span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 group-hover:underline">View →</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            Structured seminary contacts
          </span>
        </Link>

        <Link
          href="/dashboard/analytics"
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp hover:border-indigo-300 dark:hover:border-indigo-700 transition-all block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Public Directory Views
            </span>
            <span className="text-xs text-emerald-600 font-semibold">+18%</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">182</span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 group-hover:underline">Analytics →</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            Deans & academic searchers
          </span>
        </Link>

        <Link
          href="/dashboard/courses"
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp hover:border-indigo-300 dark:hover:border-indigo-700 transition-all block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Course Syllabi Live
            </span>
            <span className="text-xs text-indigo-600 font-medium">Showcased</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">3</span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 group-hover:underline">Manage →</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            Sample lecture embeds enabled
          </span>
        </Link>

        <Link
          href="/dashboard/availability"
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp hover:border-indigo-300 dark:hover:border-indigo-700 transition-all block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Teaching Availability
            </span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
              Available
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              Adjunct & modular
            </span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 group-hover:underline">Edit →</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            Adjunct & modular intensives
          </span>
        </Link>
      </div>

      {/* Quick Action Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center mb-3 shadow-2xs">
              <FileEdit className="w-5 h-5 text-indigo-700 dark:text-indigo-400 stroke-[1.75]" />
            </div>
            <h3 className="text-base font-display font-bold tracking-tight text-slate-900 dark:text-white">
              Profile & Doctrinal Edits
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Edit your academic credentials, confessional standards subscription, and faith statement. All changes save safely to a draft revision.
            </p>
          </div>
          <Link
            href="/dashboard/profile"
            className="w-full text-center py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
          >
            Open Profile Editor →
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center mb-3 shadow-2xs">
              <BookOpen className="w-5 h-5 text-indigo-700 dark:text-indigo-400 stroke-[1.75]" />
            </div>
            <h3 className="text-base font-display font-bold tracking-tight text-slate-900 dark:text-white">
              Courses & Sample Lectures
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Manage your course syllabi, reading lists, delivery modes, and YouTube sample lecture embeds for prospective colleges.
            </p>
          </div>
          <Link
            href="/dashboard/courses"
            className="w-full text-center py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
          >
            Manage Courses →
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center mb-3 shadow-2xs">
              <Video className="w-5 h-5 text-indigo-700 dark:text-indigo-400 stroke-[1.75]" />
            </div>
            <h3 className="text-base font-display font-bold tracking-tight text-slate-900 dark:text-white">
              Media & Lectures
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Curate videos, homilies, conference lectures, and podcasts with responsive click-to-play showcases for search committees.
            </p>
          </div>
          <Link
            href="/dashboard/media"
            className="w-full text-center py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
          >
            Manage Media Showcase →
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center mb-3 shadow-2xs">
              <Briefcase className="w-5 h-5 text-indigo-700 dark:text-indigo-400 stroke-[1.75]" />
            </div>
            <h3 className="text-base font-display font-bold tracking-tight text-slate-900 dark:text-white">
              Teaching Availability
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Signal whether you are open to adjunct appointments, online synchronous instruction, one-week modular intensives, or doctoral supervision.
            </p>
          </div>
          <Link
            href="/dashboard/availability"
            className="w-full text-center py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
          >
            Configure Availability →
          </Link>
        </div>
      </div>
    </div>
  );
}
