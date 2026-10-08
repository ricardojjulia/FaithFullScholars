import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireInstitutionMember } from '@/lib/auth/guards';
import {
  fetchSavedCoursesOrThrow,
  fetchSavedScholarsOrThrow,
  PortalQueryError,
} from '@/lib/inquiries/queries';
import { toBookmarkedCourseItems, toShortlistedScholarItems } from '@/lib/inquiries/mappers';
import { SavedLists } from '@/components/institution/saved-lists';
import { DataErrorPanel } from '@/components/portal/data-error-panel';

export const metadata: Metadata = {
  title: 'Shortlists & Bookmarks | Institution Portal',
  description: 'Manage prospective adjunct faculty candidates and benchmark course syllabi.',
};

export const dynamic = 'force-dynamic';

export default async function InstitutionSavedPage() {
  const supabase = await createClient();
  // Guard here, not only in the layout: layouts do not stop pages from rendering.
  // The institution is resolved from the session, never from the request.
  const { institutionId } = await requireInstitutionMember(supabase);

  let lists: {
    scholars: ReturnType<typeof toShortlistedScholarItems>;
    courses: ReturnType<typeof toBookmarkedCourseItems>;
  } | null = null;
  try {
    const [scholars, courses] = await Promise.all([
      fetchSavedScholarsOrThrow(supabase, institutionId),
      fetchSavedCoursesOrThrow(supabase, institutionId),
    ]);
    lists = {
      scholars: toShortlistedScholarItems(scholars),
      courses: toBookmarkedCourseItems(courses),
    };
  } catch (err) {
    console.error('Shortlist failed to load (code):', err instanceof PortalQueryError ? err.code : 'unknown');
  }

  if (!lists) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Shortlists & Bookmarks</h1>
        <DataErrorPanel what="your shortlist" />
      </div>
    );
  }

  return <SavedLists initialScholars={lists.scholars} initialCourses={lists.courses} />;
}
