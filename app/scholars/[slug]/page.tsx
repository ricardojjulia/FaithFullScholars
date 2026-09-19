import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { getPublicScholarBySlug } from '@/lib/domain/queries';
import { formatAdherenceLevel, formatOpportunityType, formatDeliveryMode } from '@/lib/domain/taxonomies';
import { AdherenceLevel } from '@/lib/domain/types';
import { PublicNav } from '@/components/shell/public-nav';
import { PublicFooter } from '@/components/shell/public-footer';

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

  const initials = scholar.full_name
    .replace(/^Dr\.\s*/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex flex-col min-h-screen">
      <PublicNav />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span>/</span>
          <Link href="/scholars" className="hover:underline">
            Scholars
          </Link>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200 font-medium">
            {scholar.full_name}
          </span>
        </nav>

        {/* Academic Profile Header Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-indigo-950 text-amber-300 font-serif font-bold text-3xl sm:text-4xl flex items-center justify-center shrink-0 shadow">
                {initials}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                    {scholar.full_name}
                  </h1>
                  {scholar.verification_status === 'verified' && (
                    <span
                      title="Academic identity and credentials verified by platform review"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900"
                    >
                      ✓ Verified Faculty
                    </span>
                  )}
                </div>

                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {scholar.title || scholar.institutional_role || 'Theological Scholar'}
                </p>

                {scholar.current_institution && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                    <span>🏛️</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {scholar.current_institution}
                    </span>
                    {scholar.institutional_role && ` — ${scholar.institutional_role}`}
                  </p>
                )}

                {scholar.location && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span>📍</span>
                    <span>{scholar.location}</span>
                    {scholar.timezone && <span className="text-slate-400">({scholar.timezone})</span>}
                  </p>
                )}
              </div>
            </div>

            {/* Availability Indicator & Opportunity Action */}
            <div className="flex flex-col sm:items-end gap-3 shrink-0">
              {scholar.availability?.is_available_for_hire && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Available for Teaching / Speaking
                </span>
              )}

              <button
                type="button"
                className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
              >
                Send Institutional Inquiry
              </button>
            </div>
          </div>

          {/* Biography */}
          {scholar.biography && (
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Academic Biography
              </h2>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {scholar.biography}
              </p>
            </div>
          )}

          {/* Disciplines & Traditions Badges */}
          <div className="mt-6 flex flex-wrap gap-2">
            {scholar.disciplines.map(({ discipline, is_primary }) => (
              <span
                key={discipline.id}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  is_primary
                    ? 'bg-indigo-100 text-indigo-900 border border-indigo-200 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {discipline.name} {is_primary && '★'}
              </span>
            ))}

            {scholar.traditions.map(({ tradition, is_primary }) => (
              <span
                key={tradition.id}
                className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium"
              >
                Tradition: {tradition.name} {is_primary && '★'}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column: Credentials, Publications, Courses */}
          <div className="lg:col-span-2 space-y-8">
            {/* Academic Credentials */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h2 className="font-serif font-bold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span>🎓</span> Academic Degrees & Credentials
              </h2>

              {scholar.credentials.length === 0 ? (
                <p className="text-xs text-slate-500">No degrees currently listed.</p>
              ) : (
                <div className="space-y-4">
                  {scholar.credentials.map((cred) => (
                    <div
                      key={cred.id}
                      className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 last:border-none pb-3 last:pb-0"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {cred.degree} in {cred.field_of_study}
                          </span>
                          {cred.is_terminal && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                              Terminal Degree
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          {cred.institution_name}
                        </p>
                      </div>

                      {cred.year_awarded && (
                        <span className="text-xs font-medium text-slate-400">
                          {cred.year_awarded}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Publications */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h2 className="font-serif font-bold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span>📚</span> Publications & Scholarship
              </h2>

              {scholar.publications.length === 0 ? (
                <p className="text-xs text-slate-500">No publications currently listed.</p>
              ) : (
                <div className="space-y-4">
                  {scholar.publications.map((pub) => (
                    <div
                      key={pub.id}
                      className="border-b border-slate-100 dark:border-slate-800 last:border-none pb-4 last:pb-0"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                          {pub.publication_type.replace(/_/g, ' ')}
                        </span>
                        {pub.year && (
                          <span className="text-xs text-slate-400 font-medium">
                            {pub.year}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {pub.title}
                      </h3>

                      {pub.citation_text ? (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic font-serif">
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

            {/* Courses Offered */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h2 className="font-serif font-bold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span>📖</span> Course Syllabi & Teaching Showcase
              </h2>

              {scholar.courses.length === 0 ? (
                <p className="text-xs text-slate-500">No public courses currently listed.</p>
              ) : (
                <div className="space-y-4">
                  {scholar.courses.map((course) => (
                    <div
                      key={course.id}
                      className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {course.level}
                        </span>
                        <Link
                          href={`/courses/${course.slug}`}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                        >
                          View Syllabus →
                        </Link>
                      </div>

                      <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white">
                        {course.title}
                      </h3>

                      {course.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                          {course.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {course.delivery_modes.map((mode) => (
                          <span
                            key={mode}
                            className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
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
          </div>

          {/* Sidebar: Doctrinal Statement, Confessional Standards, Availability */}
          <div className="space-y-6">
            {/* Doctrinal Statement Card (ADR 0001) */}
            {scholar.doctrinal_statement_text && (
              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <span>✝️</span> Doctrinal Statement
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-serif bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  &ldquo;{scholar.doctrinal_statement_text}&rdquo;
                </p>
              </section>
            )}

            {/* Confessional Standards Affirmations */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <span>📜</span> Confessional Alignment
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Historic Christian standards explicitly affirmed by the scholar:
              </p>

              {scholar.confessions.length === 0 ? (
                <p className="text-xs text-slate-400">No confessions affirmed.</p>
              ) : (
                <div className="space-y-3">
                  {scholar.confessions.map((c) => (
                    <div
                      key={c.confessional_standard.id}
                      className="border-b border-slate-100 dark:border-slate-800 last:border-none pb-3 last:pb-0"
                    >
                      <h4 className="font-semibold text-xs text-slate-900 dark:text-white">
                        {c.confessional_standard.name}
                        {c.confessional_standard.year && ` (${c.confessional_standard.year})`}
                      </h4>
                      <p className="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium mt-0.5">
                        {formatAdherenceLevel(c.adherence_level as AdherenceLevel)}
                      </p>
                      {c.exception_notes && (
                        <p className="text-[11px] text-slate-500 mt-1 bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-900">
                          Exception note: {c.exception_notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Availability & Institutional Terms */}
            {scholar.availability && (
              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
                <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span>📅</span> Teaching Opportunities
                </h3>

                <div>
                  <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Open To:
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {scholar.availability.opportunity_types.map((type) => (
                      <span
                        key={type}
                        className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300 text-xs font-medium"
                      >
                        {formatOpportunityType(type)}
                      </span>
                    ))}
                  </div>
                </div>

                {scholar.availability.available_terms.length > 0 && (
                  <div className="pt-2">
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
                      {scholar.availability.notes}
                    </p>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
