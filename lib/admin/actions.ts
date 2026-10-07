import { createAdminClient } from '@/lib/supabase/server';
import { ReviewAction } from '@/lib/domain/types';
import type { UnresolvedEntry } from '@/lib/taxonomy/resolve';

const MAX_UNMATCHED_ENTRIES = 25;
const MAX_UNMATCHED_VALUE_LENGTH = 200;
const UNMATCHED_KINDS = ['discipline', 'tradition', 'confession'] as const;

/**
 * Parses and validates the FS001 DETAIL (a JSON array of {kind, value}).
 * Nothing from the database is trusted blindly: the kind is allow-listed and the
 * list and each value are capped. Returns [] when the detail is not usable.
 */
export function parseUnmatchedDetail(detail: unknown): UnresolvedEntry[] {
  if (typeof detail !== 'string') return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(detail);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: UnresolvedEntry[] = [];
  for (const item of parsed) {
    if (out.length >= MAX_UNMATCHED_ENTRIES) break;
    if (!item || typeof item !== 'object') continue;
    const { kind, value } = item as { kind?: unknown; value?: unknown };
    if (typeof value !== 'string' || !UNMATCHED_KINDS.includes(kind as (typeof UNMATCHED_KINDS)[number])) continue;
    out.push({
      kind: kind as UnresolvedEntry['kind'],
      value: value.slice(0, MAX_UNMATCHED_VALUE_LENGTH),
    });
  }
  return out;
}

/**
 * Only the exact message shape raised by approval is surfaced; anything else is generic.
 * The first token is a list name (credentials, ...) or a scalar field name (orcid_id,
 * google_scholar_url, ...); the reason is a fixed phrase, never a snapshot value.
 */
function describeSnapshotInvalid(message: unknown): string {
  const match =
    typeof message === 'string'
      ? /^snapshot_invalid: ([a-z_]{1,30})(?:\[(\d{1,3})\])? ([A-Za-z0-9_ ().,-]{1,120})$/.exec(message)
      : null;
  if (!match) return 'The submitted profile contains invalid entries and cannot be approved.';
  const item = match[2] !== undefined ? `, item ${Number(match[2]) + 1}` : '';
  return `The submitted profile is invalid (${match[1]}${item}: ${match[3]}). Ask the scholar to correct it.`;
}

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
  code?:
    | 'not_found'
    | 'not_reviewable'
    | 'invalid_action'
    | 'audit_failed'
    | 'taxonomy_unmatched'
    | 'snapshot_invalid';
  /** Entries that did not resolve to a taxonomy row (taxonomy_unmatched only), capped and validated. */
  unmatched?: UnresolvedEntry[];
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
      if (sqlState === 'FS001') {
        const unmatched = parseUnmatchedDetail((rpcErr as { details?: unknown }).details);
        const named = unmatched.map((u) => `${u.kind} "${u.value}"`).join(', ');
        return {
          success: false,
          action: input.action,
          revisionId: input.revisionId,
          scholarId,
          error: named
            ? `Approval blocked: these entries do not match the taxonomy: ${named}. Ask the scholar to replace them.`
            : 'Approval blocked: some disciplines, traditions or confessions do not match the taxonomy. Ask the scholar to replace them.',
          code: 'taxonomy_unmatched',
          unmatched,
        };
      }
      if (sqlState === 'FS002') {
        return {
          success: false,
          action: input.action,
          revisionId: input.revisionId,
          scholarId,
          error: describeSnapshotInvalid((rpcErr as { message?: unknown }).message),
          code: 'snapshot_invalid',
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
    console.error('Error verifying institution:', { code: (error as { code?: string }).code });
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
    console.error('Error processing content report:', { code: (error as { code?: string }).code });
    return { success: false, error: 'Failed to process content report.' };
  }

  return { success: true };
}
