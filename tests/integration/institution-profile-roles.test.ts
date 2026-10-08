import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { readFileSync } from 'fs';

/**
 * Institution profile edits are limited to owners and admins (ADR 0023,
 * migration 20261010090000), evaluated as real `authenticated` callers the way
 * PostgREST runs requests. Every test runs in a transaction that is rolled back.
 *
 * Proof of failure is in-suite: the probe restores the previous policy
 * ("any member may update") and shows the very UPDATE the denial tests use then
 * succeeds for a recruiter, so the denial comes from the new policy and not
 * from a bad fixture.
 */

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:49322/postgres';

const ADMIN_ACCOUNT = 'a1000000-0000-0000-0000-000000000001';
const INST_USER_ACCOUNT = 'a1000000-0000-0000-0000-000000000004';
const INST_A = 'e1000000-0000-0000-0000-000000000001';
const INST_B = 'e1000000-0000-0000-0000-000000000002';

describe('Institution profile edit roles — real database roles', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({ connectionString: dbUrl });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  async function asCaller(
    sub: string,
    membershipRole: string | null,
    body: () => Promise<void>,
    setup: () => Promise<void> = async () => {}
  ) {
    await client.query('BEGIN');
    try {
      if (membershipRole) {
        await client.query(
          `INSERT INTO public.institution_users (institution_id, account_id, role) VALUES ($1, $2, $3)
           ON CONFLICT (account_id, institution_id) DO UPDATE SET role = EXCLUDED.role`,
          [INST_A, sub, membershipRole]
        );
      }
      await setup();
      await client.query('SET LOCAL ROLE authenticated');
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ role: 'authenticated', sub }),
      ]);
      await body();
    } finally {
      await client.query('ROLLBACK');
    }
  }

  const updateName = (inst: string, name: string) =>
    client.query(`UPDATE public.institutions SET name = $2 WHERE id = $1`, [inst, name]);

  const visible = async (inst: string) =>
    (await client.query(`SELECT count(*)::int AS n FROM public.institutions WHERE id = $1`, [inst])).rows[0].n;

  for (const role of ['recruiter', 'member']) {
    it(`a ${role} can see the institution but their update matches 0 rows`, async () => {
      await asCaller(INST_USER_ACCOUNT, role, async () => {
        expect(await visible(INST_A)).toBe(1);
        const res = await updateName(INST_A, `Denied by ${role}`);
        expect(res.rowCount).toBe(0);
      });
    });
  }

  for (const role of ['owner', 'admin']) {
    it(`an institution ${role} can update their own institution`, async () => {
      await asCaller(INST_USER_ACCOUNT, role, async () => {
        const res = await updateName(INST_A, `Edited by ${role}`);
        expect(res.rowCount).toBe(1);
        const name = (await client.query(`SELECT name FROM public.institutions WHERE id = $1`, [INST_A])).rows[0].name;
        expect(name).toBe(`Edited by ${role}`);
      });
    });
  }

  it('an owner of one institution cannot update another institution', async () => {
    await asCaller(INST_USER_ACCOUNT, 'owner', async () => {
      const res = await updateName(INST_B, 'Cross-tenant edit');
      expect(res.rowCount).toBe(0);
    });
  });

  it('a platform admin can update any institution', async () => {
    await asCaller(ADMIN_ACCOUNT, null, async () => {
      const res = await updateName(INST_A, 'Edited by platform admin');
      expect(res.rowCount).toBe(1);
    });
  });

  it('is_institution_admin is true only for owner/admin roles', async () => {
    const answers: Record<string, boolean> = {};
    for (const role of ['owner', 'admin', 'recruiter', 'member']) {
      await asCaller(INST_USER_ACCOUNT, role, async () => {
        answers[role] = (await client.query(`SELECT public.is_institution_admin($1) AS ok`, [INST_A])).rows[0].ok;
      });
    }
    expect(answers).toEqual({ owner: true, admin: true, recruiter: false, member: false });
  });

  it('probe: with the previous "any member" policy restored, the recruiter update succeeds', async () => {
    await asCaller(
      INST_USER_ACCOUNT,
      'recruiter',
      async () => {
        const res = await updateName(INST_A, 'Edited by recruiter under old policy');
        expect(res.rowCount).toBe(1);
      },
      async () => {
        await client.query(`DROP POLICY "Institution owner or admin can update institution" ON public.institutions`);
        await client.query(
          `CREATE POLICY "Institution staff or admin can update institution"
             ON public.institutions FOR UPDATE
             USING (public.is_institution_user(id) OR public.is_admin())`
        );
      }
    );
  });

  // Preflight (migration section 0): the test runs the exact text between the
  // PREFLIGHT markers, so it cannot drift from what ships. Rolled back.
  describe('migration preflight', () => {
    const migrationSql = readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/20261010090000_db_followups.sql'),
      'utf8'
    );
    const preflightSql = /-- PREFLIGHT-BEGIN\n([\s\S]*?)\n-- PREFLIGHT-END/.exec(migrationSql)?.[1] ?? '';
    const LOCKOUT_INST = 'e1000000-0000-0000-0000-0000000000a1';
    const MEMBERLESS_INST = 'e1000000-0000-0000-0000-0000000000a2';

    async function insertInstitution(id: string) {
      await client.query(
        `INSERT INTO public.institutions (id, name, slug, institution_type, contact_email)
         VALUES ($1, $2, $3, 'seminary', 'preflight@example.edu')`,
        [id, `Preflight ${id.slice(-2)}`, `preflight-${id.slice(-2)}`]
      );
    }
    async function preflightError(): Promise<string | null> {
      await client.query('SAVEPOINT pf');
      try {
        await client.query(preflightSql);
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : String(err);
      } finally {
        await client.query('ROLLBACK TO SAVEPOINT pf');
      }
    }

    it('extracts a DO block from the migration', () => {
      expect(preflightSql).toMatch(/^DO \$preflight\$/);
      expect(preflightSql).toMatch(/\$preflight\$;$/);
    });

    it('passes for a member-less institution and raises when the only member is a recruiter', async () => {
      await client.query('BEGIN');
      try {
        // Clean baseline: no existing institution may be a lockout.
        await client.query(
          `INSERT INTO public.institution_users (institution_id, account_id, role)
           SELECT i.id, $1, 'owner' FROM public.institutions i
           WHERE EXISTS (SELECT 1 FROM public.institution_users m WHERE m.institution_id = i.id)
             AND NOT EXISTS (SELECT 1 FROM public.institution_users o WHERE o.institution_id = i.id AND o.role IN ('owner','admin'))
           ON CONFLICT (account_id, institution_id) DO UPDATE SET role = 'owner'`,
          [INST_USER_ACCOUNT]
        );
        await insertInstitution(MEMBERLESS_INST);
        expect(await preflightError()).toBeNull();

        await insertInstitution(LOCKOUT_INST);
        await client.query(
          `INSERT INTO public.institution_users (institution_id, account_id, role) VALUES ($1, $2, 'recruiter')`,
          [LOCKOUT_INST, INST_USER_ACCOUNT]
        );
        expect(await preflightError()).toMatch(/Preflight failed: 1 institution/);

        // An admin member resolves the lockout.
        await client.query(`UPDATE public.institution_users SET role = 'admin' WHERE institution_id = $1`, [LOCKOUT_INST]);
        expect(await preflightError()).toBeNull();
      } finally {
        await client.query('ROLLBACK');
      }
    });
  });
});
