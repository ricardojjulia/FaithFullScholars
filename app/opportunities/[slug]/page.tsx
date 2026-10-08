import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  Briefcase,
  Building2,
  MapPin,
  Calendar,
  Clock,
  GraduationCap,
  ArrowLeft,
  ShieldCheck,
  DollarSign,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { PublicNav } from '@/components/shell/public-nav';
import { PublicFooter } from '@/components/shell/public-footer';
import { getPostingBySlug, formatOpportunityType } from '@/lib/postings/postings-service';
import { ApplyPanel } from '@/components/opportunities/apply-panel';
import { createClient } from '@/lib/supabase/server';
import { loadApplyState } from '@/lib/postings/apply-state';
import { serializeJsonLd } from '@/lib/seo/json-ld';

interface OpportunityPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: OpportunityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const posting = await getPostingBySlug(slug);

  if (!posting) {
    return {
      title: 'Opportunity Not Found | FaithFull Scholars',
    };
  }

  return {
    title: `${posting.title} | ${posting.institution?.name || 'Academic Opportunity'} | FaithFull Scholars`,
    description: `${posting.title} at ${posting.institution?.name || 'Accredited Seminary'}. ${posting.description.slice(0, 150)}...`,
  };
}

export default async function OpportunityDetailPage({ params }: OpportunityPageProps) {
  const { slug } = await params;
  const posting = await getPostingBySlug(slug);

  if (!posting) {
    notFound();
  }

  // Schema.org JobPosting structured metadata
  // What this visitor can do here, decided from their own session and rows.
  const applyState = await loadApplyState(await createClient(), { id: posting.id, status: posting.status });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: posting.title,
    description: posting.description,
    datePosted: posting.created_at,
    validThrough: posting.deadline || undefined,
    employmentType:
      posting.opportunity_type === 'full_time_tenure_track'
        ? 'FULL_TIME'
        : 'PART_TIME',
    hiringOrganization: {
      '@type': 'EducationalOrganization',
      name: posting.institution?.name || 'FaithFull Scholars Partner Institution',
      sameAs: posting.institution?.website || undefined,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: posting.institution?.location || 'United States',
      },
    },
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/60 dark:bg-slate-950">
      <PublicNav />

      {/* JSON-LD Script Tag */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span>/</span>
          <Link href="/opportunities" className="hover:underline">
            Opportunities
          </Link>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-xs">
            {posting.title}
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Column (8 of 12) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Header Card */}
            <div className="card-crisp bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  {formatOpportunityType(posting.opportunity_type)}
                </span>
                {posting.discipline && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {posting.discipline.name}
                  </span>
                )}
                {posting.tradition && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {posting.tradition.name}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
                {posting.title}
              </h1>

              <div className="flex flex-wrap items-center gap-5 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                  <Building2 className="w-4 h-4 text-indigo-500" />
                  <span>{posting.institution?.name || 'Accredited Seminary'}</span>
                </div>
                {posting.institution?.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{posting.institution.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Term: {posting.term}</span>
                </div>
              </div>
            </div>

            {/* Position Description */}
            <section className="card-crisp bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Opportunity Overview & Scope</span>
              </h2>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {posting.description}
              </p>
            </section>

            {/* Academic & Confessional Requirements */}
            <section className="card-crisp bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>Qualifications & Confessional Standard</span>
              </h2>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                  <GraduationCap className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">Required Terminal Degree</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{posting.required_degree}</p>
                  </div>
                </div>

                {posting.confessional_requirements && (
                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                    <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">Institutional Confessional Standard</h3>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                        {posting.confessional_requirements}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Compensation & Delivery Terms */}
            {posting.compensation_notes && (
              <section className="card-crisp bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-3">
                <h2 className="text-sm font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Stipend & Teaching Terms</span>
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {posting.compensation_notes}
                </p>
              </section>
            )}
          </div>

          {/* Sidebar Column (4 of 12) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Express Interest Action Box */}
            <div className="card-crisp bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/60 rounded-3xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-display font-bold text-slate-900 dark:text-white">
                Interested in Teaching?
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Send your approved academic profile, sealed as a dossier with a note on your confessional stance, directly to the search committee.
              </p>

              <ApplyPanel
                state={applyState}
                postingId={posting.id}
                postingTitle={posting.title}
                institutionName={posting.institution?.name || 'Institution'}
              />

              {posting.deadline && (
                <div className="pt-3 border-t border-indigo-100 dark:border-indigo-900/40 flex items-center gap-2 text-[11px] text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Application Deadline: {posting.deadline}</span>
                </div>
              )}
            </div>

            {/* Sponsoring Institution Card */}
            <div className="card-crisp bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                    {posting.institution?.name || 'Accredited Seminary'}
                  </h3>
                  <p className="text-[11px] text-slate-500 capitalize">
                    {posting.institution?.institution_type || 'Theological Institution'}
                  </p>
                </div>
              </div>

              {posting.institution?.location && (
                <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{posting.institution.location}</span>
                </div>
              )}

              {posting.institution?.website && (
                <a
                  href={posting.institution.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline pt-2 border-t border-slate-100 dark:border-slate-800 w-full"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Visit Institutional Portal</span>
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </a>
              )}
            </div>

            <Link
              href="/opportunities"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to All Opportunities</span>
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
