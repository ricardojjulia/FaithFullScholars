import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

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
});
