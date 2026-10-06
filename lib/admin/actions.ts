import { createAdminClient } from '@/lib/supabase/server';
import { ReviewAction } from '@/lib/domain/types';

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
  /** Machine-readable failure reason for the review function. */
  code?: 'not_found' | 'not_reviewable' | 'invalid_action' | 'audit_failed';
}

/**
 * Processes an administrative review decision (Approve, Request Changes, Reject, Hide).
 * Approve / request-changes / reject run through the atomic, service-role-only
 * `review_profile_revision` database function (ADR 0024), which acts on
 * submitted revisions only and writes the profile_reviews audit row in the same
 * transaction. Hide is a direct profile_status change with its own audit row.
 */
export async function processRevisionReview(
  input: ReviewDecisionInput
): Promise<ReviewDecisionResult> {
  const supabase = createAdminClient();

  // 1. Fetch the revision to identify the scholar
  const { data: rev, error: revErr } = await supabase
    .from('scholar_profile_revisions')
    .select('id, scholar_id')
    .eq('id', input.revisionId)
    .single();

  if (revErr || !rev) {
    return {
      success: false,
      action: input.action,
      revisionId: input.revisionId,
      scholarId: '',
      error: `Revision ${input.revisionId} not found.`,
      code: 'not_found',
    };
  }

  const scholarId = rev.scholar_id as string;

  if (input.action === 'approve' || input.action === 'request_changes' || input.action === 'reject') {
    const { error: rpcErr } = await supabase.rpc('review_profile_revision', {
      p_revision_id: input.revisionId,
      p_action: input.action,
      p_notes: input.feedbackNotes || null,
      p_reviewer: input.reviewerAccountId,
    });

    if (rpcErr) {
      const sqlState = (rpcErr as { code?: string }).code;
      if (sqlState === 'P0002') {
        return {
          success: false,
          action: input.action,
          revisionId: input.revisionId,
          scholarId,
          error: 'Revision not found.',
          code: 'not_found',
        };
      }
      if (sqlState === '55000') {
        return {
          success: false,
          action: input.action,
          revisionId: input.revisionId,
          scholarId,
          error: 'Only submitted revisions can be reviewed.',
          code: 'not_reviewable',
        };
      }
      console.error('Admin review function failed:', { code: sqlState });
      return {
        success: false,
        action: input.action,
        revisionId: input.revisionId,
        scholarId,
        error: 'Unable to record the review decision. Please try again.',
      };
    }

    return {
      success: true,
      action: input.action,
      revisionId: input.revisionId,
      scholarId,
    };
  }

  // Hide is the only other action; anything else is refused rather than
  // falling through to a destructive default.
  if (input.action !== 'hide') {
    return {
      success: false,
      action: input.action,
      revisionId: input.revisionId,
      scholarId,
      error: 'Invalid review action.',
      code: 'invalid_action',
    };
  }

  // Hide: remove the scholar profile from public discovery
  const now = new Date().toISOString();
  const { error: hideErr } = await supabase
    .from('scholars')
    .update({
      profile_status: 'hidden',
      updated_at: now,
    })
    .eq('id', scholarId);

  if (hideErr) {
    console.error('Admin hide scholar failed:', { code: (hideErr as { code?: string }).code });
    return {
      success: false,
      action: input.action,
      revisionId: input.revisionId,
      scholarId,
      error: 'Unable to update scholar profile status. Please try again.',
    };
  }

  // Write immutable record to profile_reviews audit trail
  const { error: auditErr } = await supabase.from('profile_reviews').insert({
    scholar_id: scholarId,
    revision_id: input.revisionId,
    reviewer_account_id: input.reviewerAccountId,
    action: input.action,
    feedback_notes: input.feedbackNotes || null,
  });

  if (auditErr) {
    // The profile is hidden, but the decision is not recorded; report it rather
    // than claiming a clean success.
    console.error('Failed to write profile_reviews audit log:', { code: (auditErr as { code?: string }).code });
    return {
      success: false,
      action: input.action,
      revisionId: input.revisionId,
      scholarId,
      error: 'The profile was hidden, but the audit record could not be written. Please record the decision again.',
      code: 'audit_failed',
    };
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
    console.error('Error verifying institution:', error);
    return { success: false, error: 'Failed to process institution verification.' };
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
    console.error('Error processing content report:', error);
    return { success: false, error: 'Failed to process content report.' };
  }

  return { success: true };
}
