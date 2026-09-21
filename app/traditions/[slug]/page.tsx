import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  ScrollText,
  Search,
  ArrowRight,
  Building2,
  CheckCircle2,
  GraduationCap,
  BookOpen,
} from 'lucide-react';
import { PublicNav } from '@/components/shell/public-nav';
import { PublicFooter } from '@/components/shell/public-footer';
import { getTraditionBySlug } from '@/lib/domain/queries';
import {
  generateBreadcrumbJsonLd,
  generateTraditionHubJsonLd,
} from '@/lib/seo/json-ld';

interface TraditionPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: TraditionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getTraditionBySlug(slug);

  if (!data) {
    return {
      title: 'Tradition Not Found | FaithFull Scholars',
    };
  }

  return {
    title: `${data.tradition.name} Scholars & Confessions | FaithFull Scholars`,
    description:
      data.tradition.description ||
      `Find accredited theological professors affirming ${data.tradition.name} historical tradition.`,
    openGraph: {
      title: `${data.tradition.name} Scholars & Confessions | FaithFull Scholars`,
      description: data.tradition.description,
      type: 'website',
    },
    alternates: {
      canonical: `/traditions/${data.tradition.slug}`,
    },
  };
}

export default async function TraditionTopicHubPage({
  params,
}: TraditionPageProps) {
  const { slug } = await params;
  const data = await getTraditionBySlug(slug);

  if (!data) {
    notFound();
  }

  const { tradition, scholars, confessions } = data;

  const breadcrumbsJsonLd = generateBreadcrumbJsonLd([
    { name: 'Home', item: '/' },
    { name: 'Traditions', item: '/traditions' },
    { name: tradition.name, item: `/traditions/${tradition.slug}` },
  ]);

  const hubJsonLd = generateTraditionHubJsonLd(
    tradition,
    confessions.map((c: { name: string }) => c.name)
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/60 dark:bg-slate-950">
      <PublicNav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(hubJsonLd) }}
      />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span>/</span>
          <Link href="/traditions" className="hover:underline">
            Traditions
          </Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-medium">
            {tradition.name}
          </span>
        </nav>

        {/* Hero Header */}
        <div className="card-crisp p-6 sm:p-10 bg-white dark:bg-slate-900 rounded-3xl mb-10 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/50">
              Theological Family
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {scholars.length} Subscribing {scholars.length === 1 ? 'Scholar' : 'Scholars'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
            {tradition.name}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed mb-8">
            {tradition.description}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/scholars?tradition=${tradition.id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Search Scholars in {tradition.name}</span>
            </Link>
            <Link
              href="/scholars"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>All Theological Traditions</span>
            </Link>
          </div>
        </div>

        {/* Section 1: Associated Confessional Standards */}
        <section className="mb-12">
          <div className="flex items-center gap-2.5 mb-5">
            <ScrollText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-xl font-display font-bold tracking-tight text-slate-900 dark:text-white">
              Historic Confessional Standards & Creeds
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {confessions.slice(0, 6).map((c: { id: string; name: string; year?: number | null; description?: string | null }) => (
              <div
                key={c.id}
                className="card-crisp p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {c.name}
                  </span>
                  {c.year && (
                    <span className="text-[10px] font-mono font-semibold text-slate-400">
                      {c.year}
                    </span>
                  )}
                </div>
                {c.description && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {c.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Scholar Roster */}
        <section className="mb-12">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2.5">
              <GraduationCap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h2 className="text-xl font-display font-bold tracking-tight text-slate-900 dark:text-white">
                Faculty Affiliated with {tradition.name}
              </h2>
            </div>
            <Link
              href={`/scholars?tradition=${tradition.id}`}
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
            >
              View All Directory Results
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {scholars.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                New scholar profiles in this tradition are currently in review.
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
                        className="text-sm font-bold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors inline-flex items-center gap-1"
                      >
                        {scholar.full_name}
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 inline" />
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
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                      Verified Scholar
                    </span>
                    <Link
                      href={`/scholars/${scholar.slug}`}
                      className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      View Dossier →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
