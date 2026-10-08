import type { SupabaseClient } from '@supabase/supabase-js';
import { PortalQueryError } from '@/lib/inquiries/queries';
import { isApplicationStatus, type ApplicationStatus } from '@/lib/postings/application-status';

export interface MyApplication {
  id: string;
  postingId: string;
  postingTitle: string;
  postingSlug: string | null;
  institutionName: string;
  status: ApplicationStatus;
  appliedAt: string;
  statusChangedAt: string;
}

interface Row {
  id: string;
  posting_id: string;
  posting_title: string;
  institution_name: string;
  status: string;
  status_changed_at: string;
  created_at: string;
  institution_postings?: { slug?: string | null } | { slug?: string | null }[] | null;
}

/**
 * The signed-in scholar's own applications, newest first. RLS limits the rows to
 * the caller; `scholarId` comes from the verified session. Throws PortalQueryError
 * on failure so the page can show an error panel instead of an empty list.
 */
export async function fetchMyApplicationsOrThrow(client: SupabaseClient, scholarId: string): Promise<MyApplication[]> {
  const { data, error } = await client
    .from('posting_applications')
    .select('id, posting_id, posting_title, institution_name, status, status_changed_at, created_at, institution_postings(slug)')
    .eq('scholar_id', scholarId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new PortalQueryError('my applications', error.code);
  }

  return ((data ?? []) as unknown as Row[])
    .filter((row) => isApplicationStatus(row.status))
    .map((row) => {
      const posting = Array.isArray(row.institution_postings) ? row.institution_postings[0] : row.institution_postings;
      return {
        id: row.id,
        postingId: row.posting_id,
        postingTitle: row.posting_title,
        postingSlug: posting?.slug ?? null,
        institutionName: row.institution_name,
        status: row.status as ApplicationStatus,
        appliedAt: row.created_at,
        statusChangedAt: row.status_changed_at,
      };
    });
}
