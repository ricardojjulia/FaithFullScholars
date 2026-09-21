import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-900 text-amber-300 font-display font-bold text-xs flex items-center justify-center">
              FS
            </div>
            <span className="font-display font-bold text-base tracking-tight text-slate-900 dark:text-white">
              FaithFull <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Scholars</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            The curated directory connecting accredited theological seminaries, Bible colleges, and Christian universities with qualified faculty, inspectable course syllabi, and verified availability.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
            Discovery
          </h4>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <li>
              <Link href="/scholars" className="hover:text-indigo-600">
                All Faculty Directory
              </Link>
            </li>
            <li>
              <Link href="/courses" className="hover:text-indigo-600">
                Course Catalog & Syllabi
              </Link>
            </li>
            <li>
              <Link href="/opportunities" className="hover:text-indigo-600">
                Academic Opportunities & Calls
              </Link>
            </li>
            <li>
              <Link href="/scholars?available=true" className="hover:text-indigo-600">
                Available for Adjunct Teaching
              </Link>
            </li>
            <li>
              <Link href="/disciplines" className="hover:text-indigo-600">
                Theological Disciplines
              </Link>
            </li>
            <li>
              <Link href="/traditions" className="hover:text-indigo-600">
                Theological Traditions
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
            Standards & Faith
          </h4>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <li>
              <Link href="/#trust" className="hover:text-indigo-600">
                Admin Review Model
              </Link>
            </li>
            <li>
              <Link href="/scholars?confession=westminster-confession" className="hover:text-indigo-600">
                Westminster Confession
              </Link>
            </li>
            <li>
              <Link href="/scholars?confession=1689-london-baptist" className="hover:text-indigo-600">
                1689 Baptist Confession
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
            Governance
          </h4>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <li>
              <span className="text-slate-500">Row Level Security Enforced</span>
            </li>
            <li>
              <span className="text-slate-500">ATS / ABHE Compliant Rigor</span>
            </li>
            <li>
              <span className="text-slate-500">Draft vs. Live Revision Staging (ADR 0005)</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} FaithFull Scholars. Dedicated to the advancement of Christ-centered academic excellence.
      </div>
    </footer>
  );
}
