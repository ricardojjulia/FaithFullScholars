import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  GraduationCap,
  BookOpen,
  Search,
  ArrowRight,
  Building2,
  CheckCircle2,
  BookMarked,
  Sparkles,
} from 'lucide-react';
import { PublicNav } from '@/components/shell/public-nav';
import { PublicFooter } from '@/components/shell/public-footer';
import { getDisciplineBySlug } from '@/lib/domain/queries';
import { formatDeliveryMode } from '@/lib/domain/taxonomies';
import {
  generateBreadcrumbJsonLd,
  generateDisciplineHubJsonLd,
  serializeJsonLd,
} from '@/lib/seo/json-ld';

interface DisciplinePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: DisciplinePageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getDisciplineBySlug(slug);

  if (!data) {
    return {
      title: 'Discipline Not Found | FaithFull Scholars',
    };
  }

  return {
    title: `${data.discipline.name} Faculty & Syllabi | FaithFull Scholars`,
    description:
      data.discipline.description ||
      `Find qualified theological professors and inspectable syllabi in ${data.discipline.name}.`,
    openGraph: {
      title: `${data.discipline.name} Faculty & Syllabi | FaithFull Scholars`,
      description: data.discipline.description,
      type: 'website',
    },
    alternates: {
      canonical: `/disciplines/${data.discipline.slug}`,
    },
  };
}

export default async function DisciplineTopicHubPage({
  params,
}: DisciplinePageProps) {
  const { slug } = await params;
  const data = await getDisciplineBySlug(slug);

  if (!data) {
    notFound();
  }

  const { discipline, scholars, courses } = data;

  const breadcrumbsJsonLd = generateBreadcrumbJsonLd([
    { name: 'Home', item: '/' },
    { name: 'Disciplines', item: '/disciplines' },
    { name: discipline.name, item: `/disciplines/${discipline.slug}` },
  ]);

  const hubJsonLd = generateDisciplineHubJsonLd(
    discipline,
    scholars.length,
    courses.length
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/60 dark:bg-slate-950">
      <PublicNav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbsJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(hubJsonLd) }}
      />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span>/</span>
          <Link href="/disciplines" className="hover:underline">
            Disciplines
          </Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-medium">
            {discipline.name}
          </span>
        </nav>

        {/* Hero Header */}
        <div className="card-crisp p-6 sm:p-10 bg-white dark:bg-slate-900 rounded-3xl mb-10 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50">
              {discipline.category}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {scholars.length} Qualified {scholars.length === 1 ? 'Professor' : 'Professors'}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {courses.length} Prepared {courses.length === 1 ? 'Syllabus' : 'Syllabi'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
            {discipline.name}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed mb-8">
            {discipline.description}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/scholars?discipline=${discipline.id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Search Available Faculty in {discipline.name}</span>
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>Browse All Syllabi</span>
            </Link>
          </div>
        </div>

        {/* Section 1: Faculty Roster */}
        <section className="mb-12">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2.5">
              <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xl font-display font-bold tracking-tight text-slate-900 dark:text-white">
                Faculty Specializing in {discipline.name}
              </h2>
            </div>
            <Link
              href={`/scholars?discipline=${discipline.id}`}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              View All Directory Results
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {scholars.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                New scholar profiles in this discipline are currently in administrative review.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scholars.map((scholar) => (
                <div
                  key={scholar.id}
                  className="card-crisp p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex flex-col justify-between"
                >
                  <div className="flex items-start gap-3.5 mb-4">
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-display font-bold text-sm text-slate-700 dark:text-slate-200 shrink-0">
                      {scholar.full_name ? scholar.full_name[0] : 'Dr'}
                    </div>
                    <div>
                      <Link
                        href={`/scholars/${scholar.slug}`}
                        className="text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-1"
                      >
                        {scholar.full_name}
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 inline" />
                      </Link>
                      {scholar.title && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          {scholar.title}
                        </p>
                      )}
                      {scholar.current_institution && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {scholar.current_institution}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                      Verified Scholar
                    </span>
                    <Link
                      href={`/scholars/${scholar.slug}`}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      View Dossier →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: Syllabi & Course Showcases */}
        {courses.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2.5 mb-6">
              <BookMarked className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xl font-display font-bold tracking-tight text-slate-900 dark:text-white">
                Inspectable Syllabi & Lecture Modules
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {courses.map((c) => (
                <div
                  key={c.id}
                  className="card-crisp p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                        {c.level} Level
                      </span>
                      <Link
                        href={`/courses/${c.slug}`}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Inspect Syllabus →
                      </Link>
                    </div>

                    <h3 className="text-base font-display font-bold text-slate-900 dark:text-white mb-1.5">
                      {c.title}
                    </h3>

                    {c.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3">
                        {c.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1 mb-4">
                      {c.delivery_modes.map((mode: string) => (
                        <span
                          key={mode}
                          className="px-2 py-0.5 text-[10px] rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        >
                          {formatDeliveryMode(mode)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <span>Instructor:</span>
                    <Link
                      href={`/scholars/${c.scholar.slug}`}
                      className="font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      {c.scholar.full_name}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 3: Academic Scope & Institutional Guidance */}
        <section className="card-crisp p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
          <div className="flex items-center gap-2 mb-3 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-4 h-4" />
            <h3 className="text-sm font-display font-bold tracking-tight uppercase">
              Seminary & Search Committee Hiring Notes
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Faculty listed in {discipline.name} have been evaluated for doctrinal alignment, terminal doctoral credentials, and teaching sample quality. Seminaries and Christian institutions can initiate structured inquiries directly through each scholar&apos;s verified dossier.
          </p>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
