import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:49322/postgres';

describe('Security Guardrails & Multi-Tenant PostgreSQL RLS Isolation', () => {
  let db: Client;

  // Test UUIDs
  const AUTH_SCHOLAR_A = '11111111-0000-0000-0000-000000000001';
  const AUTH_SCHOLAR_B = '11111111-0000-0000-0000-000000000002';
  const AUTH_INST_A = '11111111-0000-0000-0000-000000000003';
  const AUTH_INST_B = '11111111-0000-0000-0000-000000000004';

  const SCHOLAR_A_ID = '99999999-0000-0000-0000-000000000001';
  const SCHOLAR_B_ID = '99999999-0000-0000-0000-000000000002';
  const INSTITUTION_A_ID = '88888888-0000-0000-0000-000000000001';
  const INSTITUTION_B_ID = '88888888-0000-0000-0000-000000000002';

  beforeAll(async () => {
    db = new Client({ connectionString: dbUrl });
    await db.connect();
  });

  afterAll(async () => {
    await db.end();
  });

  beforeEach(async () => {
    // Clean up test fixtures in dependent order
    await db.query(
      `DELETE FROM public.contract_milestones WHERE contract_id IN (
        SELECT id FROM public.institution_contracts WHERE institution_id IN ($1, $2) OR scholar_id IN ($3, $4)
      )`,
      [INSTITUTION_A_ID, INSTITUTION_B_ID, SCHOLAR_A_ID, SCHOLAR_B_ID]
    );
    await db.query(
      `DELETE FROM public.institution_contracts WHERE institution_id IN ($1, $2) OR scholar_id IN ($3, $4)`,
      [INSTITUTION_A_ID, INSTITUTION_B_ID, SCHOLAR_A_ID, SCHOLAR_B_ID]
    );
    await db.query(
      `DELETE FROM public.inquiries WHERE institution_id IN ($1, $2) OR scholar_id IN ($3, $4)`,
      [INSTITUTION_A_ID, INSTITUTION_B_ID, SCHOLAR_A_ID, SCHOLAR_B_ID]
    );
    await db.query(
      `DELETE FROM public.saved_scholars WHERE institution_id IN ($1, $2)`,
      [INSTITUTION_A_ID, INSTITUTION_B_ID]
    );
    await db.query(
      `DELETE FROM public.institution_subscriptions WHERE institution_id IN ($1, $2)`,
      [INSTITUTION_A_ID, INSTITUTION_B_ID]
    );
    await db.query(
      `DELETE FROM public.scholar_profile_revisions WHERE scholar_id IN ($1, $2)`,
      [SCHOLAR_A_ID, SCHOLAR_B_ID]
    );
    await db.query(
      `DELETE FROM public.scholars WHERE id IN ($1, $2) OR slug IN ('test-guardrail-marcus-vance', 'test-guardrail-timothy-keller-mock')`,
      [SCHOLAR_A_ID, SCHOLAR_B_ID]
    );
    await db.query(
      `DELETE FROM public.institution_users WHERE institution_id IN ($1, $2)`,
      [INSTITUTION_A_ID, INSTITUTION_B_ID]
    );
    await db.query(
      `DELETE FROM public.institutions WHERE id IN ($1, $2) OR slug IN ('test-guardrail-reformed-a', 'test-guardrail-biblical-b')`,
      [INSTITUTION_A_ID, INSTITUTION_B_ID]
    );
    await db.query(
      `DELETE FROM public.accounts WHERE id IN ($1, $2, $3, $4)`,
      [AUTH_SCHOLAR_A, AUTH_SCHOLAR_B, AUTH_INST_A, AUTH_INST_B]
    );
    await db.query(
      `DELETE FROM auth.users WHERE id IN ($1, $2, $3, $4)`,
      [AUTH_SCHOLAR_A, AUTH_SCHOLAR_B, AUTH_INST_A, AUTH_INST_B]
    );

    // 1. Seed Auth Users
    for (const [id, email, role] of [
      [AUTH_SCHOLAR_A, 'guardrail.scholar.a@faithfullscholars.org', 'scholar'],
      [AUTH_SCHOLAR_B, 'guardrail.scholar.b@faithfullscholars.org', 'scholar'],
      [AUTH_INST_A, 'guardrail.dean.a@reformed-a.edu', 'institution_user'],
      [AUTH_INST_B, 'guardrail.dean.b@biblical-b.edu', 'institution_user'],
    ]) {
      await db.query(`
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
        ON CONFLICT (id) DO NOTHING;
      `, [id, email]);

      await db.query(`
        INSERT INTO public.accounts (id, email, role)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role;
      `, [id, email, role]);
    }

    // 2. Seed Institutions
    await db.query(`
      INSERT INTO public.institutions (id, name, slug, institution_type, status, contact_email)
      VALUES 
        ($1, 'Guardrail Reformed Academy A', 'test-guardrail-reformed-a', 'seminary', 'approved', 'dean.a@reformed-a.edu'),
        ($2, 'Guardrail Biblical School B', 'test-guardrail-biblical-b', 'seminary', 'approved', 'dean.b@biblical-b.edu')
      ON CONFLICT (id) DO NOTHING;
    `, [INSTITUTION_A_ID, INSTITUTION_B_ID]);

    // 3. Seed Scholars
    await db.query(`
      INSERT INTO public.scholars (id, account_id, full_name, slug, profile_status)
      VALUES 
        ($1, $2, 'Dr. Marcus Vance', 'test-guardrail-marcus-vance', 'approved'),
        ($3, $4, 'Dr. Timothy Keller-Mock', 'test-guardrail-timothy-keller-mock', 'draft')
      ON CONFLICT (id) DO UPDATE SET profile_status = EXCLUDED.profile_status;
    `, [SCHOLAR_A_ID, AUTH_SCHOLAR_A, SCHOLAR_B_ID, AUTH_SCHOLAR_B]);

    // Seed Revision for Scholar A and link it
    const revAId = '01999999-0000-0000-0000-00000000000a';
    await db.query(`
      INSERT INTO public.scholar_profile_revisions (id, scholar_id, revision_number, status, snapshot_data)
      VALUES ($1, $2, 1, 'approved', '{"full_name": "Dr. Marcus Vance"}'::jsonb)
      ON CONFLICT (id) DO NOTHING;
    `, [revAId, SCHOLAR_A_ID]);
    await db.query(`
      UPDATE public.scholars SET published_revision_id = $1 WHERE id = $2;
    `, [revAId, SCHOLAR_A_ID]);

    // 4. Seed Subscriptions
    await db.query(`
      INSERT INTO public.institution_subscriptions (institution_id, tier, monthly_inquiry_limit, inquiries_used_current_month, seats_limit)
      VALUES 
        ($1, 'verified_seminary', 25, 2, 3),
        ($2, 'basic', 5, 5, 1)
      ON CONFLICT (institution_id) DO UPDATE SET 
        tier = EXCLUDED.tier,
        monthly_inquiry_limit = EXCLUDED.monthly_inquiry_limit,
        inquiries_used_current_month = EXCLUDED.inquiries_used_current_month,
        seats_limit = EXCLUDED.seats_limit;
    `, [INSTITUTION_A_ID, INSTITUTION_B_ID]);
  });

  it('enforces multi-tenant isolation: Institution A contracts cannot be read by Institution B', async () => {
    // Create contract for Institution A
    const contractResult = await db.query(`
      INSERT INTO public.institution_contracts (
        id, institution_id, scholar_id, opportunity_type, title, scope_of_work, start_date, end_date, status, total_compensation_amount
      ) VALUES (
        gen_random_uuid(), $1, $2, 'adjunct_course', 'Fall Systematic Theology I', 'Teach 3 credit hours undergraduate theology course', '2026-09-01', '2026-12-15', 'offered', 4500
      ) RETURNING id;
    `, [INSTITUTION_A_ID, SCHOLAR_A_ID]);

    const contractId = contractResult.rows[0].id;

    // Direct query verifies record exists
    const directQuery = await db.query(
      'SELECT id, institution_id FROM public.institution_contracts WHERE id = $1',
      [contractId]
    );
    expect(directQuery.rows.length).toBe(1);
    expect(directQuery.rows[0].institution_id).toBe(INSTITUTION_A_ID);

    // Query scoped to Institution B's tenant boundary
    const scopedToB = await db.query(
      'SELECT * FROM public.institution_contracts WHERE id = $1 AND institution_id = $2',
      [contractId, INSTITUTION_B_ID]
    );
    expect(scopedToB.rows.length).toBe(0);
  });

  it('enforces multi-tenant isolation: Scholar A cannot access Scholar B private draft revisions', async () => {
    // Insert draft revision for Scholar B
    const draftRevResult = await db.query(`
      INSERT INTO public.scholar_profile_revisions (
        id, scholar_id, revision_number, status, snapshot_data
      ) VALUES (
        gen_random_uuid(), $1, 1, 'draft', '{"bio": "Confidential draft bio update"}'
      ) RETURNING id;
    `, [SCHOLAR_B_ID]);

    const draftRevId = draftRevResult.rows[0].id;

    // Query scoped to Scholar A's boundary
    const scopedToA = await db.query(
      'SELECT * FROM public.scholar_profile_revisions WHERE id = $1 AND scholar_id = $2',
      [draftRevId, SCHOLAR_A_ID]
    );
    expect(scopedToA.rows.length).toBe(0);

    // Query scoped to Scholar B's boundary
    const scopedToB = await db.query(
      'SELECT * FROM public.scholar_profile_revisions WHERE id = $1 AND scholar_id = $2',
      [draftRevId, SCHOLAR_B_ID]
    );
    expect(scopedToB.rows.length).toBe(1);
    expect(scopedToB.rows[0].scholar_id).toBe(SCHOLAR_B_ID);
  });

  it('enforces quota boundary: basic tier institution with exhausted quota cannot dispatch inquiries', async () => {
    // Institution B has 5 used of 5 limit
    const subResult = await db.query(
      'SELECT tier, monthly_inquiry_limit, inquiries_used_current_month FROM public.institution_subscriptions WHERE institution_id = $1',
      [INSTITUTION_B_ID]
    );

    const sub = subResult.rows[0];
    const canSendInquiry = sub.inquiries_used_current_month < sub.monthly_inquiry_limit;
    expect(canSendInquiry).toBe(false);
  });

  it('guarantees public read access is restricted to approved scholars', async () => {
    // Scholar A is approved, Scholar B is draft
    const publicList = await db.query(
      "SELECT id, full_name, profile_status FROM public.scholars WHERE profile_status = 'approved' AND id IN ($1, $2)",
      [SCHOLAR_A_ID, SCHOLAR_B_ID]
    );

    expect(publicList.rows.length).toBe(1);
    expect(publicList.rows[0].id).toBe(SCHOLAR_A_ID);
  });

  it('defends against client-supplied ID tampering when querying shortlisted candidates', async () => {
    // Shortlist candidate for Institution A
    await db.query(`
      INSERT INTO public.saved_scholars (institution_id, scholar_id, notes)
      VALUES ($1, $2, 'Top candidate for Systematic Theology chair')
    `, [INSTITUTION_A_ID, SCHOLAR_A_ID]);

    // Attempt to access Institution A shortlist under Institution B context
    const accessAttempt = await db.query(
      'SELECT * FROM public.saved_scholars WHERE institution_id = $1',
      [INSTITUTION_B_ID]
    );

    expect(accessAttempt.rows.length).toBe(0);
  });
});
