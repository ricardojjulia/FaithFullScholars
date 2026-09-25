import Link from 'next/link';
import { Metadata } from 'next';
import { Briefcase, Building2, MapPin, Calendar, ArrowRight, ShieldCheck } from 'lucide-react';
import { PublicNav } from '@/components/shell/public-nav';
import { PublicFooter } from '@/components/shell/public-footer';
import { getAllPublishedPostings, formatOpportunityType, OpportunityType } from '@/lib/postings/postings-service';

export const metadata: Metadata = {
  title: 'Academic Opportunities & Faculty Postings | FaithFull Scholars',
  description:
    'Discover teaching vacancies, adjunct appointments, intensive modular courses, and sabbatical replacements at accredited theological institutions.',
};

interface OpportunitiesPageProps {
  searchParams: Promise<{
    type?: string;
    discipline?: string;
    tradition?: string;
  }>;
}

export default async function OpportunitiesPage({ searchParams }: OpportunitiesPageProps) {
  const { type, discipline, tradition } = await searchParams;

  const postings = await getAllPublishedPostings({
    opportunityType: type,
    disciplineSlug: discipline,
    traditionSlug: tradition,
  });

  const opportunityTypes: { value: OpportunityType | 'all'; label: string }[] = [
    { value: 'all', label: 'All Opportunities' },
    { value: 'adjunct', label: 'Adjunct Teaching' },
    { value: 'modular_intensive', label: 'Modular Intensives' },
    { value: 'full_time_tenure_track', label: 'Full-Time / Tenure Track' },
    { value: 'sabbatical_cover', label: 'Sabbatical Cover' },
    { value: 'sabbatical_exchange', label: 'SabbaticalSwap (Exchanges)' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/60 dark:bg-slate-950">
      <PublicNav />

      {/* Hero Header */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Academic Opportunities & Faculty Needs</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
            Theological Faculty Appointments & Teaching Calls
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Accredited seminaries, Bible colleges, and universities seeking confessionally aligned faculty for adjunct appointments, modular intensives, and full-time chairs.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            {opportunityTypes.map((opt) => {
              const isActive = (opt.value === 'all' && !type) || type === opt.value;
              const href = opt.value === 'all' ? '/opportunities' : `/opportunities?type=${opt.value}`;
              return (
                <Link
                  key={opt.value}
                  href={href}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </Link>
              );
            })}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-900 dark:text-white">{postings.length}</strong> available position{postings.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Postings Grid */}
        {postings.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8 space-y-3">
            <Briefcase className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No active postings match your filter</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Check back soon or broaden your search criteria. Accredited institutions post new semester teaching calls regularly.
            </p>
            <Link
              href="/opportunities"
              className="inline-block mt-2 px-4 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl"
            >
              Reset Filters
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {postings.map((posting) => (
              <div
                key={posting.id}
                className="card-crisp bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                        {formatOpportunityType(posting.opportunity_type)}
                      </span>
                      {posting.discipline && (
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {posting.discipline.name}
                        </span>
                      )}
                      {posting.tradition && (
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {posting.tradition.name}
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white tracking-tight">
                      <Link href={`/opportunities/${posting.slug}`} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        {posting.title}
                      </Link>
                    </h2>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{posting.institution?.name || 'Accredited Seminary'}</span>
                      </div>
                      {posting.institution?.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{posting.institution.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{posting.term}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/opportunities/${posting.slug}`}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shrink-0 shadow-xs"
                  >
                    <span>View Opportunity</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {posting.description}
                </p>

                {posting.confessional_requirements && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>
                      <strong className="text-slate-700 dark:text-slate-300">Confessional Standard:</strong> {posting.confessional_requirements}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
