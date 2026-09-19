import { Metadata } from 'next';
import { getPublicScholars, getTaxonomies } from '@/lib/domain/queries';
import { ScholarCard } from '@/components/scholars/scholar-card';
import { ScholarFilters } from '@/components/scholars/scholar-filters';
import { PublicNav } from '@/components/shell/public-nav';
import { PublicFooter } from '@/components/shell/public-footer';

export const metadata: Metadata = {
  title: 'Faculty Directory | FaithFull Scholars',
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
  }>;
}

export default async function ScholarsPage({ searchParams }: ScholarsPageProps) {
  const params = await searchParams;

  const filters = {
    search: params.search,
    discipline: params.discipline,
    tradition: params.tradition,
    confession: params.confession,
    availableForHire: params.available === 'true',
  };

  const [scholars, taxonomies] = await Promise.all([
    getPublicScholars(filters),
    getTaxonomies(),
  ]);

  return (
    <div className="flex flex-col min-h-screen">
      <PublicNav />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:border-indigo-900 dark:text-indigo-300 text-xs font-semibold mb-2">
                <span>🎓</span> Verified Academic Directory
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
                Theological Faculty & Scholars
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Discover qualified scholars available for adjunct teaching, modular intensives, curriculum review, and guest lectures.
              </p>
            </div>

            <div className="text-sm text-slate-500 font-medium">
              Showing <strong className="text-slate-900 dark:text-white">{scholars.length}</strong> verified faculty
            </div>
          </div>
        </div>

        {/* Layout: Filters on Left, Grid on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <div className="sticky top-24">
              <ScholarFilters
                disciplines={taxonomies.disciplines}
                traditions={taxonomies.traditions}
                confessionalStandards={taxonomies.confessionalStandards}
              />
            </div>
          </aside>

          <section className="lg:col-span-3">
            {scholars.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <div className="text-3xl">🔍</div>
                <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-white">
                  No Scholars Found
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  No approved faculty match your current filter selection. Try removing one or more filters or clearing your search term.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {scholars.map((scholar) => (
                  <ScholarCard key={scholar.id} scholar={scholar} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
