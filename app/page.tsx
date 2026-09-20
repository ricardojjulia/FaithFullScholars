import Link from "next/link";
import { PublicNav } from "@/components/shell/public-nav";
import { PublicFooter } from "@/components/shell/public-footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicNav />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 sm:py-28 px-4 sm:px-6 text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/50 dark:border-indigo-900 text-indigo-800 dark:text-indigo-300 text-xs font-semibold mb-6">
            <span>✨</span> Dedicated to Theological & Biblical Higher Education
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 max-w-4xl mx-auto leading-tight sm:leading-[1.1]">
            The Academic & Teaching Network for Theological Faculty
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10">
            Connecting seminaries, Bible colleges, and universities with qualified professors, syllabi previews, and verified availability for adjunct teaching.
          </p>

          {/* Active Search Form */}
          <form
            action="/scholars"
            method="GET"
            className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl p-2 shadow-lg flex flex-col sm:flex-row gap-2"
          >
            <div className="flex-1 flex items-center px-3 py-2">
              <span className="text-slate-400 mr-2">🔍</span>
              <input
                type="text"
                name="search"
                placeholder="Search discipline, e.g. Old Testament, Systematic Theology..."
                className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer"
            >
              Browse Scholars
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
            <span>Popular specializations:</span>
            {[
              { label: "Old Testament", query: "Old Testament" },
              { label: "New Testament", query: "New Testament" },
              { label: "Systematic Theology", query: "Systematic Theology" },
              { label: "Historical Theology", query: "Historical Theology" },
              { label: "Biblical Hebrew", query: "Hebrew" },
            ].map((tag) => (
              <Link
                key={tag.label}
                href={`/scholars?search=${encodeURIComponent(tag.query)}`}
                className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
              >
                {tag.label}
              </Link>
            ))}
          </div>
        </section>

        {/* Feature Pillars */}
        <section id="disciplines" className="py-16 bg-slate-100/70 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-3">
                Built for the Rigor of Academic Theology
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
                Unlike generic social networks, FaithFull Scholars is structured around credentials, confessional alignment, and inspectable teaching content.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="card-crisp p-6">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-2xl mb-4">
                  📜
                </div>
                <h3 className="font-display font-bold text-lg tracking-tight text-slate-900 dark:text-white mb-2">
                  Academic Identity & Doctrinal Fit
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Terminal degrees, publications, syllabi, and voluntary disclosure of affirmed confessional standards and personal doctrinal statements.
                </p>
                <div className="mt-4">
                  <Link
                    href="/scholars"
                    className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline"
                  >
                    Explore Faculty Directory →
                  </Link>
                </div>
              </div>

              <div className="card-crisp p-6">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-2xl mb-4">
                  🎥
                </div>
                <h3 className="font-display font-bold text-lg tracking-tight text-slate-900 dark:text-white mb-2">
                  Course & Lecture Showcase
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Inspect sample lectures, YouTube playlists, reading lists, and course outlines before initiating academic discussions or adjunct contracts.
                </p>
                <div className="mt-4">
                  <Link
                    href="/courses"
                    className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline"
                  >
                    Browse Course Showcases →
                  </Link>
                </div>
              </div>

              <div className="card-crisp p-6">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-2xl mb-4">
                  ✉️
                </div>
                <h3 className="font-display font-bold text-lg tracking-tight text-slate-900 dark:text-white mb-2">
                  Structured Institutional Outreach
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Deans and department chairs send structured, respectful opportunity requests for adjunct courses, modular intensives, and guest lectures.
                </p>
                <div className="mt-4">
                  <Link
                    href="/scholars?available=true"
                    className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline"
                  >
                    View Available Faculty →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust & Governance Banner */}
        <section id="trust" className="py-16 max-w-5xl mx-auto px-4 sm:px-6">
          <div className="border border-indigo-100 dark:border-indigo-950 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
            <div className="max-w-xl">
              <h3 className="font-display font-bold text-2xl tracking-tight text-slate-900 dark:text-white mb-2">
                A Curated, Admin-Reviewed Community
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                To protect institutional trust, all scholar profiles undergo administrative review before appearing in public searches. Profiles remain live without interruption during subsequent updates.
              </p>
            </div>
            <Link
              href="/scholars"
              className="whitespace-nowrap px-6 py-3 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              Browse Faculty Directory
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
