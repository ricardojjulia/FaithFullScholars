import Link from 'next/link';

export function PublicNav() {
  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-indigo-900 text-amber-300 font-serif font-bold text-xl flex items-center justify-center shadow-sm group-hover:bg-indigo-800 transition-colors">
            FS
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white leading-none">
              FaithFull Scholars
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Theological Faculty Network
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Link
            href="/scholars"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Faculty Directory
          </Link>
          <Link
            href="/courses"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Course Showcase
          </Link>
          <Link
            href="/#disciplines"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Theological Fields
          </Link>
          <Link
            href="/#trust"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Trust & Standards
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/scholars"
            className="text-xs sm:text-sm font-medium px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            Browse
          </Link>
          <button
            type="button"
            className="text-xs sm:text-sm font-medium px-4 py-1.5 rounded-lg bg-indigo-900 hover:bg-indigo-800 text-white transition-colors shadow-sm"
          >
            Sign In
          </button>
        </div>
      </div>
    </header>
  );
}
