import { createAdminClient } from '@/lib/supabase/server';
import {
  FeedbackCategory,
  PilotFeedbackRecord,
  TriageAction,
  TriageFilterOptions,
} from './types';

export interface UpsertFeedbackInput {
  fingerprint: string;
  sessionId: string;
  route: string;
  category: FeedbackCategory;
  errorMessage?: string | null;
  note?: string | null;
  breadcrumbs?: string[];
  userEmail?: string | null;
  userRole?: string | null;
  appVersion?: string | null;
  sessionDurationSeconds?: number | null;
}

export interface UpsertFeedbackResult {
  id: string;
  hitCount: number;
  processed: boolean;
  isNew: boolean;
}

/**
 * Upserts a feedback record into the database via atomic PostgreSQL function.
 * On fingerprint conflict, increments hit_count, refreshes latest context,
 * and reopens processed status so regressions are surfaced back to staff.
 */
export async function upsertFeedbackRecord(
  input: UpsertFeedbackInput
): Promise<UpsertFeedbackResult> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient.rpc('upsert_pilot_feedback', {
    p_fingerprint: input.fingerprint,
    p_session_id: input.sessionId,
    p_route: input.route,
    p_category: input.category,
    p_error_message: input.errorMessage || null,
    p_note: input.note || null,
    p_breadcrumbs: input.breadcrumbs || [],
    p_user_email: input.userEmail || null,
    p_user_role: input.userRole || null,
    p_app_version: input.appVersion || null,
    p_session_duration_seconds: input.sessionDurationSeconds ?? null,
  });

  if (error || !data || data.length === 0) {
    console.error('Failed to upsert pilot feedback record:', error);
    throw new Error('Database upsert failed');
  }

  const row = data[0];
  return {
    id: row.id,
    hitCount: row.hit_count,
    processed: row.processed,
    isNew: row.is_new,
  };
}

/**
 * Retrieves feedback records for the staff triage workspace.
 */
export async function fetchTriageRecords(
  filters: TriageFilterOptions = {}
): Promise<PilotFeedbackRecord[]> {
  const adminClient = createAdminClient();

  let query = adminClient
    .from('pilot_feedback')
    .select('*');

  // Filter by processing status
  if (filters.status === 'open') {
    query = query.eq('processed', false);
  } else if (filters.status === 'done') {
    query = query.eq('processed', true);
  }

  // Filter by category
  if (filters.category && filters.category !== 'ALL') {
    query = query.eq('category', filters.category);
  }

  // Filter by search query across multiple text fields
  if (filters.query && filters.query.trim()) {
    const q = `%${filters.query.trim()}%`;
    query = query.or(
      `note.ilike.${q},error_message.ilike.${q},route.ilike.${q},user_email.ilike.${q},user_role.ilike.${q}`
    );
  }

  // Filter by date range
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  // Order: unprocessed first, then highest hit count, then newest
  query = query
    .order('processed', { ascending: true })
    .order('hit_count', { ascending: false })
    .order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch triage records:', error);
    throw new Error('Failed to query triage records');
  }

  return (data || []) as PilotFeedbackRecord[];
}

/**
 * Updates a triage record's action and processed status.
 */
export async function updateTriageRecord(
  id: string,
  updates: {
    processed?: boolean;
    action?: TriageAction | null;
  }
): Promise<PilotFeedbackRecord> {
  const adminClient = createAdminClient();

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof updates.processed === 'boolean') {
    payload.processed = updates.processed;
  }

  if (updates.action !== undefined) {
    payload.action = updates.action;
  }

  const { data, error } = await adminClient
    .from('pilot_feedback')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    console.error('Failed to update triage record:', error);
    throw new Error('Failed to update triage record');
  }

  return data as PilotFeedbackRecord;
}
