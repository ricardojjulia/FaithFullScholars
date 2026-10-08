#!/usr/bin/env node
/**
 * Creates the E2E personas on a disposable LOCAL Supabase stack (CI only).
 *
 * Seed accounts are inserted straight into auth.users with minimal columns and
 * cannot sign in through GoTrue, so E2E uses fresh users created via the Admin
 * API with a password generated per CI run (TEST_USER_PASSWORD, masked).
 *
 *   admin        accounts.role = 'admin'
 *   scholar      accounts.role = 'scholar' + a draft scholar profile
 *   institution  accounts.role = 'institution_user' + owner of the approved
 *                seed institution (Westminster, e1000000-…0001) with a
 *                two-scholar shortlist
 *
 * Plus, for tests/e2e/portal-real-data.spec.ts:
 *   - one idempotent inquiry from the institution to the scholar persona and an
 *     availability row for the scholar persona, so their screens show real data;
 *   - an ISOLATED third scholar (approved, one public course) that the spec adds
 *     to and removes from the shortlist, so the two shared shortlist rows are
 *     never touched.
 *
 * Refuses to run against anything but a local stack.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.TEST_USER_PASSWORD;

if (!url || !serviceKey || !password) {
  console.error('NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and TEST_USER_PASSWORD are required.');
  process.exit(1);
}
const host = new URL(url).hostname;
if (!['127.0.0.1', 'localhost'].includes(host)) {
  console.error(`Refusing to create test users on non-local Supabase (${host}).`);
  process.exit(1);
}

export const REMOVAL_SCHOLAR = {
  email: 'e2e-removal-scholar@test.faithfullscholars.dev',
  slug: 'e2e-removal-scholar',
  fullName: 'E2E Removal Scholar',
  courseSlug: 'e2e-removal-course',
  courseTitle: 'E2E Removal Course',
};
export const SEEDED_INQUIRY_MESSAGE =
  'E2E seeded inquiry: please confirm your availability to teach an adjunct course in Fall 2027.';

export const PERSONAS = {
  admin: { email: 'e2e-admin@test.faithfullscholars.dev', role: 'admin' },
  scholar: { email: 'e2e-scholar@test.faithfullscholars.dev', role: 'scholar' },
  institution: { email: 'e2e-institution@test.faithfullscholars.dev', role: 'institution_user' },
};
const APPROVED_INSTITUTION = 'e1000000-0000-0000-0000-000000000001';

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function ensureUser(email) {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (!created.error) return created.data.user.id;

  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const existing = data.users.find((u) => u.email === email);
  if (!existing) throw created.error;
  const updated = await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
  if (updated.error) throw updated.error;
  return existing.id;
}

async function must(label, promise) {
  const { error } = await promise;
  if (error) {
    console.error(`${label} failed:`, error.message);
    process.exit(1);
  }
}

for (const [name, persona] of Object.entries(PERSONAS)) {
  const id = await ensureUser(persona.email);
  await must(`${name} account`, admin.from('accounts').upsert({ id, email: persona.email, role: persona.role }));

  if (name === 'scholar') {
    await must(
      'scholar profile',
      admin.from('scholars').upsert(
        { account_id: id, full_name: 'E2E Test Scholar', slug: 'e2e-test-scholar', profile_status: 'draft' },
        { onConflict: 'account_id' }
      )
    );
  }
  if (name === 'institution') {
    await must(
      'institution membership',
      admin.from('institution_users').upsert(
        { institution_id: APPROVED_INSTITUTION, account_id: id, role: 'owner' },
        { onConflict: 'account_id,institution_id' }
      )
    );
    // A real shortlist (approved seed scholars), so shortlist, export and the
    // ATS accreditation matrix exercise live data rather than demo fixtures.
    await must(
      'institution shortlist',
      admin.from('saved_scholars').upsert(
        [
          { institution_id: APPROVED_INSTITUTION, scholar_id: 'f1000000-0000-0000-0000-000000000001', notes: 'E2E shortlist' },
          { institution_id: APPROVED_INSTITUTION, scholar_id: 'f1000000-0000-0000-0000-000000000002', notes: 'E2E shortlist' },
        ],
        { onConflict: 'institution_id,scholar_id' }
      )
    );
  }
  console.log(`✓ ${name} persona ready`);
}

// ---- Data for tests/e2e/portal-real-data.spec.ts (all idempotent) -------------

const idOf = async (label, query) => {
  const { data, error } = await query.maybeSingle();
  if (error || !data) {
    console.error(`${label} lookup failed:`, error?.message ?? 'not found');
    process.exit(1);
  }
  return data.id;
};

const scholarAccountId = (await admin.from('accounts').select('id').eq('email', PERSONAS.scholar.email).maybeSingle()).data?.id;
const institutionAccountId = (await admin.from('accounts').select('id').eq('email', PERSONAS.institution.email).maybeSingle()).data?.id;
const scholarId = await idOf('scholar persona', admin.from('scholars').select('id').eq('account_id', scholarAccountId));

await must(
  'scholar availability',
  admin.from('availability_profiles').upsert(
    {
      scholar_id: scholarId,
      is_available_for_hire: true,
      opportunity_types: ['adjunct_teaching', 'guest_lecturing'],
    },
    { onConflict: 'scholar_id' }
  )
);

const existingInquiry = await admin
  .from('inquiries')
  .select('id')
  .eq('institution_id', APPROVED_INSTITUTION)
  .eq('scholar_id', scholarId)
  .eq('message', SEEDED_INQUIRY_MESSAGE)
  .limit(1);
if (existingInquiry.error) {
  console.error('inquiry lookup failed:', existingInquiry.error.message);
  process.exit(1);
}
if ((existingInquiry.data ?? []).length === 0) {
  await must(
    'seeded inquiry',
    admin.from('inquiries').insert({
      institution_id: APPROVED_INSTITUTION,
      scholar_id: scholarId,
      sender_account_id: institutionAccountId,
      opportunity_type: 'adjunct_teaching',
      proposed_term: 'Fall 2027',
      message: SEEDED_INQUIRY_MESSAGE,
      contact_email: PERSONAS.institution.email,
      status: 'pending',
    })
  );
}

const removalId = await ensureUser(REMOVAL_SCHOLAR.email);
await must('removal scholar account', admin.from('accounts').upsert({ id: removalId, email: REMOVAL_SCHOLAR.email, role: 'scholar' }));
await must(
  'removal scholar profile',
  admin.from('scholars').upsert(
    {
      account_id: removalId,
      full_name: REMOVAL_SCHOLAR.fullName,
      slug: REMOVAL_SCHOLAR.slug,
      profile_status: 'approved',
    },
    { onConflict: 'account_id' }
  )
);
const removalScholarId = await idOf('removal scholar', admin.from('scholars').select('id').eq('account_id', removalId));
await must(
  'removal scholar course',
  admin.from('courses').upsert(
    {
      scholar_id: removalScholarId,
      title: REMOVAL_SCHOLAR.courseTitle,
      slug: REMOVAL_SCHOLAR.courseSlug,
      level: 'graduate',
      visibility: 'public',
    },
    { onConflict: 'scholar_id,slug' }
  )
);
console.log('✓ portal-real-data fixtures ready');
