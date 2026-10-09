import Link from 'next/link';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireSignedIn } from '@/lib/auth/guards';
import {
  fetchDisciplineOptionsOrThrow,
  fetchOwnCoursesOrThrow,
  fetchProfileStatusOrThrow,
  type DisciplineOption,
  type ScholarCourse,
} from '@/lib/courses/course-service';
import { CoursesManager } from '@/components/scholar/courses-manager';
import { DataErrorPanel } from '@/components/portal/data-error-panel';

export const metadata: Metadata = {
  title: 'My Courses | Scholar Workspace',
  description: 'Create, publish and manage the courses shown on your public scholar profile and the course catalogue.',
};

export const dynamic = 'force-dynamic';

export default async function ScholarCoursesPage() {
  const supabase = await createClient();
  // Guard here, not only in the layout: layouts do not stop pages from rendering.
  const session = await requireSignedIn(supabase);

  const header = (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Courses</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
        New courses are private until you publish them. Published courses appear in the course catalogue once your
        profile is approved.
      </p>
    </div>
  );

  if (!session.scholarId) {
    return (
      <div className="space-y-6">
        {header}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 text-sm text-slate-700 dark:text-slate-300">
          You need a scholar profile before you can add courses.{' '}
          <Link href="/dashboard/onboarding" className="font-semibold text-indigo-600 dark:text-indigo-400 underline">
            Start onboarding
          </Link>
          .
        </div>
      </div>
    );
  }

  let loaded: { courses: ScholarCourse[]; disciplines: DisciplineOption[]; profileStatus: string } | null = null;
  try {
    const [courses, disciplines, profileStatus] = await Promise.all([
      fetchOwnCoursesOrThrow(supabase, session.scholarId),
      fetchDisciplineOptionsOrThrow(supabase),
      fetchProfileStatusOrThrow(supabase, session.scholarId),
    ]);
    loaded = { courses, disciplines, profileStatus };
  } catch {
    loaded = null;
  }

  return (
    <div className="space-y-6">
      {header}
      {loaded ? (
        <CoursesManager initialCourses={loaded.courses} disciplines={loaded.disciplines}
          profileStatus={loaded.profileStatus}
        />
      ) : (
        <DataErrorPanel what="your courses" />
      )}
    </div>
  );
}
