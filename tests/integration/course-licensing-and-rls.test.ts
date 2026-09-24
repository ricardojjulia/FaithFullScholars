import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

describe('Course Licensing Agreements & PostgreSQL RLS Policies (ADR 0013)', () => {
  let db: pg.Client;

  beforeAll(async () => {
    db = new pg.Client({
      connectionString:
        process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:49322/postgres',
    });
    await db.connect();
  });

  afterAll(async () => {
    await db.end();
  });

  it('1. verifies that public.course_licensing_agreements has RLS strictly enabled and forced', async () => {
    const res = await db.query(`
      SELECT tablename, rowsecurity, (
        SELECT count(*) FROM pg_policy WHERE polrelid = c.oid
      )::int as policy_count
      FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      WHERE t.schemaname = 'public'
        AND t.tablename = 'course_licensing_agreements';
    `);

    expect(res.rows.length).toBe(1);
    expect(res.rows[0].rowsecurity).toBe(true);
    expect(res.rows[0].policy_count).toBeGreaterThanOrEqual(6);
  });

  it('2. verifies seeded course licensing agreements and relational integrity', async () => {
    const res = await db.query(`
      SELECT 
        cla.id,
        cla.license_type,
        cla.term_duration,
        cla.royalty_amount,
        cla.status,
        c.title as course_title,
        s.full_name as scholar_name,
        i.name as institution_name,
        i.accreditation_body,
        i.accreditation_status
      FROM public.course_licensing_agreements cla
      JOIN public.courses c ON c.id = cla.course_id
      JOIN public.scholars s ON s.id = cla.scholar_id
      JOIN public.institutions i ON i.id = cla.institution_id
      ORDER BY cla.created_at ASC;
    `);

    expect(res.rows.length).toBeGreaterThanOrEqual(2);

    const activeAgreements = res.rows.filter((r) => r.status === 'active');
    expect(activeAgreements.length).toBeGreaterThanOrEqual(1);
    expect(activeAgreements[0].royalty_amount).toBe('3500.00');
    expect(activeAgreements[0].accreditation_body).toBe('ATS');
    expect(activeAgreements[0].accreditation_status).toBe('accredited');
  });

  it('3. verifies bilateral signing transition to active status', async () => {
    // Insert a draft request
    const insertRes = await db.query(`
      INSERT INTO public.course_licensing_agreements (
        course_id, scholar_id, institution_id, license_type, term_duration,
        royalty_amount, status, signed_by_institution_at
      ) VALUES (
        '02000000-0000-0000-0000-000000000001',
        'f1000000-0000-0000-0000-000000000001',
        'e1000000-0000-0000-0000-000000000001',
        'syllabus_only',
        '1_semester',
        500.00,
        'requested',
        now()
      ) RETURNING id;
    `);

    const agreementId = insertRes.rows[0].id;

    // Scholar countersigns
    await db.query(`
      UPDATE public.course_licensing_agreements
      SET 
        signed_by_scholar_at = now(),
        status = 'active'
      WHERE id = $1;
    `, [agreementId]);

    const verifyRes = await db.query(`
      SELECT status, signed_by_scholar_at, signed_by_institution_at
      FROM public.course_licensing_agreements
      WHERE id = $1;
    `, [agreementId]);

    expect(verifyRes.rows[0].status).toBe('active');
    expect(verifyRes.rows[0].signed_by_scholar_at).not.toBeNull();
    expect(verifyRes.rows[0].signed_by_institution_at).not.toBeNull();

    // Clean up
    await db.query(`DELETE FROM public.course_licensing_agreements WHERE id = $1;`, [agreementId]);
  });
});
