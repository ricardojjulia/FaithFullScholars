import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import matrix from './policy-matrix.json';

/**
 * Policy matrix (ADR 0023, Council Review 12 Wildcard proposal 1).
 *
 * `policy-matrix.json` is the declared contract for which columns each persona
 * may write. This suite:
 *   1. fails if any column of a declared table is missing from the declaration
 *      (a new column must be decided, not silently writable) or is stale;
 *   2. for every declared column, attempts the write as a real `authenticated`
 *      caller (PostgREST semantics) inside a rolled-back transaction and fails
 *      if the outcome differs from the declaration.
 */

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:49322/postgres';

const IDS = {
  $ADMIN_ACCOUNT: 'a1000000-0000-0000-0000-000000000001',
  $SCHOLAR_A_ACCOUNT: 'a1000000-0000-0000-0000-000000000002',
  $INST_USER_ACCOUNT: 'a1000000-0000-0000-0000-000000000004',
  $INST_A: 'e1000000-0000-0000-0000-000000000001',
  $INST_B: 'e1000000-0000-0000-0000-000000000002',
  $OTHER_INST: 'e1000000-0000-0000-0000-000000000003',
  $INQUIRY: 'c0000000-0000-0000-0000-0000000001a1',
  $CONTRACT: 'c0000000-0000-0000-0000-0000000001c1',
  $LICENSE: 'c0000000-0000-0000-0000-0000000001b1',
  $ENDORSEMENT: 'c0000000-0000-0000-0000-0000000001e1',
  $CONSORTIUM: 'c0000000-0000-0000-0000-0000000001d1',
  $CONSORTIUM_MEMBER: 'c0000000-0000-0000-0000-0000000001d2',
  $MILESTONE: 'c0000000-0000-0000-0000-0000000001a2',
} as const;

type ColumnDecl = { skip: string } | { writable: boolean; value: string };
type Scenario = {
  table: string;
  persona: 'scholar' | 'institution_owner' | 'institution_recruiter';
  fixture: string;
  row: { column: string; value: string };
  columns: Record<string, ColumnDecl>;
};

const scenarios = (matrix as unknown as { scenarios: Scenario[] }).scenarios;

describe('Policy matrix — declared column-write contract', () => {
  let client: Client;
  const dynamicIds: Record<string, string> = {};

  const fill = (sql: string) =>
    Object.entries({ ...IDS, ...dynamicIds })
      // longest placeholder first so $SCHOLAR_A_ACCOUNT is not clobbered by $SCHOLAR_A
      .sort(([a], [b]) => b.length - a.length)
      .reduce((acc, [key, value]) => acc.split(key).join(value), sql);

  beforeAll(async () => {
    client = new Client({ connectionString: dbUrl });
    await client.connect();
    dynamicIds.$SCHOLAR_A = (
      await client.query(`SELECT id FROM public.scholars WHERE account_id = $1`, [IDS.$SCHOLAR_A_ACCOUNT])
    ).rows[0].id;
    dynamicIds.$OTHER_SCHOLAR = (
      await client.query(`SELECT id FROM public.scholars WHERE id <> $1 LIMIT 1`, [dynamicIds.$SCHOLAR_A])
    ).rows[0].id;
    dynamicIds.$COURSE_A = (
      await client.query(`SELECT id FROM public.courses WHERE scholar_id = $1 LIMIT 1`, [dynamicIds.$SCHOLAR_A])
    ).rows[0].id;
  });

  afterAll(async () => {
    await client.end();
  });

  const personas: Record<Scenario['persona'], { sub: string; setup: () => Promise<void> }> = {
    scholar: { sub: IDS.$SCHOLAR_A_ACCOUNT, setup: async () => {} },
    institution_owner: { sub: IDS.$INST_USER_ACCOUNT, setup: () => membership('owner') },
    institution_recruiter: { sub: IDS.$INST_USER_ACCOUNT, setup: () => membership('recruiter') },
  };

  async function membership(role: string) {
    await client.query(
      `INSERT INTO public.institution_users (institution_id, account_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (account_id, institution_id) DO UPDATE SET role = EXCLUDED.role`,
      [IDS.$INST_A, IDS.$INST_USER_ACCOUNT, role]
    );
  }

  const fixtures: Record<string, () => Promise<void>> = {
    none: async () => {},
    member_of_a: async () => {},
    inquiry: async () => {
      await client.query(
        `INSERT INTO public.inquiries (id, institution_id, scholar_id, sender_account_id, opportunity_type, message, contact_email)
         VALUES ($1, $2, $3, $4, 'adjunct_teaching', 'Policy matrix probe inquiry.', 'dean@wts.edu')`,
        [IDS.$INQUIRY, IDS.$INST_A, dynamicIds.$SCHOLAR_A, IDS.$INST_USER_ACCOUNT]
      );
    },
    subscription: async () => {
      await client.query(`DELETE FROM public.institution_subscriptions WHERE institution_id = $1`, [IDS.$INST_A]);
      await client.query(
        `INSERT INTO public.institution_subscriptions (institution_id, inquiries_used_current_month) VALUES ($1, 2)`,
        [IDS.$INST_A]
      );
    },
    contract_offered: async () => {
      await client.query(
        `INSERT INTO public.institution_contracts
           (id, institution_id, scholar_id, opportunity_type, title, scope_of_work, start_date, total_compensation_amount, status)
         VALUES ($1, $2, $3, 'adjunct_course', 'Matrix contract', 'Teach one course', CURRENT_DATE, 3000, 'offered')`,
        [IDS.$CONTRACT, IDS.$INST_A, dynamicIds.$SCHOLAR_A]
      );
    },
    contract_with_milestone: async () => {
      await fixtures.contract_offered();
      await client.query(
        `INSERT INTO public.contract_milestones (id, contract_id, title, compensation_amount, status)
         VALUES ($1, $2, 'Matrix milestone', 1000, 'pending')`,
        [IDS.$MILESTONE, IDS.$CONTRACT]
      );
    },
    license_requested: async () => {
      await client.query(
        `INSERT INTO public.course_licensing_agreements
           (id, course_id, scholar_id, institution_id, license_type, term_duration, royalty_amount, status, signed_by_institution_at)
         VALUES ($1, $2, $3, $4, 'syllabus_only', '1_semester', 500, 'requested', now())`,
        [IDS.$LICENSE, dynamicIds.$COURSE_A, dynamicIds.$SCHOLAR_A, IDS.$INST_A]
      );
    },
    endorsement: async () => {
      await client.query(
        `INSERT INTO public.institution_endorsements
           (id, institution_id, scholar_id, relationship_type, department_or_field, endorsement_text, is_credential_verified)
         VALUES ($1, $2, $3, 'Current Faculty', 'New Testament', 'Matrix endorsement', false)`,
        [IDS.$ENDORSEMENT, IDS.$INST_A, dynamicIds.$SCHOLAR_A]
      );
    },
    consortium_invite: async () => {
      await client.query(
        `INSERT INTO public.consortiums (id, name, slug, lead_institution_id) VALUES ($1, 'Matrix Consortium', 'matrix-consortium', $2)`,
        [IDS.$CONSORTIUM, IDS.$INST_A]
      );
      await client.query(
        `INSERT INTO public.consortium_members (id, consortium_id, institution_id, role, status) VALUES ($1, $2, $3, 'member', 'pending')`,
        [IDS.$CONSORTIUM_MEMBER, IDS.$CONSORTIUM, IDS.$INST_B]
      );
    },
  };

  it('declares every column of every declared table (no undeclared or stale columns)', async () => {
    const problems: string[] = [];
    const tables = [...new Set(scenarios.map((s) => s.table))];
    for (const table of tables) {
      const actual = (
        await client.query<{ column_name: string }>(
          `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
          [table]
        )
      ).rows.map((r) => r.column_name);
      expect(actual.length, `${table} exists`).toBeGreaterThan(0);
      for (const scenario of scenarios.filter((s) => s.table === table)) {
        const declared = Object.keys(scenario.columns);
        for (const col of actual) {
          if (!declared.includes(col)) problems.push(`${table} (${scenario.persona}): undeclared column "${col}"`);
        }
        for (const col of declared) {
          if (!actual.includes(col)) problems.push(`${table} (${scenario.persona}): stale declaration "${col}"`);
        }
      }
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });

  for (const scenario of scenarios) {
    it(`${scenario.table} as ${scenario.persona}: column writes match the declaration`, async () => {
      const persona = personas[scenario.persona];
      const mismatches: string[] = [];
      let allowedCount = 0;

      for (const [column, decl] of Object.entries(scenario.columns)) {
        if ('skip' in decl) continue;

        await client.query('BEGIN');
        try {
          await persona.setup();
          await fixtures[scenario.fixture]();
          await client.query('SET LOCAL ROLE authenticated');
          await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
            JSON.stringify({ role: 'authenticated', sub: persona.sub }),
          ]);

          const where = fill(`WHERE ${scenario.row.column} = '${scenario.row.value}'`);
          const read = async () =>
            (await client.query(`SELECT ${column}::text AS v FROM public.${scenario.table} ${where}`)).rows[0]?.v ?? null;
          const before = await read();
          const sql = fill(`UPDATE public.${scenario.table} SET ${column} = ${decl.value} ${where}`);
          let outcome: 'allowed' | 'denied';
          try {
            const res = await client.query(sql);
            outcome = res.rowCount && res.rowCount > 0 ? 'allowed' : 'denied';
            if (outcome === 'allowed' && (await read()) === before) {
              mismatches.push(`${column}: probe did not change the value (no-op write) — use a value that differs from the fixture`);
              continue;
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            // Only the guards' explicit refusals and RLS WITH CHECK count as denials;
            // e.g. "permission denied for function" (a broken grant) must not pass as one.
            if (/^Unauthorized:|new row violates row-level security/.test(message)) {
              outcome = 'denied';
            } else {
              mismatches.push(`${column}: probe value is invalid (${message}) — fix the declaration`);
              continue;
            }
          }
          if (outcome === 'allowed') allowedCount += 1;
          const expected = decl.writable ? 'allowed' : 'denied';
          if (outcome !== expected) mismatches.push(`${column}: expected ${expected}, got ${outcome}`);
        } finally {
          await client.query('ROLLBACK');
        }
      }

      expect(mismatches, mismatches.join('\n')).toEqual([]);
      // Guards against a scenario whose row is invisible (every probe "denied" by RLS):
      // if anything is declared writable, at least one write must actually succeed.
      const declaresWritable = Object.values(scenario.columns).some((d) => 'writable' in d && d.writable);
      if (declaresWritable) {
        expect(allowedCount, `${scenario.table} as ${scenario.persona}: no write was allowed at all`).toBeGreaterThan(0);
      }
    });
  }
});
