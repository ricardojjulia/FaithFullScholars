import Link from 'next/link';

export function ScholarRecommendationsRail() {
  return (
    <div className="space-y-6">
      {/* 1. Open Teaching Calls & Institutional Needs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-serif font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <span>💼</span> Open Teaching Calls
          </h3>
          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
            Active
          </span>
        </div>

        <div className="space-y-3.5 text-xs">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 last:border-none last:pb-0">
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              Adjunct: Historical Theology II
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Westminster Theological Seminary • Spring Modular
            </p>
            <div className="mt-1.5 flex items-center gap-2 text-[10px]">
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">Modular Intensive</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-400">ATS Accredited</span>
            </div>
          </div>

          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 last:border-none last:pb-0">
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              Instructor: New Testament Greek Exegesis
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Reformed Theological Seminary • Online Synchronous
            </p>
            <div className="mt-1.5 flex items-center gap-2 text-[10px]">
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">Graduate Seminary</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-400">Part-Time</span>
            </div>
          </div>

          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 last:border-none last:pb-0">
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              Visiting Lecturer: Christian Ethics
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Trinity Evangelical Divinity School • Fall Term
            </p>
            <div className="mt-1.5 flex items-center gap-2 text-[10px]">
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">Hybrid / On-Campus</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-400">Doctoral Dept</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
          <Link
            href="/scholars?available=true"
            className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline"
          >
            Browse Available Faculty →
          </Link>
        </div>
      </div>

      {/* 2. Trending Theological Fields */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <h3 className="font-serif font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <span>📈</span> Trending Disciplines
        </h3>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { label: 'Reformed Dogmatics', query: 'Reformed' },
            { label: 'Johannine Literature', query: 'John' },
            { label: 'Patristic Christology', query: 'Patristics' },
            { label: 'Biblical Hebrew Exegesis', query: 'Hebrew' },
            { label: 'Westminster Standards', query: 'Westminster' },
            { label: '1689 Baptist Confession', query: '1689' },
          ].map((item) => (
            <Link
              key={item.label}
              href={`/scholars?search=${encodeURIComponent(item.query)}`}
              className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-900 dark:hover:text-indigo-300 border border-slate-200/60 dark:border-slate-700 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 3. Platform Trust & Governance Card */}
      <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 text-xs text-slate-500 space-y-2">
        <div className="font-serif font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
          <span>🛡️</span> Academic Trust & RLS Security
        </div>
        <p className="text-[11px] leading-relaxed">
          Faculty profiles undergo rigorous administrative review before public indexing. Private contact data and draft revisions are protected by 100% PostgreSQL Row Level Security.
        </p>
        <div className="pt-2 text-[10px] text-slate-400">
          ADR 0005 • ADR 0007 • ADR 0008 Compliant
        </div>
      </div>
    </div>
  );
}
