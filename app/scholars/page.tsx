import { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { Clock, Lock, Search } from 'lucide-react';
import { getPublicScholars, getTaxonomies, MAX_ANONYMOUS_SEARCH_PAGES } from '@/lib/domain/queries';
import { ScholarCard } from '@/components/scholars/scholar-card';
import { ScholarFilters } from '@/components/scholars/scholar-filters';
import { ScholarRecommendationsRail } from '@/components/scholars/scholar-recommendations-rail';
import { ScholarDirectoryHeader } from '@/components/scholars/scholar-directory-header';
import { createClient } from '@/lib/supabase/server';
import { checkSearchRequest, retryAfterSeconds } from '@/lib/search/rate-limiter';
import { PublicNav } from '@/components/shell/public-nav';
import { PublicFooter } from '@/components/shell/public-footer';

// Rate limiting reads request headers, so this page must never be statically cached.
export const dynamic = 'force-dynamic';

const BASE_METADATA: Metadata = {
  title: 'Theological Faculty Directory | FaithFull Scholars',
  description:
    'Discover accredited theological professors, doctoral supervisors, and adjunct faculty filtered by discipline, tradition, and confessional standards.',
};

/**
 * Every request that carries search or filter parameters is noindex, which
 * includes any rate-limited response (its state is never a page worth indexing).
 * Metadata deliberately does not call the limiter, so it never double-counts.
 */
export async function generateMetadata({ searchParams }: ScholarsPageProps): Promise<Metadata> {
  const params = await searchParams;
  return hasSearchParams(params) ? { ...BASE_METADATA, robots: { index: false, follow: false } } : BASE_METADATA;
}

function hasSearchParams(params: Awaited<ScholarsPageProps['searchParams']>): boolean {
  return Boolean(
    params.search || params.discipline || params.tradition || params.confession || params.available || params.page
  );
}

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

  // Rate limit (ADR 0008 / 0026): only requests that carry search or filter
  // parameters count. A page cannot set a status code, so the rendered state is
  // the response. Reads fail open: a limiter error never takes search down.
  let retryAfter: number | null = null;
  if (hasSearchParams(params) && !isPageGated) {
    // An auth error must not take search down: fall back to the anonymous key.
    let userId: string | null = null;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      console.error('Search rate limit: session lookup failed; using the anonymous key');
    }
    const limit = await checkSearchRequest(await headers(), userId);
    if (!limit.allowed) retryAfter = retryAfterSeconds(limit);
  }
  const isRateLimited = retryAfter !== null;

  const [scholars, taxonomies] = await Promise.all([
    isPageGated || isRateLimited ? Promise.resolve([]) : getPublicScholars(filters),
    getTaxonomies(),
  ]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/60 dark:bg-slate-950">
      <PublicNav />

      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-6 sm:py-8">
        {/* Dynamic Page Banner Header */}
        <ScholarDirectoryHeader totalCount={scholars.length} />

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
            {isRateLimited ? (
              <div
                role="alert"
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center shadow-xs space-y-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                  <Clock className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="font-display font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                  Search paused
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  You&apos;re searching quickly. Please wait {retryAfter} {retryAfter === 1 ? 'second' : 'seconds'} and try again.
                </p>
              </div>
            ) : isPageGated ? (
              /* Anti-Harvesting Deep Pagination Wall (ADR 0008) */
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 text-center shadow-xs space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-300 flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-900 shadow-inner">
                  <Lock className="w-7 h-7 text-indigo-700 dark:text-indigo-400" />
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
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                  <Search className="w-6 h-6" />
                </div>
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
