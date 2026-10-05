import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * Trust guards phase 2 (ADR 0023, migration 20261005150000) evaluated as real
 * `authenticated` callers — the way PostgREST runs requests. Each test runs in a
 * transaction that is rolled back; seed data is never modified.
 */

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:49322/postgres';

const SCHOLAR_A_ACCOUNT = 'a1000000-0000-0000-0000-000000000002';
const INST_USER_ACCOUNT = 'a1000000-0000-0000-0000-000000000004';
const INST_A = 'e1000000-0000-0000-0000-000000000001'; // approved (seed)
const INST_B = 'e1000000-0000-0000-0000-000000000002'; // approved (seed), caller is not a member
const PENDING_INST = 'e1000000-0000-0000-0000-0000000000fd';
const CONTRACT = 'c0000000-0000-0000-0000-0000000000c1';
const MILESTONE = 'c0000000-0000-0000-0000-0000000000a1';
const LICENSE = 'c0000000-0000-0000-0000-0000000000b1';
const CONSORTIUM = 'c0000000-0000-0000-0000-0000000000d1';

type Caller = { sub: string };

describe('Trust guards phase 2 — real authenticated callers', () => {
  let client: Client;
  let scholarA: string;
  let courseOfA: string;
  let otherScholar: string;

  beforeAll(async () => {
    client = new Client({ connectionString: dbUrl });
    await client.connect();
    scholarA = (
      await client.query(`SELECT id FROM public.scholars WHERE account_id = $1`, [SCHOLAR_A_ACCOUNT])
    ).rows[0].id;
    const course = await client.query(
      `SELECT id FROM public.courses WHERE scholar_id = $1 LIMIT 1`,
      [scholarA]
    );
    courseOfA = course.rows[0]?.id;
    otherScholar = (
      await client.query(`SELECT id FROM public.scholars WHERE id <> $1 LIMIT 1`, [scholarA])
    ).rows[0].id;
  });

  afterAll(async () => {
    await client.end();
  });

  async function as(caller: Caller, setup: () => Promise<void>, body: () => Promise<void>) {
    await client.query('BEGIN');
    try {
      await setup();
      await client.query('SET LOCAL ROLE authenticated');
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ role: 'authenticated', sub: caller.sub }),
      ]);
      await body();
    } finally {
      await client.query('ROLLBACK');
    }
  }

  async function denied(sql: string, params: unknown[] = []) {
    await client.query('SAVEPOINT attempt');
    await expect(client.query(sql, params)).rejects.toThrow(/Unauthorized|row-level security/);
    await client.query('ROLLBACK TO SAVEPOINT attempt');
  }

  async function allowed(sql: string, params: unknown[] = []) {
    const res = await client.query(sql, params);
    expect(res.rowCount).toBeGreaterThan(0);
  }

  const memberOfA = async () => {
    await client.query(
      `INSERT INTO public.institution_users (institution_id, account_id, role) VALUES ($1, $2, 'owner')
       ON CONFLICT (account_id, institution_id) DO UPDATE SET role = 'owner'`,
      [INST_A, INST_USER_ACCOUNT]
    );
  };

  const contractFixture = async (status = 'offered') => {
    await memberOfA();
    await client.query(
      `INSERT INTO public.institution_contracts
         (id, institution_id, scholar_id, opportunity_type, title, scope_of_work, start_date, total_compensation_amount, status)
       VALUES ($1, $2, $3, 'adjunct_course', 'Probe contract', 'Teach one course', CURRENT_DATE, 3000, $4)`,
      [CONTRACT, INST_A, scholarA, status]
    );
    await client.query(
      `INSERT INTO public.contract_milestones (id, contract_id, title, compensation_amount, status)
       VALUES ($1, $2, 'Syllabus delivered', 1000, 'pending')`,
      [MILESTONE, CONTRACT]
    );
  };

  // ---------------------------------------------------------------------------
  it('subscriptions: a member cannot change plan or limits; usage may only increase by one', async () => {
    await as(
      { sub: INST_USER_ACCOUNT },
      async () => {
        await memberOfA();
        await client.query(`DELETE FROM public.institution_subscriptions WHERE institution_id = $1`, [INST_A]);
        await client.query(
          `INSERT INTO public.institution_subscriptions (institution_id, tier, inquiries_used_current_month) VALUES ($1, 'basic', 2)`,
          [INST_A]
        );
      },
      async () => {
        await denied(`UPDATE public.institution_subscriptions SET tier = 'premier_partner' WHERE institution_id = $1`, [INST_A]);
        await denied(`UPDATE public.institution_subscriptions SET monthly_inquiry_limit = 999 WHERE institution_id = $1`, [INST_A]);
        await denied(`UPDATE public.institution_subscriptions SET inquiries_used_current_month = 0 WHERE institution_id = $1`, [INST_A]);
        await allowed(
          `UPDATE public.institution_subscriptions SET inquiries_used_current_month = inquiries_used_current_month + 1 WHERE institution_id = $1`,
          [INST_A]
        );
      }
    );
  });

  // ---------------------------------------------------------------------------
  it('contracts: an institution cannot accept for the scholar or rewrite scholar notes', async () => {
    await as({ sub: INST_USER_ACCOUNT }, () => contractFixture('offered'), async () => {
      await denied(`UPDATE public.institution_contracts SET status = 'accepted' WHERE id = $1`, [CONTRACT]);
      await denied(`UPDATE public.institution_contracts SET scholar_notes = 'I agree to everything' WHERE id = $1`, [CONTRACT]);
      await allowed(`UPDATE public.institution_contracts SET title = 'Revised offer' WHERE id = $1`, [CONTRACT]);
    });
  });

  it('contracts: terms are locked once the scholar has accepted', async () => {
    await as({ sub: INST_USER_ACCOUNT }, () => contractFixture('accepted'), async () => {
      await denied(`UPDATE public.institution_contracts SET total_compensation_amount = 1 WHERE id = $1`, [CONTRACT]);
      await allowed(`UPDATE public.institution_contracts SET status = 'in_progress' WHERE id = $1`, [CONTRACT]);
    });
  });

  it('contracts: a scholar can accept an offer but cannot rewrite its compensation', async () => {
    await as({ sub: SCHOLAR_A_ACCOUNT }, () => contractFixture('offered'), async () => {
      await denied(`UPDATE public.institution_contracts SET total_compensation_amount = 999999 WHERE id = $1`, [CONTRACT]);
      await allowed(`UPDATE public.institution_contracts SET status = 'accepted', scholar_notes = 'Glad to serve' WHERE id = $1`, [CONTRACT]);
    });
  });

  it('contracts: a pending institution cannot offer contracts', async () => {
    await as(
      { sub: INST_USER_ACCOUNT },
      async () => {
        await client.query(
          `INSERT INTO public.institutions (id, name, slug, institution_type, status, contact_email)
           VALUES ($1, 'Pending Contract Probe', 'pending-contract-probe', 'seminary', 'pending', 'p@pending.edu')`,
          [PENDING_INST]
        );
        await client.query(
          `INSERT INTO public.institution_users (institution_id, account_id, role) VALUES ($1, $2, 'owner')`,
          [PENDING_INST, INST_USER_ACCOUNT]
        );
      },
      async () => {
        await denied(
          `INSERT INTO public.institution_contracts
             (institution_id, scholar_id, opportunity_type, title, scope_of_work, start_date, status)
           VALUES ($1, $2, 'adjunct_course', 'x', 'y', CURRENT_DATE, 'offered')`,
          [PENDING_INST, scholarA]
        );
      }
    );
  });

  // ---------------------------------------------------------------------------
  it('milestones: the scholar submits; only the institution verifies; amounts lock after acceptance', async () => {
    await as({ sub: SCHOLAR_A_ACCOUNT }, () => contractFixture('accepted'), async () => {
      await denied(`UPDATE public.contract_milestones SET status = 'paid' WHERE id = $1`, [MILESTONE]);
      await denied(`UPDATE public.contract_milestones SET compensation_amount = 99999 WHERE id = $1`, [MILESTONE]);
      await allowed(`UPDATE public.contract_milestones SET status = 'submitted' WHERE id = $1`, [MILESTONE]);
    });
    await as({ sub: INST_USER_ACCOUNT }, () => contractFixture('accepted'), async () => {
      await denied(`UPDATE public.contract_milestones SET compensation_amount = 1 WHERE id = $1`, [MILESTONE]);
      await allowed(`UPDATE public.contract_milestones SET status = 'verified' WHERE id = $1`, [MILESTONE]);
    });
  });

  // ---------------------------------------------------------------------------
  it('licensing: cannot license a course from a scholar who does not offer it, or pre-sign for the scholar', async () => {
    expect(courseOfA, 'seed must contain a course for scholar A').toBeTruthy();
    await as({ sub: INST_USER_ACCOUNT }, memberOfA, async () => {
      await denied(
        `INSERT INTO public.course_licensing_agreements (course_id, scholar_id, institution_id, license_type, term_duration, status)
         VALUES ($1, $2, $3, 'syllabus_only', '1_semester', 'requested')`,
        [courseOfA, otherScholar, INST_A]
      );
      await denied(
        `INSERT INTO public.course_licensing_agreements (course_id, scholar_id, institution_id, license_type, term_duration, status, signed_by_scholar_at)
         VALUES ($1, $2, $3, 'syllabus_only', '1_semester', 'requested', now())`,
        [courseOfA, scholarA, INST_A]
      );
      await allowed(
        `INSERT INTO public.course_licensing_agreements (course_id, scholar_id, institution_id, license_type, term_duration, status, signed_by_institution_at)
         VALUES ($1, $2, $3, 'syllabus_only', '1_semester', 'requested', now())`,
        [courseOfA, scholarA, INST_A]
      );
    });
  });

  it('licensing: each side signs only for itself, and new terms void the other side\'s signature', async () => {
    const licenseFixture = async () => {
      await memberOfA();
      await client.query(
        `INSERT INTO public.course_licensing_agreements
           (id, course_id, scholar_id, institution_id, license_type, term_duration, royalty_amount, status, signed_by_scholar_at)
         VALUES ($1, $2, $3, $4, 'syllabus_only', '1_semester', 500, 'counter_proposed', now())`,
        [LICENSE, courseOfA, scholarA, INST_A]
      );
    };
    await as({ sub: INST_USER_ACCOUNT }, licenseFixture, async () => {
      await denied(`UPDATE public.course_licensing_agreements SET signed_by_scholar_at = now() WHERE id = $1`, [LICENSE]);
      // Lowering the royalty after the scholar signed must clear the scholar's signature…
      await allowed(`UPDATE public.course_licensing_agreements SET royalty_amount = 1 WHERE id = $1`, [LICENSE]);
      const row = await client.query(`SELECT signed_by_scholar_at FROM public.course_licensing_agreements WHERE id = $1`, [LICENSE]);
      expect(row.rows[0].signed_by_scholar_at).toBeNull();
      // …so the institution cannot then activate it alone.
      await client.query(`UPDATE public.course_licensing_agreements SET signed_by_institution_at = now() WHERE id = $1`, [LICENSE]);
      await denied(`UPDATE public.course_licensing_agreements SET status = 'active' WHERE id = $1`, [LICENSE]);
    });
  });

  // ---------------------------------------------------------------------------
  it('endorsements: pending institutions cannot endorse; "verified" requires owner or admin', async () => {
    await as(
      { sub: INST_USER_ACCOUNT },
      async () => {
        await client.query(
          `INSERT INTO public.institutions (id, name, slug, institution_type, status, contact_email)
           VALUES ($1, 'Pending Endorse Probe', 'pending-endorse-probe', 'seminary', 'pending', 'p@pending.edu')`,
          [PENDING_INST]
        );
        await client.query(
          `INSERT INTO public.institution_users (institution_id, account_id, role) VALUES ($1, $2, 'owner')`,
          [PENDING_INST, INST_USER_ACCOUNT]
        );
        await client.query(
          `INSERT INTO public.institution_users (institution_id, account_id, role) VALUES ($1, $2, 'recruiter')
           ON CONFLICT (account_id, institution_id) DO UPDATE SET role = 'recruiter'`,
          [INST_A, INST_USER_ACCOUNT]
        );
      },
      async () => {
        const insert = `INSERT INTO public.institution_endorsements
          (institution_id, scholar_id, relationship_type, department_or_field, endorsement_text, is_credential_verified)
          VALUES ($1, $2, 'Current Faculty', 'New Testament', 'Probe endorsement', $3)`;
        await denied(insert, [PENDING_INST, scholarA, false]);
        await denied(insert, [INST_A, scholarA, true]); // recruiter, not owner/admin
        await allowed(insert, [INST_A, scholarA, false]);
      }
    );
  });

  // ---------------------------------------------------------------------------
  it('consortiums: a lead can invite (pending) but not list another institution as an active member', async () => {
    await as(
      { sub: INST_USER_ACCOUNT },
      async () => {
        await memberOfA();
        await client.query(
          `INSERT INTO public.consortiums (id, name, slug, lead_institution_id) VALUES ($1, 'Probe Consortium', 'probe-consortium', $2)`,
          [CONSORTIUM, INST_A]
        );
      },
      async () => {
        const add = `INSERT INTO public.consortium_members (consortium_id, institution_id, role, status) VALUES ($1, $2, 'member', $3)`;
        await denied(add, [CONSORTIUM, INST_B, 'active']);
        await allowed(add, [CONSORTIUM, INST_B, 'pending']);
        await denied(`UPDATE public.consortium_members SET status = 'active' WHERE consortium_id = $1 AND institution_id = $2`, [CONSORTIUM, INST_B]);
      }
    );
  });
});
