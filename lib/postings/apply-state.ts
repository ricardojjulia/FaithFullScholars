/**
 * ==============================================================================
 * FaithFull Scholars — what the posting page offers the visitor (ADR 0027)
 *
 * One decision, made on the server from the verified session and the visitor's own
 * rows (RLS-scoped client), so the page never offers a button the database will
 * refuse. It is a convenience only: `submit_posting_application` re-checks
 * everything.
 * ==============================================================================
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSessionContext } from '@/lib/auth/session';
import { isApplicationStatus, type ApplicationStatus } from '@/lib/postings/application-status';

export type ApplyState =
  | { kind: 'signed_out' }
  | { kind: 'unavailable' }
  | { kind: 'institution' }
  | { kind: 'closed' }
  | { kind: 'not_eligible'; hasProfile: boolean }
  | { kind: 'apply' }
  | { kind: 'applied'; applicationId: string; status: ApplicationStatus; appliedAt: string };

export async function loadApplyState(
  client: SupabaseClient,
  posting: { id: string; status: string }
): Promise<ApplyState> {
  const session = await getSessionContext(client);
  if (!session) return { kind: 'signed_out' };
  if (session.lookupFailed) return { kind: 'unavailable' };

  // Institution users do not apply; the page shows them nothing.
  if (session.institutionIds.length > 0 || session.role === 'institution_user') {
    return { kind: 'institution' };
  }

  if (!session.scholarId) return { kind: 'not_eligible', hasProfile: false };

  const { data: existing, error: existingError } = await client
    .from('posting_applications')
    .select('id, status, created_at')
    .eq('posting_id', posting.id)
    .eq('scholar_id', session.scholarId)
    .maybeSingle();
  if (existingError) {
    console.error('loadApplyState: application lookup failed (code):', existingError.code ?? 'unknown');
    return { kind: 'unavailable' };
  }
  if (existing && isApplicationStatus(existing.status)) {
    return { kind: 'applied', applicationId: existing.id, status: existing.status, appliedAt: existing.created_at };
  }

  if (posting.status !== 'published') return { kind: 'closed' };

  const { data: scholar, error: scholarError } = await client
    .from('scholars')
    .select('profile_status')
    .eq('id', session.scholarId)
    .maybeSingle();
  if (scholarError) {
    console.error('loadApplyState: scholar lookup failed (code):', scholarError.code ?? 'unknown');
    return { kind: 'unavailable' };
  }
  if (scholar?.profile_status !== 'approved') return { kind: 'not_eligible', hasProfile: true };

  return { kind: 'apply' };
}
