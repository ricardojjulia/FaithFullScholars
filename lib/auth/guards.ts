/**
 * ==============================================================================
 * FaithFull Scholars — Page-level Authorization Guards
 *
 * Next.js renders layouts and pages in parallel: a layout that hides its
 * children does NOT stop a page from running or its data from reaching the RSC
 * payload (node_modules/next/dist/docs/01-app/02-guides/authentication.md,
 * "Layouts and auth checks"). Every server page that loads protected data must
 * call one of these guards itself, before fetching.
 * ==============================================================================
 */

import { notFound, redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSessionContext, type SessionContext } from '@/lib/auth/session';
import { verifyStaffUser } from '@/lib/feedback/auth';

/** Admin pages: anyone who is not platform staff gets a 404 (no admin surface is revealed). */
export async function requireStaffPage(): Promise<void> {
  const auth = await verifyStaffUser();
  if (!auth.authorized) {
    notFound();
  }
}

/** Institution pages: sign-in required, then membership of an institution. */
export async function requireInstitutionMember(
  client?: SupabaseClient
): Promise<{ session: SessionContext; institutionId: string }> {
  const session = await getSessionContext(client);
  if (!session) {
    redirect('/login');
  }
  const [institutionId] = session.institutionIds;
  if (!institutionId) {
    notFound();
  }
  return { session, institutionId };
}

/** Scholar workspace pages: sign-in required. */
export async function requireSignedIn(client?: SupabaseClient): Promise<SessionContext> {
  const session = await getSessionContext(client);
  if (!session) {
    redirect('/login');
  }
  return session;
}
