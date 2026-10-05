/**
 * ==============================================================================
 * FaithFull Scholars — Server-side Session Context
 *
 * Single source of truth for "who is calling". Identity always comes from the
 * Supabase-verified session (auth.getUser), and role / tenancy always come from
 * database rows (accounts, scholars, institution_users) — never from
 * client-supplied identifiers or user-editable auth metadata.
 * ==============================================================================
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/domain/types';

export interface SessionContext {
  userId: string;
  email?: string;
  role: UserRole | null;
  scholarId: string | null;
  institutionIds: string[];
}

export type InstitutionAccess =
  | { ok: true; institutionId: string }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Resolves the caller's session context, or null when not signed in.
 * Pass an existing user-scoped client to reuse it; otherwise one is created.
 */
export async function getSessionContext(
  client?: SupabaseClient
): Promise<SessionContext | null> {
  const supabase = client ?? (await createClient());

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const [accountRes, scholarRes, membershipRes] = await Promise.all([
    supabase.from('accounts').select('role').eq('id', user.id).maybeSingle(),
    supabase.from('scholars').select('id').eq('account_id', user.id).maybeSingle(),
    supabase.from('institution_users').select('institution_id').eq('account_id', user.id),
  ]);

  // A failed lookup must not silently look like "no role / no membership".
  for (const [label, res] of [
    ['accounts', accountRes],
    ['scholars', scholarRes],
    ['institution_users', membershipRes],
  ] as const) {
    if (res.error) {
      console.error(`getSessionContext: ${label} lookup failed:`, res.error);
    }
  }

  return {
    userId: user.id,
    email: user.email,
    role: (accountRes.data?.role as UserRole | undefined) ?? null,
    scholarId: scholarRes.data?.id ?? null,
    institutionIds: (membershipRes.data ?? []).map(
      (row: { institution_id: string }) => row.institution_id
    ),
  };
}

/**
 * Decides which institution the caller may act for.
 * A requested institution is honoured only if the caller is a member of it;
 * with no request, the caller's first membership is used.
 */
export function resolveInstitutionAccess(
  session: SessionContext | null,
  requestedInstitutionId?: string | null
): InstitutionAccess {
  if (!session) {
    return { ok: false, status: 401, error: 'Authentication required.' };
  }

  if (requestedInstitutionId) {
    if (!session.institutionIds.includes(requestedInstitutionId)) {
      return { ok: false, status: 403, error: 'You are not a member of this institution.' };
    }
    return { ok: true, institutionId: requestedInstitutionId };
  }

  const [first] = session.institutionIds;
  if (!first) {
    return { ok: false, status: 403, error: 'An institution account is required.' };
  }
  return { ok: true, institutionId: first };
}
