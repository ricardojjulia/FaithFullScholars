import { Metadata } from 'next';
import { getPublicCourses, getTaxonomies } from '@/lib/domain/queries';
import { CourseCard } from '@/components/courses/course-card';
import { PublicNav } from '@/components/shell/public-nav';
import { PublicFooter } from '@/components/shell/public-footer';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Course Showcase & Syllabi | FaithFull Scholars',
  description:
    'Browse syllabi, course previews, and lecture series prepared and taught by accredited theological faculty.',
};

interface CoursesPageProps {
  searchParams: Promise<{
    search?: string;
    discipline?: string;
    level?: string;
  }>;
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const params = await searchParams;

  const [courses, taxonomies] = await Promise.all([
    getPublicCourses({
      search: params.search,
      discipline: params.discipline,
      level: params.level,
    }),
    getTaxonomies(),
  ]);

  return (
    <div className="flex flex-col min-h-screen">
      <PublicNav />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:border-indigo-900 dark:text-indigo-300 text-xs font-semibold mb-2">
                <span>📖</span> Inspectable Curriculum
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                Theological Course Showcase
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Explore course syllabi, reading lists, and teaching previews prepared by qualified professors.
              </p>
            </div>

            <div className="text-sm text-slate-500 font-medium">
              Showing <strong className="text-slate-900 dark:text-white">{courses.length}</strong> public courses
            </div>
          </div>
        </div>

        {/* Quick Discipline Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-8 pb-4 border-b border-slate-100 dark:border-slate-800 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Filter Field:</span>
          <Link
            href="/courses"
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              !params.discipline
                ? 'bg-indigo-900 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Fields
          </Link>
          {taxonomies.disciplines.map((d) => {
            const isSelected = params.discipline === d.slug;
            return (
              <Link
                key={d.slug}
                href={`/courses?discipline=${d.slug}`}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  isSelected
                    ? 'bg-indigo-900 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {d.name}
              </Link>
            );
          })}
        </div>

        {/* Course Grid */}
        {courses.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl card-crisp p-12 text-center space-y-3">
            <div className="text-3xl">📚</div>
            <h3 className="font-display font-bold tracking-tight text-lg text-slate-900 dark:text-white">
              No Courses Found
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No public courses currently match this discipline. Try selecting &ldquo;All Fields&rdquo; or view our Faculty Directory directly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
