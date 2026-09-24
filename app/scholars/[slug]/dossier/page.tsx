import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  GraduationCap,
  ScrollText,
  BookOpen,
  Award,
  Video,
  ArrowLeft,
  Building2,
  MapPin,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { getScholarDossierData } from '@/lib/profiles/dossier-service';
import { PublicNav } from '@/components/shell/public-nav';
import { PublicFooter } from '@/components/shell/public-footer';
import { DistinguishedBadge } from '@/components/scholars/distinguished-badge';
import { DossierPrintButton } from '@/components/scholars/dossier-print-button';
import { formatDeliveryMode } from '@/lib/domain/taxonomies';

interface DossierPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: DossierPageProps): Promise<Metadata> {
  const { slug } = await params;
  const dossier = await getScholarDossierData(slug);

  if (!dossier) {
    return {
      title: 'Dossier Not Found | FaithFull Scholars',
    };
  }

  return {
    title: `Academic Dossier — ${dossier.full_name} | FaithFull Scholars`,
    description: `Official search committee academic dossier and curriculum vitae for ${dossier.full_name}, ${dossier.title || 'Theological Scholar'}.`,
  };
}

export default async function ScholarDossierPage({ params }: DossierPageProps) {
  const { slug } = await params;
  const dossier = await getScholarDossierData(slug);

  if (!dossier) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 print:bg-white print:text-black">
      {/* Public Nav (Hidden during print) */}
      <div className="print:hidden">
        <PublicNav />
      </div>

      {/* Screen Toolbar / Controls Banner (Hidden during print) */}
      <div className="print:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href={`/scholars/${dossier.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Profile</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Optimized for physical printing & ATS search committee review
            </span>
            <DossierPrintButton />
          </div>
        </div>
      </div>

      {/* Main Dossier Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full my-6 sm:my-8 px-4 sm:px-8 print:p-0 print:m-0 print:max-w-full">
        {/* Printable Paper Canvas */}
        <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-8 sm:p-12 print:border-none print:shadow-none print:p-0 print:bg-white print:text-black space-y-10">
          {/* Header & Academic Identifiers */}
          <header className="border-b-2 border-slate-900 dark:border-slate-100 pb-8 print:border-black">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 dark:text-white print:text-black">
                    {dossier.full_name}
                  </h1>
                  {dossier.profile_tier === 'distinguished_fellow' && (
                    <DistinguishedBadge size="default" />
                  )}
                  {dossier.verification_status === 'verified' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 print:border-black print:text-black">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified Faculty
                    </span>
                  )}
                </div>

                <p className="text-base sm:text-lg font-medium text-slate-700 dark:text-slate-300 print:text-black">
                  {dossier.title || dossier.institutional_role || 'Theological Scholar'}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 print:text-black pt-1">
                  {dossier.current_institution && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{dossier.current_institution}</span>
                    </span>
                  )}
                  {dossier.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{dossier.location}</span>
                    </span>
                  )}
                  {dossier.orcid_id && (
                    <span className="font-mono text-slate-700 dark:text-slate-300 print:text-black">
                      ORCID: {dossier.orcid_id}
                    </span>
                  )}
                </div>
              </div>

              {/* Watermark / Seal */}
              <div className="shrink-0 text-right sm:text-right">
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 print:text-black">
                  Candidate Dossier
                </div>
                <div className="text-xs font-semibold text-indigo-950 dark:text-indigo-400 print:text-black">
                  FaithFull Scholars Record
                </div>
                <div className="text-[10px] text-slate-500 print:text-black mt-0.5">
                  Ref: {dossier.slug}
                </div>
              </div>
            </div>

            {/* Disciplines & Traditions Summary */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 print:border-black">
              {dossier.disciplines.map((d) => (
                <span
                  key={d.discipline.id}
                  className="px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 print:border print:border-black print:bg-white print:text-black"
                >
                  {d.discipline.name}
                </span>
              ))}
              {dossier.traditions.map((t) => (
                <span
                  key={t.tradition.id}
                  className="px-2.5 py-0.5 rounded text-xs font-medium bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-300 print:border print:border-black print:bg-white print:text-black"
                >
                  {t.tradition.name}
                </span>
              ))}
            </div>
          </header>

          {/* 1. Academic Biography & Research Statement */}
          {dossier.biography && (
            <section className="space-y-3 print:break-inside-avoid">
              <h2 className="font-serif text-lg font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-2 print:border-black print:text-black">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 print:hidden" />
                <span>Academic Biography & Research Overview</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 print:text-black leading-relaxed whitespace-pre-wrap font-serif">
                {dossier.biography}
              </p>
            </section>
          )}

          {/* 2. Academic Credentials & Degrees */}
          <section className="space-y-4 print:break-inside-avoid">
            <h2 className="font-serif text-lg font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-2 print:border-black print:text-black">
              <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 print:hidden" />
              <span>Academic Credentials & Degrees</span>
            </h2>
            {dossier.credentials.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No formal credentials listed.</p>
            ) : (
              <div className="space-y-2.5">
                {dossier.credentials.map((cred) => (
                  <div
                    key={cred.id}
                    className="flex flex-col sm:flex-row sm:items-baseline justify-between text-xs sm:text-sm border-l-2 border-indigo-600 dark:border-indigo-400 pl-3 py-0.5 print:border-black"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white print:text-black">
                        {cred.degree}
                      </span>
                      {cred.field_of_study && <span> in {cred.field_of_study}</span>}
                      <span className="text-slate-600 dark:text-slate-400 print:text-black">
                        {' '}
                        — {cred.institution_name}
                      </span>
                      {cred.is_terminal && (
                        <span className="ml-2 text-[10px] font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider print:text-black">
                          (Terminal Degree)
                        </span>
                      )}
                    </div>
                    {cred.year_awarded && (
                      <span className="text-xs font-mono text-slate-500 print:text-black shrink-0 sm:ml-4">
                        {cred.year_awarded}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3. Confessional Affiliations & Doctrinal Adherence */}
          <section className="space-y-4 print:break-inside-avoid">
            <h2 className="font-serif text-lg font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-2 print:border-black print:text-black">
              <ScrollText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 print:hidden" />
              <span>Confessional Standards & Doctrinal Affirmation</span>
            </h2>
            {dossier.confessions.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No confessional standards recorded.</p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dossier.confessions.map((c) => (
                    <div
                      key={c.confessional_standard.id}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 print:border-black print:bg-white"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white print:text-black">
                        <span>{c.confessional_standard.name}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 print:text-black">
                          {c.adherence_level}
                        </span>
                      </div>
                      {c.exception_notes && (
                        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 print:text-black italic">
                          Notes/Exceptions: {c.exception_notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {dossier.doctrinal_statement_text && (
                  <div className="mt-3 p-4 rounded-lg bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 print:border-black print:bg-white">
                    <h3 className="text-xs font-bold text-amber-950 dark:text-amber-200 print:text-black uppercase tracking-wider mb-1">
                      Personal Doctrinal Affirmation Summary
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 print:text-black leading-relaxed whitespace-pre-wrap font-serif">
                      {dossier.doctrinal_statement_text}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 4. Publications & Research Monograph Bibliography (SBL / Chicago Style) */}
          <section className="space-y-4 print:break-inside-avoid">
            <h2 className="font-serif text-lg font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-2 print:border-black print:text-black">
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 print:hidden" />
              <span>Select Publications & Research Bibliography (SBL Handbook of Style)</span>
            </h2>
            {dossier.publications.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No publications listed.</p>
            ) : (
              <ol className="list-decimal list-outside pl-5 space-y-2 text-xs sm:text-sm font-serif leading-relaxed text-slate-800 dark:text-slate-200 print:text-black">
                {dossier.publications.map((pub) => (
                  <li key={pub.id} className="pl-1">
                    <span>{pub.sblCitation}</span>
                    <span className="ml-2 text-[10px] font-sans text-slate-500 uppercase tracking-wider print:hidden">
                      [{pub.publication_type.replace('_', ' ')}]
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* 5. Curated Course Showcases */}
          {dossier.courses.length > 0 && (
            <section className="space-y-4 print:break-inside-avoid">
              <h2 className="font-serif text-lg font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-2 print:border-black print:text-black">
                <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400 print:hidden" />
                <span>Curated Teaching Syllabi & Course Offerings</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dossier.courses.map((course) => (
                  <div
                    key={course.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 print:border-black print:bg-white"
                  >
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white print:text-black">
                      {course.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-600 dark:text-slate-400 print:text-black">
                      <span className="font-semibold uppercase tracking-wider">Level:</span>
                      <span className="capitalize">{course.level}</span>
                      <span className="mx-1">•</span>
                      <span className="font-semibold uppercase tracking-wider">Formats:</span>
                      <span>{course.delivery_modes.map(formatDeliveryMode).join(', ')}</span>
                    </div>
                    {course.description && (
                      <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-400 print:text-black line-clamp-2">
                        {course.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 6. Spoken Homiletics & Lecture Media Index */}
          {dossier.media_links.length > 0 && (
            <section className="space-y-4 print:break-inside-avoid">
              <h2 className="font-serif text-lg font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-2 print:border-black print:text-black">
                <Video className="w-4 h-4 text-indigo-600 dark:text-indigo-400 print:hidden" />
                <span>Spoken Lectures, Homiletics & Conference Recordings</span>
              </h2>
              <div className="space-y-2 text-xs">
                {dossier.media_links.map((media) => (
                  <div
                    key={media.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded border border-slate-200 dark:border-slate-800 print:border-black"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white print:text-black">
                        {media.title}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider ml-2">
                        ({media.media_type.replace('_', ' ')})
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 print:text-black truncate max-w-xs mt-1 sm:mt-0">
                      {media.url}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 7. Peer Commendations & Colleague Endorsements */}
          {dossier.endorsements.length > 0 && (
            <section className="space-y-4 print:break-inside-avoid">
              <h2 className="font-serif text-lg font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-2 print:border-black print:text-black">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 print:hidden" />
                <span>Peer Commendations & Faculty References</span>
              </h2>
              <div className="space-y-3">
                {dossier.endorsements.map((end) => (
                  <blockquote
                    key={end.id}
                    className="border-l-2 border-indigo-600 dark:border-indigo-400 pl-4 py-1 text-xs text-slate-700 dark:text-slate-300 print:border-black print:text-black space-y-1"
                  >
                    <p className="italic font-serif leading-relaxed">
                      &ldquo;{end.commendation_text}&rdquo;
                    </p>
                    <footer className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 print:text-black">
                      — {end.endorser_name}
                      {end.endorser_title && <span>, {end.endorser_title}</span>}
                      {end.endorser_institution && <span> ({end.endorser_institution})</span>}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </section>
          )}

          {/* Official Document Footer */}
          <footer className="pt-8 border-t-2 border-slate-900 dark:border-slate-100 text-[10px] text-slate-500 print:border-black print:text-black flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              Generated on {new Date(dossier.generated_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })} via FaithFull Scholars.
            </div>
            <div className="font-mono text-right">
              https://faithfullscholars.com/scholars/{dossier.slug}
            </div>
          </footer>
        </article>
      </main>

      {/* Public Footer (Hidden during print) */}
      <div className="print:hidden">
        <PublicFooter />
      </div>
    </div>
  );
}
