import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { BookOpen, GraduationCap, Library, BookMarked, Calendar, Star, ShieldCheck } from 'lucide-react';
import { getPublicScholarBySlug } from '@/lib/domain/queries';
import { formatOpportunityType, formatDeliveryMode } from '@/lib/domain/taxonomies';
import { PublicNav } from '@/components/shell/public-nav';
import { PublicFooter } from '@/components/shell/public-footer';
import { ScholarProfileHero } from '@/components/scholars/scholar-profile-hero';
import { ScholarDoctrinalCard } from '@/components/scholars/scholar-doctrinal-card';
import { ScholarEndorsementsCard } from '@/components/scholars/scholar-endorsements-card';
import { getApprovedEndorsements } from '@/lib/endorsements/endorsement-service';
import { getInstitutionalEndorsementsForScholar } from '@/lib/endorsements/institutional-endorsement-service';

interface ScholarProfilePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ScholarProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  const scholar = await getPublicScholarBySlug(slug);

  if (!scholar) {
    return {
      title: 'Scholar Not Found | FaithFull Scholars',
    };
  }

  return {
    title: `${scholar.full_name} | FaithFull Scholars`,
    description:
      scholar.biography?.slice(0, 160) ||
      `Academic profile and theological teaching credentials for ${scholar.full_name}.`,
  };
}

export default async function ScholarProfilePage({
  params,
}: ScholarProfilePageProps) {
  const { slug } = await params;
  const scholar = await getPublicScholarBySlug(slug);

  if (!scholar) {
    notFound();
  }

  const endorsements = await getApprovedEndorsements(scholar.id);
  const institutionalEndorsements = await getInstitutionalEndorsementsForScholar(scholar.id);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/60 dark:bg-slate-950">
      <PublicNav />

      <main className="flex-1 max-w-6xl mx-auto w-full px-3 sm:px-6 py-6 sm:py-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-4 px-1">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span>/</span>
          <Link href="/scholars" className="hover:underline">
            Faculty
          </Link>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200 font-medium">
            {scholar.full_name}
          </span>
        </nav>

        {/* 1. LinkedIn-Style Anchor Hero Card (Cover Banner + Avatar + Headline + Action Toolbar) */}
        <ScholarProfileHero scholar={scholar} />

        {/* 2. Balanced Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Column (8 of 12): About, Education, Publications, Courses */}
          <div className="lg:col-span-8 space-y-6">
            {/* About / Academic Biography Card */}
            {scholar.biography && (
              <section className="card-crisp p-6 sm:p-8">
                <h2 className="font-display font-bold text-lg tracking-tight text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400 stroke-[1.75]" />
                  <span>Academic Biography & Research Overview</span>
                </h2>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {scholar.biography}
                </p>

                {/* Primary Fields Tags */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
                  {scholar.disciplines.map(({ discipline, is_primary }) => (
                    <span
                      key={discipline.id}
                      className={`px-3 py-1 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 ${
                        is_primary
                          ? 'bg-indigo-50 text-indigo-900 border border-indigo-200 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span>{discipline.name}</span>
                      {is_primary && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                    </span>
                  ))}

                  {scholar.traditions.map(({ tradition, is_primary }) => (
                    <span
                      key={tradition.id}
                      className="px-3 py-1 rounded-xl text-xs bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium inline-flex items-center gap-1.5"
                    >
                      <span>Tradition: {tradition.name}</span>
                      {is_primary && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Education & Terminal Degrees Card */}
            <section className="card-crisp p-6 sm:p-8">
              <h2 className="font-display font-bold text-lg tracking-tight text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400 stroke-[1.75]" />
                <span>Education & Terminal Degrees</span>
              </h2>

              {scholar.credentials.length === 0 ? (
                <p className="text-xs text-slate-500">No degrees currently listed.</p>
              ) : (
                <div className="space-y-4">
                  {scholar.credentials.map((cred) => (
                    <div
                      key={cred.id}
                      className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 last:border-none pb-4 last:pb-0"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {cred.degree} in {cred.field_of_study}
                          </span>
                          {cred.is_terminal && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                              Terminal Degree
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {cred.institution_name}
                        </p>
                      </div>

                      {cred.year_awarded && (
                        <span className="text-xs font-medium text-slate-400 font-mono shrink-0">
                          {cred.year_awarded}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Publications & Scholarly Monographs Card */}
            <section className="card-crisp p-6 sm:p-8">
              <h2 className="font-display font-bold text-lg tracking-tight text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                <Library className="w-5 h-5 text-indigo-600 dark:text-indigo-400 stroke-[1.75]" />
                <span>Publications & Scholarly Output</span>
              </h2>

              {scholar.publications.length === 0 ? (
                <p className="text-xs text-slate-500">No publications listed.</p>
              ) : (
                <div className="space-y-4">
                  {scholar.publications.map((pub) => (
                    <div
                      key={pub.id}
                      className="border-b border-slate-100 dark:border-slate-800 last:border-none pb-4 last:pb-0"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          {pub.publication_type.replace(/_/g, ' ')}
                        </span>
                        {pub.year && (
                          <span className="text-xs text-slate-400 font-mono">
                            {pub.year}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {pub.title}
                      </h3>

                      {pub.citation_text ? (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-literary italic">
                          {pub.citation_text}
                        </p>
                      ) : (
                        pub.publisher_or_journal && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {pub.publisher_or_journal}
                          </p>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Course Showcase & Inspectable Syllabi Card */}
            <section className="card-crisp p-6 sm:p-8">
              <h2 className="font-display font-bold text-lg tracking-tight text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-indigo-600 dark:text-indigo-400 stroke-[1.75]" />
                <span>Prepared Course Syllabi & Lecture Showcases</span>
              </h2>

              {scholar.courses.length === 0 ? (
                <p className="text-xs text-slate-500">No public courses currently listed.</p>
              ) : (
                <div className="space-y-4">
                  {scholar.courses.map((course) => (
                    <div
                      key={course.id}
                      className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors bg-white dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {course.level} Level
                        </span>
                        <Link
                          href={`/courses/${course.slug}`}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                        >
                          Inspect Syllabus →
                        </Link>
                      </div>

                      <h3 className="font-display font-bold text-base tracking-tight text-slate-900 dark:text-white">
                        {course.title}
                      </h3>

                      {course.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                          {course.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {course.delivery_modes.map((mode) => (
                          <span
                            key={mode}
                            className="px-2.5 py-0.5 rounded-lg text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          >
                            {formatDeliveryMode(mode)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Peer Endorsements & Faculty Commendations Card (§21) */}
            <ScholarEndorsementsCard
              scholarId={scholar.id}
              scholarName={scholar.full_name}
              initialEndorsements={endorsements}
              initialInstitutionalEndorsements={institutionalEndorsements}
            />
          </div>

          {/* Sidebar Column (4 of 12): Doctrinal Stance & Teaching Terms */}
          <div className="lg:col-span-4 space-y-6">
            {/* Doctrinal Alignment Card (ADR 0001) */}
            <ScholarDoctrinalCard scholar={scholar} />

            {/* Teaching Opportunities & Availability Terms Card */}
            {scholar.availability && (
              <section className="card-crisp p-6 space-y-4">
                <h3 className="font-display font-bold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400 stroke-[1.75]" />
                  <span>Institutional Availability</span>
                </h3>

                <div>
                  <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Open To:
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {scholar.availability.opportunity_types.map((type) => (
                      <span
                        key={type}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300 text-xs font-medium"
                      >
                        {formatOpportunityType(type)}
                      </span>
                    ))}
                  </div>
                </div>

                {scholar.availability.available_terms.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Available Terms:
                    </h4>
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      {scholar.availability.available_terms.join(', ')}
                    </p>
                  </div>
                )}

                {scholar.availability.notes && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-500 italic">
                      &ldquo;{scholar.availability.notes}&rdquo;
                    </p>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
                    <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Verified Institutional Outreach</span>
                    </div>
                    <div>
                      Direct emails and contact data are protected. Accredited deans and department chairs initiate contact via structured inquiry.
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
