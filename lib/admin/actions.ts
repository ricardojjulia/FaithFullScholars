import { createAdminClient } from '@/lib/supabase/server';
import { ReviewAction, RevisionSnapshotData } from '@/lib/domain/types';

export interface ReviewDecisionInput {
  revisionId: string;
  action: ReviewAction;
  feedbackNotes?: string;
  reviewerAccountId: string;
}

export interface ReviewDecisionResult {
  success: boolean;
  action: ReviewAction;
  revisionId: string;
  scholarId: string;
  error?: string;
}

/**
 * Processes an administrative review decision (Approve, Request Changes, Reject, Hide)
 * enforcing data integrity and writing to the profile_reviews audit trail.
 */
export async function processRevisionReview(
  input: ReviewDecisionInput
): Promise<ReviewDecisionResult> {
  const supabase = createAdminClient();

  // 1. Fetch the revision to identify scholar and snapshot
  const { data: rev, error: revErr } = await supabase
    .from('scholar_profile_revisions')
    .select('id, scholar_id, snapshot_data')
    .eq('id', input.revisionId)
    .single();

  if (revErr || !rev) {
    return {
      success: false,
      action: input.action,
      revisionId: input.revisionId,
      scholarId: '',
      error: `Revision ${input.revisionId} not found.`,
    };
  }

  const scholarId = rev.scholar_id;
  const snapshot = (rev.snapshot_data || {}) as RevisionSnapshotData;
  const now = new Date().toISOString();

  // 2. Perform action-specific state transitions
  if (input.action === 'approve') {
    // A. Mark revision approved
    const { error: updateRevErr } = await supabase
      .from('scholar_profile_revisions')
      .update({
        status: 'approved',
        reviewed_at: now,
        admin_notes: input.feedbackNotes || null,
        updated_at: now,
      })
      .eq('id', input.revisionId);

    if (updateRevErr) {
      return {
        success: false,
        action: input.action,
        revisionId: input.revisionId,
        scholarId,
        error: updateRevErr.message,
      };
    }

    // B. Promote revision to published snapshot on scholar record
    const scholarUpdates: Record<string, unknown> = {
      published_revision_id: input.revisionId,
      profile_status: 'approved',
      updated_at: now,
    };

    if (snapshot.full_name) scholarUpdates.full_name = snapshot.full_name;
    if (snapshot.title !== undefined) scholarUpdates.title = snapshot.title;
    if (snapshot.current_institution !== undefined) scholarUpdates.current_institution = snapshot.current_institution;
    if (snapshot.institutional_role !== undefined) scholarUpdates.institutional_role = snapshot.institutional_role;
    if (snapshot.biography !== undefined) scholarUpdates.biography = snapshot.biography;
    if (snapshot.location !== undefined) scholarUpdates.location = snapshot.location;
    if (snapshot.timezone !== undefined) scholarUpdates.timezone = snapshot.timezone;
    if (snapshot.doctrinal_statement_text !== undefined) {
      scholarUpdates.doctrinal_statement_text = snapshot.doctrinal_statement_text;
    }

    const { error: updateScholarErr } = await supabase
      .from('scholars')
      .update(scholarUpdates)
      .eq('id', scholarId);

    if (updateScholarErr) {
      console.error('Failed to promote scholar published snapshot:', updateScholarErr);
    }
  } else if (input.action === 'request_changes') {
    const { error: reqErr } = await supabase
      .from('scholar_profile_revisions')
      .update({
        status: 'changes_requested',
        reviewed_at: now,
        admin_notes: input.feedbackNotes || 'Changes requested by editorial review.',
        updated_at: now,
      })
      .eq('id', input.revisionId);

    if (reqErr) {
      return {
        success: false,
        action: input.action,
        revisionId: input.revisionId,
        scholarId,
        error: reqErr.message,
      };
    }
  } else if (input.action === 'reject') {
    const { error: rejErr } = await supabase
      .from('scholar_profile_revisions')
      .update({
        status: 'rejected',
        reviewed_at: now,
        admin_notes: input.feedbackNotes || 'Submission rejected by editorial review.',
        updated_at: now,
      })
      .eq('id', input.revisionId);

    if (rejErr) {
      return {
        success: false,
        action: input.action,
        revisionId: input.revisionId,
        scholarId,
        error: rejErr.message,
      };
    }
  } else if (input.action === 'hide') {
    // Hide the scholar profile from public discovery
    const { error: hideErr } = await supabase
      .from('scholars')
      .update({
        profile_status: 'hidden',
        updated_at: now,
      })
      .eq('id', scholarId);

    if (hideErr) {
      return {
        success: false,
        action: input.action,
        revisionId: input.revisionId,
        scholarId,
        error: hideErr.message,
      };
    }
  }

  // 3. Write immutable record to profile_reviews audit trail
  const { error: auditErr } = await supabase.from('profile_reviews').insert({
    scholar_id: scholarId,
    revision_id: input.revisionId,
    reviewer_account_id: input.reviewerAccountId,
    action: input.action,
    feedback_notes: input.feedbackNotes || null,
  });

  if (auditErr) {
    console.error('Failed to write profile_reviews audit log:', auditErr);
  }

  return {
    success: true,
    action: input.action,
    revisionId: input.revisionId,
    scholarId,
  };
}

/**
 * Updates an institution's accreditation & verification status.
 */
export async function processInstitutionVerification(
  institutionId: string,
  decision: 'approved' | 'rejected' | 'suspended'
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('institutions')
    .update({
      status: decision,
      updated_at: new Date().toISOString(),
    })
    .eq('id', institutionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Updates the triage status of a flagged content report.
 */
export async function processContentReport(
  reportId: string,
  status: 'investigating' | 'resolved' | 'dismissed',
  adminNotes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('reports')
    .update({
      status,
      admin_notes: adminNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
