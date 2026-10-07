import { createAdminClient } from '@/lib/supabase/server';
import {
  ScholarProfileRevision,
  RevisionStatus,
  ProfileStatus,
  RevisionSnapshotData,
  ProfileReview,
  Institution,
  ContentReport,
  ReportStatus,
} from '@/lib/domain/types';
import { computeRevisionDiff, ProfileRevisionDiff } from '@/lib/domain/diff';
import { loadLiveProfileSnapshot } from '@/lib/profiles/revision-service';

export interface PendingRevisionSummary {
  id: string;
  scholar_id: string;
  scholar_name: string;
  scholar_slug: string;
  scholar_current_status: ProfileStatus;
  revision_number: number;
  status: RevisionStatus;
  change_summary?: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  has_published_baseline: boolean;
}

export interface RevisionDetailWithDiff {
  revision: ScholarProfileRevision;
  scholar: {
    id: string;
    slug: string;
    full_name: string;
    profile_status: ProfileStatus;
    published_revision_id: string | null;
  };
  baselineSnapshot: RevisionSnapshotData | null;
  submittedSnapshot: RevisionSnapshotData;
  diff: ProfileRevisionDiff;
}

interface ScholarRevisionRow {
  id: string;
  scholar_id: string;
  revision_number: number;
  status: string;
  snapshot_data: RevisionSnapshotData | null;
  admin_notes: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at?: string;
  scholars: {
    id: string;
    slug: string;
    full_name: string;
    profile_status: ProfileStatus;
    published_revision_id: string | null;
  } | null;
}

/**
 * Fetches profile revisions awaiting administrative review or filtered by status.
 */
export async function fetchPendingRevisions(
  statusFilter?: RevisionStatus | 'all'
): Promise<PendingRevisionSummary[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('scholar_profile_revisions')
    .select(`
      id,
      scholar_id,
      revision_number,
      status,
      snapshot_data,
      admin_notes,
      submitted_at,
      reviewed_at,
      created_at,
      scholars!scholar_profile_revisions_scholar_id_fkey (
        id,
        slug,
        full_name,
        profile_status,
        published_revision_id
      )
    `)
    .order('submitted_at', { ascending: false, nullsFirst: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('Failed to fetch pending revisions:', { code: error?.code });
    return [];
  }

  return (data as unknown as ScholarRevisionRow[]).map((row) => {
    const scholar = row.scholars;
    const snapshot = (row.snapshot_data || {}) as RevisionSnapshotData;
    const scholarName = scholar?.full_name || snapshot.full_name || 'Unnamed Scholar';

    return {
      id: row.id,
      scholar_id: row.scholar_id,
      scholar_name: scholarName,
      scholar_slug: scholar?.slug || '',
      scholar_current_status: scholar?.profile_status || 'draft',
      revision_number: row.revision_number,
      status: row.status as RevisionStatus,
      change_summary: snapshot.biography ? `${snapshot.title || 'Scholar'} • ${snapshot.biography.slice(0, 80)}...` : null,
      submitted_at: row.submitted_at,
      reviewed_at: row.reviewed_at,
      admin_notes: row.admin_notes,
      has_published_baseline: Boolean(scholar?.published_revision_id),
    };
  });
}

/**
 * Loads a submitted revision alongside the scholar's live published profile to construct a side-by-side diff.
 */
export async function fetchRevisionWithBaseline(
  revisionId: string
): Promise<RevisionDetailWithDiff | null> {
  const supabase = createAdminClient();

  // 1. Fetch target revision
  const { data: revData, error: revError } = await supabase
    .from('scholar_profile_revisions')
    .select(`
      id,
      scholar_id,
      revision_number,
      status,
      snapshot_data,
      admin_notes,
      submitted_at,
      reviewed_at,
      created_at,
      updated_at,
      scholars!scholar_profile_revisions_scholar_id_fkey (
        id,
        slug,
        full_name,
        profile_status,
        published_revision_id
      )
    `)
    .eq('id', revisionId)
    .single();

  if (revError || !revData) {
    console.error('Failed to fetch revision:', { code: revError?.code });
    return null;
  }

  const scholar = (revData as unknown as ScholarRevisionRow).scholars;
  if (!scholar) {
    return null;
  }
  const submittedSnapshot = (revData.snapshot_data || {}) as RevisionSnapshotData;

  // 2. The baseline is the scholar's LIVE published rows (scalars plus the five
  //    relational lists), not a stored snapshot: approval replaces those rows, so a
  //    stale snapshot would hide what the approval is about to remove (ADR 0025).
  const baselineSnapshot: RevisionSnapshotData | null = await loadLiveProfileSnapshot(supabase, scholar.id);

  // 3. Compute structured field diff
  const diff = computeRevisionDiff(baselineSnapshot, submittedSnapshot);

  return {
    revision: {
      id: revData.id,
      scholar_id: revData.scholar_id,
      revision_number: revData.revision_number,
      status: revData.status as RevisionStatus,
      snapshot_data: submittedSnapshot,
      admin_notes: revData.admin_notes,
      submitted_at: revData.submitted_at,
      reviewed_at: revData.reviewed_at,
      created_at: revData.created_at,
      updated_at: revData.updated_at,
    },
    scholar: {
      id: scholar.id,
      slug: scholar.slug,
      full_name: scholar.full_name,
      profile_status: scholar.profile_status,
      published_revision_id: scholar.published_revision_id,
    },
    baselineSnapshot,
    submittedSnapshot,
    diff,
  };
}

/**
 * Fetches review decision history for a scholar from profile_reviews.
 */
export async function fetchReviewAuditHistory(scholarId: string): Promise<ProfileReview[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('profile_reviews')
    .select('*')
    .eq('scholar_id', scholarId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Failed to fetch review history:', { code: error?.code });
    return [];
  }

  return data as ProfileReview[];
}

/**
 * Fetches institutions for verification triage.
 */
export async function fetchPendingInstitutions(): Promise<Institution[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('institutions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Failed to fetch institutions:', { code: error?.code });
    return [];
  }

  return data as Institution[];
}

/**
 * Fetches flagged content reports.
 */
export async function fetchContentReports(
  statusFilter?: ReportStatus | 'all'
): Promise<ContentReport[]> {
  const supabase = createAdminClient();

  let query = supabase.from('reports').select('*').order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('Failed to fetch reports:', { code: error?.code });
    return [];
  }

  return data as ContentReport[];
}
