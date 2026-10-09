import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Must match scripts/ci-setup-test-users.mjs. */
export const APPROVED_INSTITUTION = 'e1000000-0000-0000-0000-000000000001';
export const SHARED_SHORTLIST_SCHOLARS = [
  'f1000000-0000-0000-0000-000000000001',
  'f1000000-0000-0000-0000-000000000002',
];
export const REMOVAL_SCHOLAR = {
  slug: 'e2e-removal-scholar',
  fullName: 'E2E Removal Scholar',
  courseSlug: 'e2e-removal-course',
  courseTitle: 'E2E Removal Course',
};
export const SEEDED_INQUIRY_MESSAGE =
  'E2E seeded inquiry: please confirm your availability to teach an adjunct course in Fall 2027.';
/** Must match scripts/ci-setup-test-users.mjs (ADR 0027). */
export const APPLICANT_SCHOLAR = { slug: 'e2e-applicant-scholar', fullName: 'E2E Applicant Scholar' };
export const APPLICATIONS_POSTING = {
  id: 'f2000000-0000-0000-0000-0000000000a1',
  slug: 'e2e-applications-posting',
  title: 'E2E Applications Posting: Adjunct in New Testament',
};
export const SCHOLAR_PERSONA = { slug: 'e2e-test-scholar', fullName: 'E2E Test Scholar' };

/**
 * Service-role client for arranging and verifying data. The disposable local
 * stack only (CI exports these variables for the E2E job); never the app's own path.
 */
export function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for this spec.');
  if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) {
    throw new Error('Refusing to run fixtures against a non-local Supabase.');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
