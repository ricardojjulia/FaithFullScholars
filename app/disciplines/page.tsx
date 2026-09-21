import Link from 'next/link';
import { Metadata } from 'next';
import { BookOpen, ArrowRight, Library, GraduationCap } from 'lucide-react';
import { PublicNav } from '@/components/shell/public-nav';
import { PublicFooter } from '@/components/shell/public-footer';
import { getAllDisciplines } from '@/lib/domain/queries';
import { generateBreadcrumbJsonLd, serializeJsonLd } from '@/lib/seo/json-ld';

export const metadata: Metadata = {
  title: 'Theological Disciplines & Faculty Specialties | FaithFull Scholars',
  description:
    'Explore accredited theological faculty across Biblical Studies, Systematic Theology, Church History, Pastoral Ministry, and Biblical Languages.',
};

export default async function DisciplinesIndexPage() {
  const disciplines = await getAllDisciplines();

  const breadcrumbsJsonLd = generateBreadcrumbJsonLd([
    { name: 'Home', item: '/' },
    { name: 'Disciplines', item: '/disciplines' },
  ]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/60 dark:bg-slate-950">
      <PublicNav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbsJsonLd) }}
      />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-medium">Disciplines</span>
        </nav>

        {/* Hero */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 mb-4">
            <Library className="w-3.5 h-3.5" />
            <span>Academic Subject Areas & Theological Taxonomies</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
            Theological Disciplines & Specialties
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
            Discover qualified professors, adjunct instructors, and inspectable syllabi categorized by theological and biblical discipline.
          </p>
        </div>

        {/* Grid of Disciplines */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {disciplines.map((disc) => (
            <Link
              key={disc.id}
              href={`/disciplines/${disc.slug}`}
              className="card-crisp p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl hover:border-indigo-300 dark:hover:border-indigo-800 transition-all hover:shadow-md flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {disc.category}
                  </span>
                  <BookOpen className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                </div>

                <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-2">
                  {disc.name}
                </h2>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed mb-4">
                  {disc.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  View Faculty & Syllabi
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
