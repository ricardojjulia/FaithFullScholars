import { Metadata } from 'next';
import Link from 'next/link';
import { getPublicScholars, getTaxonomies, MAX_ANONYMOUS_SEARCH_PAGES } from '@/lib/domain/queries';
import { ScholarCard } from '@/components/scholars/scholar-card';
import { ScholarFilters } from '@/components/scholars/scholar-filters';
import { ScholarRecommendationsRail } from '@/components/scholars/scholar-recommendations-rail';
import { AiMatcherTriggerButton } from '@/components/scholars/ai-matcher-trigger-button';
import { PublicNav } from '@/components/shell/public-nav';
import { PublicFooter } from '@/components/shell/public-footer';

export const metadata: Metadata = {
  title: 'Theological Faculty Directory | FaithFull Scholars',
  description:
    'Discover accredited theological professors, doctoral supervisors, and adjunct faculty filtered by discipline, tradition, and confessional standards.',
};

interface ScholarsPageProps {
  searchParams: Promise<{
    search?: string;
    discipline?: string;
    tradition?: string;
    confession?: string;
    available?: string;
    page?: string;
  }>;
}

export default async function ScholarsPage({ searchParams }: ScholarsPageProps) {
  const params = await searchParams;
  const currentPage = parseInt(params.page || '1', 10);
  const isPageGated = currentPage > MAX_ANONYMOUS_SEARCH_PAGES;

  const filters = {
    search: params.search,
    discipline: params.discipline,
    tradition: params.tradition,
    confession: params.confession,
    availableForHire: params.available === 'true',
    page: currentPage,
  };

  const [scholars, taxonomies] = await Promise.all([
    isPageGated ? Promise.resolve([]) : getPublicScholars(filters),
    getTaxonomies(),
  ]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/60 dark:bg-slate-950">
      <PublicNav />

      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-6 sm:py-8">
        {/* Page Banner Header */}
        <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:border-indigo-900 dark:text-indigo-300 text-xs font-semibold mb-1">
              <span>🎓</span> Verified Faculty Directory
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Theological Faculty Network
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Accredited professors, adjunct faculty, and doctoral supervisors with verified confessional alignment.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <AiMatcherTriggerButton />
            <div className="text-xs text-slate-500 font-medium bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              Showing <strong className="text-slate-900 dark:text-white">{scholars.length}</strong> verified faculty
            </div>
          </div>
        </div>

        {/* LinkedIn-Style 3-Column Balanced Desktop Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (3 of 12): Filters & Mini Profile Card */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-6">
            <div className="sticky top-20 space-y-6">
              <ScholarFilters
                disciplines={taxonomies.disciplines}
                traditions={taxonomies.traditions}
                confessionalStandards={taxonomies.confessionalStandards}
              />
            </div>
          </aside>

          {/* Center Column (5 or 6 of 12): Main Content Feed */}
          <section className="lg:col-span-8 xl:col-span-6 space-y-6">
            {isPageGated ? (
              /* Anti-Harvesting Deep Pagination Wall (ADR 0008) */
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 text-center shadow-xs space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-300 text-3xl flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-900">
                  🔒
                </div>
                <h3 className="font-display font-bold text-xl tracking-tight text-slate-900 dark:text-white">
                  Create a Free Account to View More Faculty
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  To protect our faculty community from automated data scraping and spam, browsing beyond page {MAX_ANONYMOUS_SEARCH_PAGES} requires a free verified account.
                </p>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    className="w-full sm:w-auto px-6 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    Sign In to Continue
                  </button>
                  <Link
                    href="/scholars"
                    className="w-full sm:w-auto px-5 py-2.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors text-center"
                  >
                    Back to Page 1
                  </Link>
                </div>
              </div>
            ) : scholars.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3 shadow-xs">
                <div className="text-3xl">🔍</div>
                <h3 className="font-display font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                  No Scholars Found
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  No approved faculty match your current filter selection. Try adjusting your search term or clearing one of the filters.
                </p>
                <div className="pt-2">
                  <Link
                    href="/scholars"
                    className="px-4 py-2 bg-indigo-900 text-white rounded-xl text-xs font-semibold hover:bg-indigo-800 transition-colors inline-block"
                  >
                    Reset All Filters
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {scholars.map((scholar) => (
                  <ScholarCard key={scholar.id} scholar={scholar} />
                ))}
              </div>
            )}
          </section>

          {/* Right Column (3 of 12): Institutional Recommendations & Trust Rail */}
          <aside className="hidden xl:block xl:col-span-3">
            <div className="sticky top-20">
              <ScholarRecommendationsRail />
            </div>
          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
