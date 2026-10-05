import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * RLS as real callers.
 *
 * Every other integration suite connects as a role that bypasses RLS, so none of
 * them prove the policies work. This suite switches to the `anon` and
 * `authenticated` roles with JWT claims (exactly how PostgREST evaluates a
 * request) and asserts tenant isolation. Each test runs in a transaction that is
 * rolled back, so seed data is never modified.
 *
 * Regression guard for 20261004120000_fix_rls_helper_recursion.sql: before that
 * migration, any policy calling is_admin() / is_institution_user() recursed.
 */

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:49322/postgres';

// Seed identities (supabase/seed.sql)
const ADMIN_ACCOUNT = 'a1000000-0000-0000-0000-000000000001';
const SCHOLAR_A_ACCOUNT = 'a1000000-0000-0000-0000-000000000002';
const SCHOLAR_B_ACCOUNT = 'a1000000-0000-0000-0000-000000000003';
const INST_USER_ACCOUNT = 'a1000000-0000-0000-0000-000000000004';
const INST_A = 'e1000000-0000-0000-0000-000000000001';
const INST_B = 'e1000000-0000-0000-0000-000000000002';

describe('RLS enforced for real anon / authenticated callers', () => {
  let client: Client;
  let scholarA: string;
  let scholarB: string;

  beforeAll(async () => {
    client = new Client({ connectionString: dbUrl });
    await client.connect();
    const res = await client.query<{ id: string; account_id: string }>(
      'SELECT id, account_id FROM public.scholars WHERE account_id = ANY($1)',
      [[SCHOLAR_A_ACCOUNT, SCHOLAR_B_ACCOUNT]]
    );
    scholarA = res.rows.find((r) => r.account_id === SCHOLAR_A_ACCOUNT)!.id;
    scholarB = res.rows.find((r) => r.account_id === SCHOLAR_B_ACCOUNT)!.id;
  });

  afterAll(async () => {
    await client.end();
  });

  /** Runs setup as the privileged connection, then `body` as the given caller; always rolls back. */
  async function inTransaction(
    setup: () => Promise<void>,
    caller: { role: 'anon' } | { role: 'authenticated'; sub: string },
    body: () => Promise<void>
  ) {
    await client.query('BEGIN');
    try {
      await setup();
      const claims = caller.role === 'anon' ? { role: 'anon' } : { role: 'authenticated', sub: caller.sub };
      await client.query(`SET LOCAL ROLE ${caller.role}`);
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
      await body();
    } finally {
      await client.query('ROLLBACK');
    }
  }

  /** Inserts an inquiry from INST_A to `scholarId` plus INST_USER membership in INST_A. */
  async function seedInquiry(scholarId: string) {
    await client.query(
      `INSERT INTO public.institution_users (institution_id, account_id, role) VALUES ($1, $2, 'owner')
       ON CONFLICT DO NOTHING`,
      [INST_A, INST_USER_ACCOUNT]
    );
    await client.query(
      `INSERT INTO public.inquiries (institution_id, scholar_id, sender_account_id, opportunity_type, message, contact_email)
       VALUES ($1, $2, $3, 'adjunct_teaching', 'RLS isolation probe message for integration testing.', 'dean@wts.edu')`,
      [INST_A, scholarId, INST_USER_ACCOUNT]
    );
  }

  it('helper functions run as owner from a non-exposed schema (no recursion, no RPC surface)', async () => {
    const res = await client.query(`
      SELECT n.nspname, p.proname, p.prosecdef
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE p.proname IN ('is_admin', 'get_current_scholar_id', 'is_institution_user', 'is_institution_owner')
    `);
    const definerInPublic = res.rows.filter((r) => r.nspname === 'public' && r.prosecdef);
    const definerInPrivate = res.rows.filter((r) => r.nspname === 'private' && r.prosecdef);
    expect(definerInPublic).toHaveLength(0);
    expect(definerInPrivate).toHaveLength(4);
  });

  it('anon can browse approved scholars without policy recursion', async () => {
    await inTransaction(async () => {}, { role: 'anon' }, async () => {
      const res = await client.query(`SELECT count(*)::int AS n FROM public.scholars`);
      expect(res.rows[0].n).toBeGreaterThan(0);
    });
  });

  it('anon sees no inquiries, accounts, or shortlists', async () => {
    await inTransaction(() => seedInquiry(scholarA), { role: 'anon' }, async () => {
      for (const table of ['inquiries', 'accounts', 'saved_scholars', 'institution_users']) {
        const res = await client.query(`SELECT count(*)::int AS n FROM public.${table}`);
        expect(res.rows[0].n, table).toBe(0);
      }
    });
  });

  it('a scholar sees inquiries addressed to them, but not another scholar’s', async () => {
    await inTransaction(
      async () => {
        await seedInquiry(scholarA);
        await seedInquiry(scholarB);
      },
      { role: 'authenticated', sub: SCHOLAR_A_ACCOUNT },
      async () => {
        const res = await client.query(`SELECT scholar_id FROM public.inquiries`);
        expect(res.rows.length).toBeGreaterThan(0);
        expect(res.rows.every((r) => r.scholar_id === scholarA)).toBe(true);
      }
    );
  });

  it('a scholar can read only their own account row', async () => {
    await inTransaction(async () => {}, { role: 'authenticated', sub: SCHOLAR_A_ACCOUNT }, async () => {
      const res = await client.query(`SELECT id FROM public.accounts`);
      expect(res.rows.map((r) => r.id)).toEqual([SCHOLAR_A_ACCOUNT]);
    });
  });

  it('an institution member reads its own inquiries and membership', async () => {
    await inTransaction(() => seedInquiry(scholarA), { role: 'authenticated', sub: INST_USER_ACCOUNT }, async () => {
      const inquiries = await client.query(`SELECT institution_id FROM public.inquiries`);
      expect(inquiries.rows.length).toBeGreaterThan(0);
      expect(inquiries.rows.every((r) => r.institution_id === INST_A)).toBe(true);

      const members = await client.query(`SELECT institution_id FROM public.institution_users`);
      expect(members.rows.map((r) => r.institution_id)).toEqual([INST_A]);
    });
  });

  it('an institution member can shortlist for its own institution but not another', async () => {
    await inTransaction(() => seedInquiry(scholarA), { role: 'authenticated', sub: INST_USER_ACCOUNT }, async () => {
      await client.query(
        `INSERT INTO public.saved_scholars (institution_id, scholar_id) VALUES ($1, $2)`,
        [INST_A, scholarA]
      );

      await client.query('SAVEPOINT cross_tenant');
      await expect(
        client.query(`INSERT INTO public.saved_scholars (institution_id, scholar_id) VALUES ($1, $2)`, [INST_B, scholarA])
      ).rejects.toThrow(/row-level security/);
      await client.query('ROLLBACK TO SAVEPOINT cross_tenant');
    });
  });

  it('a scholar cannot send an inquiry as an institution', async () => {
    await inTransaction(async () => {}, { role: 'authenticated', sub: SCHOLAR_A_ACCOUNT }, async () => {
      await expect(
        client.query(
          `INSERT INTO public.inquiries (institution_id, scholar_id, sender_account_id, opportunity_type, message, contact_email)
           VALUES ($1, $2, $3, 'adjunct_teaching', 'Forged institutional inquiry attempt.', 'x@y.org')`,
          [INST_A, scholarB, SCHOLAR_A_ACCOUNT]
        )
      ).rejects.toThrow(/row-level security/);
    });
  });

  it('only accounts.role = admin passes is_admin(), regardless of JWT metadata', async () => {
    await inTransaction(async () => {}, { role: 'authenticated', sub: SCHOLAR_A_ACCOUNT }, async () => {
      await client.query(
        `SELECT set_config('request.jwt.claims', $1, true)`,
        [JSON.stringify({ role: 'authenticated', sub: SCHOLAR_A_ACCOUNT, user_metadata: { role: 'admin' } })]
      );
      const res = await client.query(`SELECT public.is_admin() AS admin`);
      expect(res.rows[0].admin).toBe(false);
    });

    await inTransaction(async () => {}, { role: 'authenticated', sub: ADMIN_ACCOUNT }, async () => {
      const res = await client.query(`SELECT public.is_admin() AS admin`);
      expect(res.rows[0].admin).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Self-granted trust signals (20261005090000_protect_trust_columns.sql)
  // ---------------------------------------------------------------------------
  const PENDING_INST = 'e1000000-0000-0000-0000-0000000000fe';

  it('a signed-in user cannot make themselves admin by updating accounts.role', async () => {
    await inTransaction(async () => {}, { role: 'authenticated', sub: SCHOLAR_A_ACCOUNT }, async () => {
      await expect(
        client.query(`UPDATE public.accounts SET role = 'admin' WHERE id = $1`, [SCHOLAR_A_ACCOUNT])
      ).rejects.toThrow(/Unauthorized/);
    });
  });

  it('a scholar cannot approve, verify, or publish their own profile — but can edit their biography', async () => {
    const resetToDraft = async () => {
      // Seed scholar A is approved & published; start from an unverified draft so each attempt is a real change.
      await client.query(
        `UPDATE public.scholars SET profile_status = 'draft', verification_status = 'unverified' WHERE id = $1`,
        [scholarA]
      );
    };
    await inTransaction(resetToDraft, { role: 'authenticated', sub: SCHOLAR_A_ACCOUNT }, async () => {
      for (const assignment of [
        `profile_status = 'approved'`,
        `verification_status = 'verified'`,
        `published_revision_id = NULL`,
      ]) {
        await client.query('SAVEPOINT attempt');
        await expect(
          client.query(`UPDATE public.scholars SET ${assignment} WHERE id = $1`, [scholarA])
        ).rejects.toThrow(/Unauthorized/);
        await client.query('ROLLBACK TO SAVEPOINT attempt');
      }
      const ok = await client.query(
        `UPDATE public.scholars SET biography = 'Updated by the scholar' WHERE id = $1`,
        [scholarA]
      );
      expect(ok.rowCount).toBe(1);
    });
  });

  it('an institution member cannot approve its own institution or set accreditation', async () => {
    await inTransaction(
      async () => {
        await client.query(
          `INSERT INTO public.institutions (id, name, slug, institution_type, status, contact_email)
           VALUES ($1, 'Pending Probe Seminary', 'pending-probe-seminary', 'seminary', 'pending', 'probe@pending.edu')`,
          [PENDING_INST]
        );
        await client.query(
          `INSERT INTO public.institution_users (institution_id, account_id, role) VALUES ($1, $2, 'owner')`,
          [PENDING_INST, INST_USER_ACCOUNT]
        );
      },
      { role: 'authenticated', sub: INST_USER_ACCOUNT },
      async () => {
        for (const assignment of [`status = 'approved'`, `accreditation_status = 'accredited'`]) {
          await client.query('SAVEPOINT attempt');
          await expect(
            client.query(`UPDATE public.institutions SET ${assignment} WHERE id = $1`, [PENDING_INST])
          ).rejects.toThrow(/Unauthorized/);
          await client.query('ROLLBACK TO SAVEPOINT attempt');
        }
        const ok = await client.query(
          `UPDATE public.institutions SET website = 'https://pending.example.edu' WHERE id = $1`,
          [PENDING_INST]
        );
        expect(ok.rowCount).toBe(1);
      }
    );
  });

  it('a member of a pending institution cannot insert inquiries directly', async () => {
    await inTransaction(
      async () => {
        await client.query(
          `INSERT INTO public.institutions (id, name, slug, institution_type, status, contact_email)
           VALUES ($1, 'Pending Probe Seminary', 'pending-probe-seminary', 'seminary', 'pending', 'probe@pending.edu')`,
          [PENDING_INST]
        );
        await client.query(
          `INSERT INTO public.institution_users (institution_id, account_id, role) VALUES ($1, $2, 'owner')`,
          [PENDING_INST, INST_USER_ACCOUNT]
        );
      },
      { role: 'authenticated', sub: INST_USER_ACCOUNT },
      async () => {
        await expect(
          client.query(
            `INSERT INTO public.inquiries (institution_id, scholar_id, sender_account_id, opportunity_type, message, contact_email)
             VALUES ($1, $2, $3, 'adjunct_teaching', 'Inquiry from an unapproved institution.', 'probe@pending.edu')`,
            [PENDING_INST, scholarA, INST_USER_ACCOUNT]
          )
        ).rejects.toThrow(/row-level security/);
      }
    );
  });

  it('an institution cannot accept its own inquiry; the recipient scholar can', async () => {
    let inquiryId = '';
    const setup = async () => {
      await seedInquiry(scholarA);
      const res = await client.query(
        `SELECT id FROM public.inquiries WHERE scholar_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [scholarA]
      );
      inquiryId = res.rows[0].id;
    };

    await inTransaction(setup, { role: 'authenticated', sub: INST_USER_ACCOUNT }, async () => {
      await client.query('SAVEPOINT attempt');
      await expect(
        client.query(`UPDATE public.inquiries SET status = 'accepted' WHERE id = $1`, [inquiryId])
      ).rejects.toThrow(/Unauthorized/);
      await client.query('ROLLBACK TO SAVEPOINT attempt');

      await client.query('SAVEPOINT attempt2');
      await expect(
        client.query(`UPDATE public.inquiries SET message = 'Rewritten after sending.' WHERE id = $1`, [inquiryId])
      ).rejects.toThrow(/Unauthorized/);
      await client.query('ROLLBACK TO SAVEPOINT attempt2');

      const archived = await client.query(`UPDATE public.inquiries SET status = 'archived' WHERE id = $1`, [inquiryId]);
      expect(archived.rowCount).toBe(1);
    });

    await inTransaction(setup, { role: 'authenticated', sub: SCHOLAR_A_ACCOUNT }, async () => {
      const accepted = await client.query(`UPDATE public.inquiries SET status = 'accepted' WHERE id = $1`, [inquiryId]);
      expect(accepted.rowCount).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Council Review 12 (P-1..P-3): positive paths, bypass premises, fail-closed
  // ---------------------------------------------------------------------------
  it('admins can still approve scholars and institutions through the user-scoped path', async () => {
    await inTransaction(
      async () => {
        await client.query(`UPDATE public.scholars SET profile_status = 'submitted' WHERE id = $1`, [scholarA]);
        await client.query(
          `INSERT INTO public.institutions (id, name, slug, institution_type, status, contact_email)
           VALUES ($1, 'Pending Probe Seminary', 'pending-probe-seminary', 'seminary', 'pending', 'probe@pending.edu')`,
          [PENDING_INST]
        );
      },
      { role: 'authenticated', sub: ADMIN_ACCOUNT },
      async () => {
        const scholar = await client.query(
          `UPDATE public.scholars SET profile_status = 'approved', verification_status = 'verified' WHERE id = $1`,
          [scholarA]
        );
        expect(scholar.rowCount).toBe(1);
        const institution = await client.query(`UPDATE public.institutions SET status = 'approved' WHERE id = $1`, [PENDING_INST]);
        expect(institution.rowCount).toBe(1);
      }
    );
  });

  it('the service role is not restricted by the trust-column guards', async () => {
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE service_role');
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ role: 'service_role' })]);
      const res = await client.query(`UPDATE public.scholars SET verification_status = 'flagged' WHERE id = $1`, [scholarA]);
      expect(res.rowCount).toBe(1);
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('a session that switches to an API role without JWT claims is still restricted (fails closed)', async () => {
    for (const role of ['authenticated', 'anon']) {
      await client.query('BEGIN');
      try {
        await client.query(`SET LOCAL ROLE ${role}`);
        const res = await client.query(`SELECT private.is_restricted_caller() AS restricted`);
        expect(res.rows[0].restricted, role).toBe(true);
      } finally {
        await client.query('ROLLBACK');
      }
    }
  });

  it('a signed-in user cannot create an account row with the admin role', async () => {
    const NEW_ACCOUNT = 'a1000000-0000-0000-0000-0000000000fe';
    await inTransaction(
      async () => {
        await client.query(
          `INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
             raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
           VALUES ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-admin@example.org',
             '', now(), '{}', '{}', now(), now())`,
          [NEW_ACCOUNT]
        );
      },
      { role: 'authenticated', sub: NEW_ACCOUNT },
      async () => {
        await expect(
          client.query(`INSERT INTO public.accounts (id, email, role) VALUES ($1, 'probe-admin@example.org', 'admin')`, [NEW_ACCOUNT])
        ).rejects.toThrow(/Unauthorized|row-level security/);
      }
    );
  });

  it('an approved institution cannot send an inquiry to an unapproved scholar', async () => {
    await inTransaction(
      async () => {
        await client.query(
          `INSERT INTO public.institution_users (institution_id, account_id, role) VALUES ($1, $2, 'owner') ON CONFLICT DO NOTHING`,
          [INST_A, INST_USER_ACCOUNT]
        );
        await client.query(`UPDATE public.scholars SET profile_status = 'draft' WHERE id = $1`, [scholarA]);
      },
      { role: 'authenticated', sub: INST_USER_ACCOUNT },
      async () => {
        await expect(
          client.query(
            `INSERT INTO public.inquiries (institution_id, scholar_id, sender_account_id, opportunity_type, message, contact_email)
             VALUES ($1, $2, $3, 'adjunct_teaching', 'Inquiry to a draft scholar profile.', 'dean@wts.edu')`,
            [INST_A, scholarA, INST_USER_ACCOUNT]
          )
        ).rejects.toThrow(/row-level security/);
      }
    );
  });

  it('an institution cannot reopen an inquiry the scholar declined', async () => {
    let inquiryId = '';
    await inTransaction(
      async () => {
        await seedInquiry(scholarA);
        const res = await client.query(
          `UPDATE public.inquiries SET status = 'declined'
           WHERE id = (SELECT id FROM public.inquiries WHERE scholar_id = $1 ORDER BY created_at DESC LIMIT 1)
           RETURNING id`,
          [scholarA]
        );
        inquiryId = res.rows[0].id;
      },
      { role: 'authenticated', sub: INST_USER_ACCOUNT },
      async () => {
        await expect(
          client.query(`UPDATE public.inquiries SET status = 'pending' WHERE id = $1`, [inquiryId])
        ).rejects.toThrow(/Unauthorized/);
      }
    );
  });
});
