import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { getPublicCourseBySlug } from '@/lib/domain/queries';
import { formatDeliveryMode } from '@/lib/domain/taxonomies';
import { PublicNav } from '@/components/shell/public-nav';
import { PublicFooter } from '@/components/shell/public-footer';

interface CourseDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: CourseDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await getPublicCourseBySlug(slug);

  if (!course) {
    return {
      title: 'Course Not Found | FaithFull Scholars',
    };
  }

  return {
    title: `${course.title} | FaithFull Scholars`,
    description:
      course.description?.slice(0, 160) ||
      `Syllabus and teaching overview for ${course.title} taught by ${course.scholar.full_name}.`,
  };
}

export default async function CourseDetailPage({
  params,
}: CourseDetailPageProps) {
  const { slug } = await params;
  const course = await getPublicCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PublicNav />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span>/</span>
          <Link href="/courses" className="hover:underline">
            Courses
          </Link>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200 font-medium line-clamp-1">
            {course.title}
          </span>
        </nav>

        {/* Course Header Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl card-crisp p-6 sm:p-8 shadow-sm mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {course.discipline && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900">
                {course.discipline.name}
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 uppercase">
              {course.level} Level
            </span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
            {course.title}
          </h1>

          {/* Instructor Box */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-900 text-amber-300 font-display font-bold text-base flex items-center justify-center">
              {course.scholar.full_name.charAt(3) || 'S'}
            </div>
            <div>
              <div className="text-xs text-slate-500">Prepared & Taught by</div>
              <Link
                href={`/scholars/${course.scholar.slug}`}
                className="font-display font-bold tracking-tight text-sm text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                {course.scholar.full_name}
              </Link>
              {course.scholar.current_institution && (
                <span className="text-xs text-slate-500 ml-1.5">
                  ({course.scholar.current_institution})
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {course.description && (
            <div className="space-y-2 mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Course Description & Objectives
              </h2>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {course.description}
              </p>
            </div>
          )}

          {/* Delivery Formats */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Available Delivery Formats
            </h3>
            <div className="flex flex-wrap gap-2">
              {course.delivery_modes.map((mode) => (
                <span
                  key={mode}
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                >
                  {formatDeliveryMode(mode)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Syllabus & Reading List */}
        <div className="space-y-6">
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl card-crisp p-6 shadow-sm">
            <h2 className="font-display font-bold tracking-tight text-lg text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <span>📄</span> Syllabus & Modular Structure
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              This course is ready for modular intensive delivery (1–2 weeks), synchronous online semester instruction, or asynchronous video module integration.
            </p>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  Full Course Syllabus & Weekly Schedule
                </div>
                <div className="text-[11px] text-slate-500">
                  Approved for graduate seminary accreditation (ATS / ABHE standard)
                </div>
              </div>

              <Link
                href={`/scholars/${course.scholar.slug}`}
                className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
              >
                Inquire With Scholar
              </Link>
            </div>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
