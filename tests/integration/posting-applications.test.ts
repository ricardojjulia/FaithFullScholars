import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import {
  APPLICANT_TRANSITIONS,
  APPLICATION_STATUSES,
  MEMBER_TRANSITIONS,
  type ApplicationStatus,
} from '@/lib/postings/application-status';

/**
 * Posting applications (ADR 0027, migration 20261009090000) evaluated as real
 * `anon` / `authenticated` callers, the way PostgREST runs requests: SET LOCAL ROLE
 * plus JWT claims, inside transactions that are rolled back. The two concurrency
 * tests commit under a unique marker and clean up after themselves.
 *
 * Proof of failure is in-suite. Every rule in the guard and in the submit function
 * sits on one line ending `-- check:<name>`. `withoutCheck(fn, name)` re-creates the
 * function WITHOUT that one line, inside the rolled-back transaction, and each probe
 * shows the very statement the refusal test uses then SUCCEEDS. So a refusal comes
 * from that rule and not from a bad fixture. (signed_in is the one exception: with
 * no identity nothing can succeed, so its probe shows the refusal moves on.)
 */

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:49322/postgres';

// Set only by the local single-connection harness; real CI always runs the concurrency tests.
const SINGLE_CONNECTION = process.env.PGLITE_SHIM === '1';

const ADMIN_ACCOUNT = 'a1000000-0000-0000-0000-000000000001';
const SCHOLAR_A_ACCOUNT = 'a1000000-0000-0000-0000-000000000002';
const SCHOLAR_B_ACCOUNT = 'a1000000-0000-0000-0000-000000000003';
const MEMBER_ACCOUNT = 'a1000000-0000-0000-0000-000000000004';
const INST_A = 'e1000000-0000-0000-0000-000000000001';
const INST_B = 'e1000000-0000-0000-0000-000000000002';
const SCHOLAR_A_EMAIL = 'dr.calvin.edwards@faithfullscholars.org';
const MARKER = 'app-concurrency-probe';

const GUARD = 'private.guard_posting_applications()';
const SUBMIT = 'public.submit_posting_application(uuid,text)';

type Caller =
  | { role: 'anon' }
  | { role: 'authenticated'; sub: string }
  | { role: 'authenticated' };
type PgError = { code?: string; message: string };

const asScholarA: Caller = { role: 'authenticated', sub: SCHOLAR_A_ACCOUNT };
const asScholarB: Caller = { role: 'authenticated', sub: SCHOLAR_B_ACCOUNT };
const asMember: Caller = { role: 'authenticated', sub: MEMBER_ACCOUNT };
const asAdmin: Caller = { role: 'authenticated', sub: ADMIN_ACCOUNT };
const asAnon: Caller = { role: 'anon' };
const asNobody: Caller = { role: 'authenticated' };

async function becomeCaller(client: Client, caller: Caller) {
  await client.query(`SET LOCAL ROLE ${caller.role}`);
  await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify(caller)]);
}

describe('Posting applications — real database roles', () => {
  let client: Client;
  let scholarA: string;
  let scholarB: string;

  beforeAll(async () => {
    client = new Client({ connectionString: dbUrl });
    await client.connect();
    scholarA = (await client.query(`SELECT id FROM public.scholars WHERE account_id = $1`, [SCHOLAR_A_ACCOUNT])).rows[0].id;
    scholarB = (await client.query(`SELECT id FROM public.scholars WHERE account_id = $1`, [SCHOLAR_B_ACCOUNT])).rows[0].id;
  });

  afterAll(async () => {
    await client.end();
  });

  async function as(caller: Caller, setup: () => Promise<void>, body: () => Promise<void>) {
    await client.query('BEGIN');
    try {
      await setup();
      await becomeCaller(client, caller);
      await body();
    } finally {
      await client.query('ROLLBACK');
    }
  }
  const nothing = async () => {};

  async function failure(sql: string, params: unknown[] = []): Promise<PgError> {
    await client.query('SAVEPOINT attempt');
    let error: PgError | null = null;
    try {
      await client.query(sql, params);
    } catch (err) {
      error = err as PgError;
    }
    await client.query('ROLLBACK TO SAVEPOINT attempt');
    if (!error) throw new Error(`Expected a failure but the statement succeeded: ${sql}`);
    return error;
  }

  /** Runs a statement as the current role, reports the error (or null) and rolls the statement back. */
  async function attempt(sql: string, params: unknown[] = []): Promise<{ error: PgError | null; rowCount: number | null }> {
    await client.query('SAVEPOINT attempt');
    let error: PgError | null = null;
    let rowCount: number | null = null;
    try {
      rowCount = (await client.query(sql, params)).rowCount;
    } catch (err) {
      error = err as PgError;
    }
    await client.query('ROLLBACK TO SAVEPOINT attempt');
    return { error, rowCount };
  }

  /** Switches to the migration role for a moment (fixtures mid-test), then back. */
  async function asMigrationRole(caller: Caller, run: () => Promise<void>) {
    await client.query('RESET ROLE');
    // A leftover JWT role claim would still make the guards treat this session as an API caller.
    await client.query(`SELECT set_config('request.jwt.claims', '', true)`);
    try {
      await run();
    } finally {
      await becomeCaller(client, caller);
    }
  }

  // ---- fixtures (migration role, before SET LOCAL ROLE) -----------------------
  const uuid = () => (globalThis.crypto as Crypto).randomUUID();

  async function memberOf(inst: string, role = 'owner', account = MEMBER_ACCOUNT) {
    await client.query(
      `INSERT INTO public.institution_users (institution_id, account_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (account_id, institution_id) DO UPDATE SET role = EXCLUDED.role`,
      [inst, account, role]
    );
  }

  async function createPosting(opts: { status?: string; inst?: string } = {}): Promise<string> {
    const id = uuid();
    await client.query(
      `INSERT INTO public.institution_postings (id, institution_id, title, slug, opportunity_type, term, description, status)
       VALUES ($1, $2, $3, $4, 'adjunct', 'Fall 2027', 'Application probe posting.', $5)`,
      [id, opts.inst ?? INST_A, `Probe posting ${id.slice(0, 8)}`, `probe-${id}`, opts.status ?? 'published']
    );
    return id;
  }

  async function seedApplication(opts: { status?: ApplicationStatus; scholar?: string; posting?: string; inst?: string } = {}) {
    const id = uuid();
    const posting = opts.posting ?? (await createPosting());
    await client.query(
      `INSERT INTO public.posting_applications
         (id, posting_id, institution_id, scholar_id, posting_title, institution_name, cover_note, dossier_snapshot, status)
       VALUES ($1, $2, $3, $4, 'Frozen posting title', 'Frozen institution name', 'A cover note for the committee.', '{"snapshot_version":1}'::jsonb, $5)`,
      [id, posting, opts.inst ?? INST_A, opts.scholar ?? scholarA, opts.status ?? 'submitted']
    );
    return { id, posting };
  }

  async function fillRateWindow(scholar: string, count: number, ageHours = 1, withdrawn = false) {
    for (let i = 0; i < count; i++) {
      const posting = await createPosting();
      await client.query(
        `INSERT INTO public.posting_applications
           (posting_id, institution_id, scholar_id, posting_title, institution_name, cover_note, dossier_snapshot, status, created_at)
         VALUES ($1, $2, $3, 't', 'n', 'Pre-filled application.', '{}'::jsonb, $4, now() - make_interval(hours => $5::int))`,
        [posting, INST_A, scholar, withdrawn ? 'withdrawn' : 'submitted', ageHours]
      );
    }
  }

  /** Re-creates a function inside the current transaction WITHOUT the one `-- check:<tag>` line. */
  function withoutCheck(fn: string, tag: string) {
    return async () => {
      const def = (await client.query(`SELECT pg_get_functiondef($1::regprocedure) AS def`, [fn])).rows[0].def as string;
      const lines = def.split('\n');
      const marker = new RegExp(`--\\s*check:${tag}\\s*$`);
      const kept = lines.filter((line) => !marker.test(line));
      expect(lines.length - kept.length, `${fn} has exactly one "-- check:${tag}" line`).toBe(1);
      await client.query(kept.join('\n'));
    };
  }

  const status = async (id: string) =>
    (await client.query(`SELECT status FROM public.posting_applications WHERE id = $1`, [id])).rows[0]?.status as string | undefined;

  const submit = (posting: string, note = 'I would be glad to teach this course.') =>
    client.query(`SELECT public.submit_posting_application($1, $2) AS id`, [posting, note]);

  // ===========================================================================
  // 0. Preflight
  // ===========================================================================
  describe('migration preflight', () => {
    const sql = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/20261009090000_posting_applications.sql'),
      'utf8'
    );
    const block = sql.slice(sql.indexOf('-- PREFLIGHT-BEGIN'), sql.indexOf('-- PREFLIGHT-END'));

    it('passes on a database that has the ADR 0022 to 0026 dependencies', async () => {
      expect(block).toContain('preflight_failed');
      await as(asScholarA, nothing, async () => {
        await client.query('RESET ROLE');
        await client.query(block);
      });
    });

    it.each([
      ['a missing helper', `ALTER FUNCTION private.is_restricted_caller() RENAME TO is_restricted_caller_gone`, 'private.is_restricted_caller()'],
      ['a missing trigger', `DROP TRIGGER trg_guard_published_children ON public.credentials`, 'trg_guard_published_children'],
      ['a missing set_updated_at', `ALTER FUNCTION public.set_updated_at() RENAME TO set_updated_at_gone`, 'public.set_updated_at()'],
    ])('refuses with preflight_failed naming %s, and changes nothing', async (_label, breakIt, named) => {
      await client.query('BEGIN');
      try {
        await client.query(breakIt);
        const err = await failure(block);
        expect(err.message).toContain('preflight_failed');
        expect(err.message).toContain(named);
        expect((await client.query(`SELECT to_regclass('public.posting_applications') AS t`)).rows[0].t).not.toBeNull();
      } finally {
        await client.query('ROLLBACK');
      }
    });
  });

  // ===========================================================================
  // 1. Grants, RLS, function hygiene
  // ===========================================================================
  describe('grants and function hygiene', () => {
    const tables = ['posting_applications', 'posting_application_notes', 'posting_application_events'];

    it('forces row level security on all three tables', async () => {
      const rows = (
        await client.query(
          `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
           WHERE relnamespace = 'public'::regnamespace AND relname = ANY($1)`,
          [tables]
        )
      ).rows;
      expect(rows.map((r) => r.relname).sort()).toEqual([...tables].sort());
      for (const row of rows) {
        expect(row.relrowsecurity, row.relname).toBe(true);
        expect(row.relforcerowsecurity, row.relname).toBe(true);
      }
    });

    it('gives authenticated exactly the intended privileges and anon none', async () => {
      const priv = async (role: string, table: string, p: string) =>
        (await client.query(`SELECT has_table_privilege($1, $2, $3) AS ok`, [role, `public.${table}`, p])).rows[0].ok as boolean;

      const expected: Record<string, string[]> = {
        posting_applications: ['SELECT', 'UPDATE'],
        posting_application_notes: ['SELECT', 'INSERT', 'UPDATE'],
        posting_application_events: ['SELECT'],
      };
      for (const [table, allowed] of Object.entries(expected)) {
        for (const p of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) {
          expect(await priv('authenticated', table, p), `authenticated ${p} on ${table}`).toBe(allowed.includes(p));
          expect(await priv('anon', table, p), `anon ${p} on ${table}`).toBe(false);
        }
      }
    });

    it('lets only authenticated execute the two public functions', async () => {
      const can = async (role: string, fn: string) =>
        (await client.query(`SELECT has_function_privilege($1, $2::regprocedure, 'EXECUTE') AS ok`, [role, fn])).rows[0].ok as boolean;
      for (const fn of [SUBMIT, 'public.get_application_contact(uuid)']) {
        expect(await can('authenticated', fn), fn).toBe(true);
        expect(await can('anon', fn), fn).toBe(false);
        expect(await can('service_role', fn), fn).toBe(false);
      }
    });

    it('pins search_path on every function, with the right security mode', async () => {
      const expected: Record<string, { schema: string; definer: boolean }> = {
        guard_posting_applications: { schema: 'private', definer: false },
        guard_posting_application_notes: { schema: 'private', definer: false },
        log_posting_application_event: { schema: 'private', definer: true },
        is_application_applicant: { schema: 'private', definer: true },
        submit_posting_application: { schema: 'public', definer: true },
        get_application_contact: { schema: 'public', definer: true },
      };
      const rows = (
        await client.query(
          `SELECT p.proname, n.nspname, p.prosecdef, p.proconfig
           FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE p.proname = ANY($1)`,
          [Object.keys(expected)]
        )
      ).rows;
      expect(rows.map((r) => r.proname).sort()).toEqual(Object.keys(expected).sort());
      for (const row of rows) {
        expect(row.nspname, row.proname).toBe(expected[row.proname].schema);
        expect(row.prosecdef, `${row.proname} security definer`).toBe(expected[row.proname].definer);
        expect((row.proconfig as string[] | null) ?? [], `${row.proname} search_path`).toContainEqual(expect.stringMatching(/^search_path=("")?$/));
      }
    });

    it('refuses anon on every table and function (42501)', async () => {
      await as(asAnon, nothing, async () => {
        for (const table of tables) {
          expect((await failure(`SELECT * FROM public.${table}`)).code, table).toBe('42501');
        }
        expect((await failure(`SELECT public.submit_posting_application($1, 'a valid note')`, [uuid()])).code).toBe('42501');
        expect((await failure(`SELECT public.get_application_contact($1)`, [uuid()])).code).toBe('42501');
      });
    });

    it('refuses DELETE on all three tables, even for a member (42501)', async () => {
      await as(asMember, async () => { await memberOf(INST_A); await seedApplication(); }, async () => {
        for (const table of tables) {
          expect((await failure(`DELETE FROM public.${table}`)).code, table).toBe('42501');
        }
      });
    });
  });

  // ===========================================================================
  // 2. submit_posting_application
  // ===========================================================================
  describe('submit_posting_application', () => {
    it('seals an application for the caller, with the institution and frozen names taken from the posting', async () => {
      let posting = '';
      await as(
        asScholarA,
        async () => { posting = await createPosting(); },
        async () => {
          const id = (await submit(posting, '   I would be glad to teach this course.   ')).rows[0].id;
          const row = (await client.query(`SELECT * FROM public.posting_applications WHERE id = $1`, [id])).rows[0];
          expect(row.status).toBe('submitted');
          expect(row.scholar_id).toBe(scholarA);
          expect(row.posting_id).toBe(posting);
          expect(row.institution_id).toBe(INST_A);
          expect(row.cover_note).toBe('I would be glad to teach this course.');
          expect(row.posting_title).toContain('Probe posting');
          expect(row.institution_name).toBe('Westminster Theological Seminary');
          expect(new Date(row.status_changed_at).getTime()).toBe(new Date(row.created_at).getTime());
        }
      );
    });

    it('seals a dossier from the reviewed published rows with no email, contact preference or file path', async () => {
      let posting = '';
      await as(
        asScholarA,
        async () => { posting = await createPosting(); },
        async () => {
          const id = (await submit(posting)).rows[0].id;
          const snap = (await client.query(`SELECT dossier_snapshot AS s FROM public.posting_applications WHERE id = $1`, [id])).rows[0].s;

          expect(snap.snapshot_version).toBe(1);
          expect(new Date(snap.sealed_at).getTime()).toBeGreaterThan(Date.now() - 60_000);
          expect(snap.scholar_slug).toBe('calvin-edwards');
          expect(snap.published_revision_id).toBeTruthy();
          expect(snap.full_name).toBe('Dr. Calvin Edwards');
          expect(snap.title).toBeTruthy();
          expect(snap.doctrinal_statement_text).toContain('Westminster Confession');
          expect(snap.credentials.length).toBeGreaterThan(0);
          expect(snap.credentials[0]).toEqual(
            expect.objectContaining({ degree: expect.any(String), field_of_study: expect.any(String), institution_name: expect.any(String) })
          );
          expect(snap.confessions.length).toBeGreaterThan(0);
          expect(snap.confessions[0]).toEqual(expect.objectContaining({ name: expect.any(String), slug: expect.any(String), adherence_level: expect.any(String) }));
          expect(snap.disciplines.length).toBeGreaterThan(0);
          expect(snap.disciplines[0]).toEqual(expect.objectContaining({ name: expect.any(String), slug: expect.any(String) }));
          expect(snap.traditions.length).toBeGreaterThan(0);
          expect(Array.isArray(snap.publications)).toBe(true);

          for (const forbidden of ['email', 'contact_preference', 'profile_photo_path', 'doctrinal_statement_path', 'account_id', 'password']) {
            expect(Object.keys(snap), forbidden).not.toContain(forbidden);
          }
          const text = JSON.stringify(snap);
          expect(text).not.toContain(SCHOLAR_A_EMAIL);
          expect(text).not.toContain(SCHOLAR_A_ACCOUNT);
        }
      );
    });

    it('keeps the sealed dossier unchanged when the live profile changes afterwards', async () => {
      let posting = '';
      await as(
        asScholarA,
        async () => { posting = await createPosting(); },
        async () => {
          const id = (await submit(posting)).rows[0].id;
          const read = async () => (await client.query(`SELECT dossier_snapshot AS s FROM public.posting_applications WHERE id = $1`, [id])).rows[0].s;
          const before = await read();

          await asMigrationRole(asScholarA, async () => {
            await client.query(`UPDATE public.scholars SET biography = 'Rewritten after applying', full_name = 'Renamed Scholar' WHERE id = $1`, [scholarA]);
            await client.query(`DELETE FROM public.credentials WHERE scholar_id = $1`, [scholarA]);
            await client.query(`DELETE FROM public.scholar_confessions WHERE scholar_id = $1`, [scholarA]);
          });

          expect(await read()).toEqual(before);
          expect(before.full_name).toBe('Dr. Calvin Edwards');
        }
      );
    });

    describe('refusals, each proven by removing exactly one rule', () => {
      it('signed_in: no session gives 28000; without the rule the refusal moves on to the next check', async () => {
        let posting = '';
        await as(asNobody, async () => { posting = await createPosting(); }, async () => {
          expect((await failure(`SELECT public.submit_posting_application($1, 'a valid note')`, [posting])).code).toBe('28000');
        });
        await as(asNobody, async () => { posting = await createPosting(); await withoutCheck(SUBMIT, 'signed_in')(); }, async () => {
          const err = await failure(`SELECT public.submit_posting_application($1, 'a valid note')`, [posting]);
          expect(err.code).not.toBe('28000');
          expect(err.code).toBe('42501'); // falls through to the approved-scholar rule
        });
      });

      it('approved: an unapproved scholar and a non-scholar get 42501', async () => {
        let posting = '';
        const draftB = async () => {
          posting = await createPosting();
          await client.query(`UPDATE public.scholars SET profile_status = 'draft' WHERE id = $1`, [scholarB]);
        };
        await as(asScholarB, draftB, async () => {
          expect((await failure(`SELECT public.submit_posting_application($1, 'a valid note')`, [posting])).code).toBe('42501');
        });
        await as(asMember, async () => { posting = await createPosting(); }, async () => {
          expect((await failure(`SELECT public.submit_posting_application($1, 'a valid note')`, [posting])).code).toBe('42501');
        });
        await as(
          asScholarB,
          async () => { await draftB(); await withoutCheck(SUBMIT, 'approved')(); },
          async () => {
            const res = await submit(posting);
            expect(res.rows[0].id).toBeTruthy();
          }
        );
      });

      it('note: shorter than 5 or longer than 4000 after trimming gets 22023; 5 and 4000 are accepted', async () => {
        let posting = '';
        await as(asScholarA, async () => { posting = await createPosting(); }, async () => {
          for (const bad of ['', '    ', 'abcd', '   abcd   ', '\t\n\r abcd \f', 'x'.repeat(4001)]) {
            expect((await failure(`SELECT public.submit_posting_application($1, $2)`, [posting, bad])).code, JSON.stringify(bad.slice(0, 12))).toBe('22023');
          }
          expect((await failure(`SELECT public.submit_posting_application($1, NULL)`, [posting])).code).toBe('22023');
          expect((await submit(posting, '  abcde  ')).rows[0].id).toBeTruthy();
        });
        await as(asScholarA, async () => { posting = await createPosting(); }, async () => {
          expect((await submit(posting, 'x'.repeat(4000))).rows[0].id).toBeTruthy();
        });
        // The table CHECK is a second wall; drop it too so the probe shows the function rule itself.
        await as(
          asScholarA,
          async () => {
            posting = await createPosting();
            await client.query(`ALTER TABLE public.posting_applications DROP CONSTRAINT posting_applications_cover_note_len`);
            await withoutCheck(SUBMIT, 'note')();
          },
          async () => {
            expect((await submit(posting, 'abc')).rows[0].id).toBeTruthy();
          }
        );
      });

      it('published: unpublished, archived, missing and unapproved-institution postings all give the same P0002', async () => {
        const ids: string[] = [];
        let pending = '';
        await as(
          asScholarA,
          async () => {
            ids.push(await createPosting({ status: 'draft' }), await createPosting({ status: 'archived' }), await createPosting({ status: 'filled' }), uuid());
            pending = await createPosting();
            await client.query(`UPDATE public.institutions SET status = 'pending' WHERE id = $1`, [INST_A]);
          },
          async () => {
            const messages = new Set<string>();
            for (const id of [...ids, pending]) {
              const err = await failure(`SELECT public.submit_posting_application($1, 'a valid note')`, [id]);
              expect(err.code, id).toBe('P0002');
              messages.add(err.message);
            }
            expect(messages.size, 'existence is not revealed: one message for every case').toBe(1);
          }
        );
        let draft = '';
        await as(
          asScholarA,
          async () => { draft = await createPosting({ status: 'draft' }); await withoutCheck(SUBMIT, 'published')(); },
          async () => {
            expect((await submit(draft)).rows[0].id).toBeTruthy();
          }
        );
      });

      it('duplicate: a second application, even after withdrawing, gets 23505', async () => {
        let posting = '';
        await as(asScholarA, async () => { posting = await createPosting(); }, async () => {
          const id = (await submit(posting)).rows[0].id;
          expect((await failure(`SELECT public.submit_posting_application($1, 'a valid note')`, [posting])).code).toBe('23505');
          await client.query(`UPDATE public.posting_applications SET status = 'withdrawn' WHERE id = $1`, [id]);
          expect((await failure(`SELECT public.submit_posting_application($1, 'a valid note')`, [posting])).code).toBe('23505');
        });
        // The unique constraint is a second wall; drop it too so the probe shows the function rule itself.
        await as(
          asScholarA,
          async () => {
            posting = await createPosting();
            await client.query(`ALTER TABLE public.posting_applications DROP CONSTRAINT posting_applications_one_per_posting`);
            await withoutCheck(SUBMIT, 'duplicate')();
          },
          async () => {
            await submit(posting);
            expect((await submit(posting)).rows[0].id).toBeTruthy();
          }
        );
      });

      it('rate: the 21st application in 24 hours gets FS429, withdrawn ones count, older ones do not', async () => {
        let posting = '';
        await as(asScholarA, async () => { posting = await createPosting(); await fillRateWindow(scholarA, 20, 23); }, async () => {
          expect((await failure(`SELECT public.submit_posting_application($1, 'a valid note')`, [posting])).code).toBe('FS429');
        });
        await as(asScholarA, async () => { posting = await createPosting(); await fillRateWindow(scholarA, 20, 2, true); }, async () => {
          expect((await failure(`SELECT public.submit_posting_application($1, 'a valid note')`, [posting])).code).toBe('FS429');
        });
        await as(asScholarA, async () => { posting = await createPosting(); await fillRateWindow(scholarA, 19, 23); }, async () => {
          expect((await submit(posting)).rows[0].id).toBeTruthy();
          expect((await failure(`SELECT public.submit_posting_application($1, 'a valid note')`, [await createPostingAsRole()])).code).toBe('FS429');
        });
        await as(asScholarA, async () => { posting = await createPosting(); await fillRateWindow(scholarA, 20, 25); }, async () => {
          expect((await submit(posting)).rows[0].id).toBeTruthy();
        });
        await as(
          asScholarA,
          async () => { posting = await createPosting(); await fillRateWindow(scholarA, 20, 1); await withoutCheck(SUBMIT, 'rate')(); },
          async () => {
            expect((await submit(posting)).rows[0].id).toBeTruthy();
          }
        );
      });

      /** A posting for a statement that must run as the current (restricted) role: created as the migration role. */
      async function createPostingAsRole(): Promise<string> {
        let id = '';
        await asMigrationRole(asScholarA, async () => { id = await createPosting(); });
        return id;
      }
    });

    it('counts only the caller\'s own applications', async () => {
      let posting = '';
      await as(asScholarB, async () => { posting = await createPosting(); await fillRateWindow(scholarA, 20, 1); }, async () => {
        expect((await submit(posting)).rows[0].id).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // 3. The guard
  // ===========================================================================
  describe('guard: direct writes', () => {
    const forgedInsert = (posting: string, scholar: string, inst = INST_A) =>
      client.query(
        `INSERT INTO public.posting_applications
           (posting_id, institution_id, scholar_id, posting_title, institution_name, cover_note, dossier_snapshot, status)
         VALUES ($1, $2, $3, 't', 'n', 'A forged application.', '{"forged":true}'::jsonb, 'interview_scheduled')`,
        [posting, inst, scholar]
      );

    it('refuses a direct INSERT from authenticated for self, for another scholar, and with a forged status or snapshot (no grant: 42501)', async () => {
      let posting = '';
      await as(asScholarA, async () => { posting = await createPosting(); }, async () => {
        for (const scholar of [scholarA, scholarB]) {
          const err = await failure(
            `INSERT INTO public.posting_applications
               (posting_id, institution_id, scholar_id, posting_title, institution_name, cover_note, dossier_snapshot, status)
             VALUES ($1, $2, $3, 't', 'n', 'A forged application.', '{"forged":true}'::jsonb, 'interview_scheduled')`,
            [posting, INST_A, scholar]
          );
          expect(err.code).toBe('42501');
        }
      });
    });

    it('direct_insert: with an INSERT grant and policy added, the guard itself still refuses (and only the guard)', async () => {
      let posting = '';
      const open = async () => {
        posting = await createPosting();
        await client.query(`GRANT INSERT ON public.posting_applications TO authenticated`);
        await client.query(
          `CREATE POLICY probe_insert ON public.posting_applications FOR INSERT TO authenticated WITH CHECK (true)`
        );
      };
      await as(asScholarA, open, async () => {
        const err = await failure(
          `INSERT INTO public.posting_applications
             (posting_id, institution_id, scholar_id, posting_title, institution_name, cover_note, dossier_snapshot)
           VALUES ($1, $2, $3, 't', 'n', 'A forged application.', '{}'::jsonb)`,
          [posting, INST_A, scholarA]
        );
        expect(err.code).toBe('42501');
        expect(err.message).toMatch(/^Unauthorized:/);
      });
      await as(asScholarA, async () => { await open(); await withoutCheck(GUARD, 'direct_insert')(); }, async () => {
        const res = await forgedInsert(posting, scholarA);
        expect(res.rowCount).toBe(1);
      });
    });

    it('the submit function still inserts (the guard sees its definer owner, not the caller)', async () => {
      let posting = '';
      await as(asScholarA, async () => { posting = await createPosting(); }, async () => {
        expect((await submit(posting)).rows[0].id).toBeTruthy();
      });
    });
  });

  describe('guard: frozen content', () => {
    const frozenColumns: [string, string][] = [
      ['cover_note', `'A rewritten cover note.'`],
      ['dossier_snapshot', `'{"rewritten":true}'::jsonb`],
      ['posting_title', `'Renamed posting'`],
      ['institution_name', `'Renamed institution'`],
      ['posting_id', `'${'12345678-1234-4234-8234-123456789012'}'`],
      ['institution_id', `'${INST_B}'`],
      ['scholar_id', `'SCHOLAR_B'`],
      ['created_at', `now() - interval '40 days'`],
      ['id', `'12345678-1234-4234-8234-123456789013'`],
    ];

    it.each([['applicant', asScholarA], ['member', asMember]] as [string, Caller][])(
      'refuses changing any sealed column as the %s (42501, "sealed")',
      async (_who, caller) => {
        await as(caller, async () => { await memberOf(INST_A); await seedApplication(); }, async () => {
          for (const [column, value] of frozenColumns) {
            const sql = `UPDATE public.posting_applications SET ${column} = ${value.replace('SCHOLAR_B', scholarB)}`;
            const err = await failure(sql);
            expect(err.code, column).toBe('42501');
            expect(err.message, column).toMatch(/^Unauthorized: application content is sealed/);
          }
        });
      }
    );

    it('ignores a client-supplied status_changed_at when the status does not change', async () => {
      await as(asScholarA, async () => { await seedApplication(); }, async () => {
        const before = (await client.query(`SELECT status_changed_at AS at FROM public.posting_applications`)).rows[0].at;
        const res = await client.query(`UPDATE public.posting_applications SET status_changed_at = now() + interval '5 days'`);
        expect(res.rowCount).toBe(1);
        const after = (await client.query(`SELECT status_changed_at AS at FROM public.posting_applications`)).rows[0].at;
        expect(new Date(after).getTime()).toBe(new Date(before).getTime());
      });
    });

    it('stamps status_changed_at itself on a real status change, ignoring a forged value', async () => {
      await as(asMember, async () => { await memberOf(INST_A); await seedApplication(); }, async () => {
        const before = (await client.query(`SELECT status_changed_at AS at FROM public.posting_applications`)).rows[0].at;
        await client.query(`UPDATE public.posting_applications SET status = 'under_review', status_changed_at = '2001-01-01'`);
        const after = (await client.query(`SELECT status_changed_at AS at FROM public.posting_applications`)).rows[0].at;
        expect(new Date(after).getTime()).toBeGreaterThan(new Date(before).getTime());
        expect(new Date(after).getFullYear()).toBeGreaterThan(2020);
      });
    });

    it('frozen: without the rule the same statements succeed, so the refusal is the allow-list', async () => {
      for (const caller of [asScholarA, asMember]) {
        await as(
          caller,
          async () => { await memberOf(INST_A); await seedApplication(); await withoutCheck(GUARD, 'frozen')(); },
          async () => {
            const res = await client.query(`UPDATE public.posting_applications SET cover_note = 'A rewritten cover note.'`);
            expect(res.rowCount).toBe(1);
            expect((await client.query(`SELECT cover_note FROM public.posting_applications`)).rows[0].cover_note).toBe('A rewritten cover note.');
          }
        );
      }
    });
  });

  describe('guard: status transitions', () => {
    const setStatus = (to: string) => `UPDATE public.posting_applications SET status = '${to}'`;

    it('sweep: every from/to pair behaves exactly as the lib/postings/application-status.ts maps say', async () => {
      const mismatches: string[] = [];
      const personas: [string, Caller, Readonly<Record<ApplicationStatus, readonly ApplicationStatus[]>>][] = [
        ['member', asMember, MEMBER_TRANSITIONS],
        ['applicant', asScholarA, APPLICANT_TRANSITIONS],
      ];
      for (const [name, caller, map] of personas) {
        for (const from of APPLICATION_STATUSES) {
          for (const to of APPLICATION_STATUSES) {
            const expectAllowed = from === to || map[from].includes(to);
            await as(caller, async () => { await memberOf(INST_A); await seedApplication({ status: from }); }, async () => {
              const { error, rowCount } = await attempt(setStatus(to));
              const allowed = error === null && rowCount === 1;
              if (allowed !== expectAllowed) {
                mismatches.push(`${name}: ${from} -> ${to} expected ${expectAllowed ? 'allowed' : 'refused'}, got ${allowed ? 'allowed' : `refused (${error?.code})`}`);
              }
              if (!allowed && error && !/^Unauthorized:/.test(error.message)) {
                mismatches.push(`${name}: ${from} -> ${to} refused for the wrong reason (${error.code})`);
              }
            });
          }
        }
      }
      expect(mismatches, mismatches.join('\n')).toEqual([]);
    });

    it('records the move, stamps status_changed_at, and leaves a same-status update untouched', async () => {
      await as(asMember, async () => { await memberOf(INST_A); await seedApplication(); }, async () => {
        const at = async () => new Date((await client.query(`SELECT status_changed_at AS at FROM public.posting_applications`)).rows[0].at).getTime();
        const t0 = await at();
        await client.query(setStatus('submitted'));
        expect(await at()).toBe(t0);
        await client.query(setStatus('under_review'));
        expect(await at()).toBeGreaterThan(t0);
      });
    });

    it('treats a person who is both applicant and member as the applicant', async () => {
      await as(asScholarA, async () => { await memberOf(INST_A, 'owner', SCHOLAR_A_ACCOUNT); await seedApplication(); }, async () => {
        const forward = await failure(setStatus('under_review'));
        expect(forward.code).toBe('42501');
        expect(forward.message).toMatch(/applicants can only withdraw/);
        expect((await client.query(setStatus('withdrawn'))).rowCount).toBe(1);
      });
    });

    it('no_exit_terminal: the applicant cannot leave declined; without the rule the same move succeeds', async () => {
      const setup = async () => { await seedApplication({ status: 'declined' }); };
      await as(asScholarA, setup, async () => {
        const err = await failure(setStatus('withdrawn'));
        expect(err.message).toMatch(/withdrawn or declined/);
      });
      await as(asScholarA, async () => { await setup(); await withoutCheck(GUARD, 'no_exit_terminal')(); }, async () => {
        expect((await client.query(setStatus('withdrawn'))).rowCount).toBe(1);
        expect(await status((await client.query(`SELECT id FROM public.posting_applications`)).rows[0].id)).toBe('withdrawn');
      });
    });

    it('scholar_only_withdraw: the applicant cannot move their own application forward; without the rule they can', async () => {
      await as(asScholarA, async () => { await seedApplication(); }, async () => {
        for (const to of ['under_review', 'interview_scheduled', 'declined']) {
          expect((await failure(setStatus(to))).message, to).toMatch(/applicants can only withdraw/);
        }
      });
      await as(asScholarA, async () => { await seedApplication(); await withoutCheck(GUARD, 'scholar_only_withdraw')(); }, async () => {
        expect((await client.query(setStatus('interview_scheduled'))).rowCount).toBe(1);
      });
    });

    it('no_member_withdraw: a member cannot withdraw for the applicant; without the rule they can', async () => {
      await as(asMember, async () => { await memberOf(INST_A); await seedApplication({ status: 'under_review' }); }, async () => {
        expect((await failure(setStatus('withdrawn'))).message).toMatch(/only the applicant can withdraw/);
      });
      await as(
        asMember,
        async () => { await memberOf(INST_A); await seedApplication({ status: 'under_review' }); await withoutCheck(GUARD, 'no_member_withdraw')(); },
        async () => {
          expect((await client.query(setStatus('withdrawn'))).rowCount).toBe(1);
        }
      );
    });

    it('member_forward_only: a member cannot skip or go backwards; without the rule they can', async () => {
      await as(asMember, async () => { await memberOf(INST_A); await seedApplication(); }, async () => {
        for (const to of ['interview_scheduled', 'declined']) {
          expect((await failure(setStatus(to))).message, to).toMatch(/invalid application status transition/);
        }
      });
      await as(
        asMember,
        async () => { await memberOf(INST_A); await seedApplication({ status: 'interview_scheduled' }); },
        async () => {
          expect((await failure(setStatus('under_review'))).message).toMatch(/invalid application status transition/);
          expect((await failure(setStatus('submitted'))).message).toMatch(/invalid application status transition/);
        }
      );
      await as(
        asMember,
        async () => { await memberOf(INST_A); await seedApplication(); await withoutCheck(GUARD, 'member_forward_only')(); },
        async () => {
          expect((await client.query(setStatus('interview_scheduled'))).rowCount).toBe(1);
        }
      );
    });

    it('lets the service role and direct database sessions maintain rows (the guard only restricts API callers)', async () => {
      await as({ role: 'authenticated', sub: ADMIN_ACCOUNT }, async () => { await seedApplication(); }, async () => {
        await client.query('RESET ROLE');
        expect((await client.query(setStatus('declined'))).rowCount).toBe(1);
        expect((await client.query(setStatus('withdrawn'))).rowCount).toBe(1);
      });
    });
  });

  // ===========================================================================
  // 4. Visibility
  // ===========================================================================
  describe('who can read and who can touch an application', () => {
    const count = async () => Number((await client.query(`SELECT count(*)::int AS n FROM public.posting_applications`)).rows[0].n);
    const fixture = async () => { await memberOf(INST_B, 'owner', MEMBER_ACCOUNT); await seedApplication(); };

    it('shows it to the applicant, to members of the posting institution and to admins', async () => {
      for (const caller of [asScholarA, asAdmin]) {
        await as(caller, fixture, async () => { expect(await count(), JSON.stringify(caller)).toBe(1); });
      }
      await as(asMember, async () => { await memberOf(INST_A); await seedApplication(); }, async () => {
        expect(await count()).toBe(1);
      });
    });

    it('hides it from other scholars, members of other institutions, and anon', async () => {
      await as(asScholarB, async () => { await seedApplication(); }, async () => { expect(await count()).toBe(0); });
      await as(asMember, fixture, async () => { expect(await count()).toBe(0); });
      await as(asAnon, nothing, async () => {
        expect((await failure(`SELECT 1 FROM public.posting_applications`)).code).toBe('42501');
      });
    });

    it('cannot be updated by a non-party or an admin (0 rows, nothing changes)', async () => {
      for (const [caller, setup] of [
        [asScholarB, async () => { await seedApplication(); }],
        [asMember, fixture],
        [asAdmin, async () => { await seedApplication(); }],
      ] as [Caller, () => Promise<void>][]) {
        await as(caller, setup, async () => {
          const res = await client.query(`UPDATE public.posting_applications SET status = 'withdrawn'`);
          expect(res.rowCount, JSON.stringify(caller)).toBe(0);
        });
      }
    });
  });

  // ===========================================================================
  // 5. Notes
  // ===========================================================================
  describe('private notes', () => {
    const noteFixture = async () => {
      await memberOf(INST_A);
      return seedApplication();
    };

    it('lets a member write one note per application, deriving the institution and author', async () => {
      let app = { id: '', posting: '' };
      await as(asMember, async () => { app = await noteFixture(); }, async () => {
        const first = await client.query(
          `INSERT INTO public.posting_application_notes (application_id, institution_id, body, updated_by)
           VALUES ($1, $2, 'First impression', $3) RETURNING institution_id, updated_by`,
          [app.id, INST_B, scholarB]
        );
        expect(first.rows[0].institution_id).toBe(INST_A);
        expect(first.rows[0].updated_by).toBe(MEMBER_ACCOUNT);

        // The API's upsert (PostgREST ON CONFLICT application_id).
        const second = await client.query(
          `INSERT INTO public.posting_application_notes (application_id, body) VALUES ($1, 'Revised view')
           ON CONFLICT (application_id) DO UPDATE SET body = EXCLUDED.body RETURNING body, updated_by`,
          [app.id]
        );
        expect(second.rows[0]).toEqual({ body: 'Revised view', updated_by: MEMBER_ACCOUNT });
        expect((await client.query(`SELECT count(*)::int AS n FROM public.posting_application_notes`)).rows[0].n).toBe(1);
      });
    });

    it('hides notes from the applicant, refuses their writes, and hides them from other institutions', async () => {
      let app = { id: '', posting: '' };
      await as(
        asScholarA,
        async () => {
          app = await noteFixture();
          await client.query(`INSERT INTO public.posting_application_notes (application_id, institution_id, body) VALUES ($1, $2, 'Private to the committee')`, [app.id, INST_A]);
        },
        async () => {
          expect((await client.query(`SELECT count(*)::int AS n FROM public.posting_application_notes`)).rows[0].n).toBe(0);
          expect((await failure(`INSERT INTO public.posting_application_notes (application_id, body) VALUES ($1, 'x')`, [app.id])).code).toBe('42501');
          const upd = await client.query(`UPDATE public.posting_application_notes SET body = 'tampered'`);
          expect(upd.rowCount).toBe(0);
        }
      );
      await as(
        asScholarB,
        async () => {
          app = await noteFixture();
          await client.query(`INSERT INTO public.posting_application_notes (application_id, institution_id, body) VALUES ($1, $2, 'Private to the committee')`, [app.id, INST_A]);
        },
        async () => {
          expect((await client.query(`SELECT count(*)::int AS n FROM public.posting_application_notes`)).rows[0].n).toBe(0);
        }
      );
    });

    it('treats an applicant who is also a member as the applicant: no read, no write', async () => {
      let app = { id: '', posting: '' };
      await as(
        asScholarA,
        async () => {
          await memberOf(INST_A, 'owner', SCHOLAR_A_ACCOUNT);
          app = await seedApplication();
          await client.query(`INSERT INTO public.posting_application_notes (application_id, institution_id, body) VALUES ($1, $2, 'Private')`, [app.id, INST_A]);
        },
        async () => {
          expect((await client.query(`SELECT count(*)::int AS n FROM public.posting_application_notes`)).rows[0].n).toBe(0);
          expect((await failure(`INSERT INTO public.posting_application_notes (application_id, body) VALUES ($1, 'x')`, [app.id])).code).toBe('42501');
        }
      );
    });

    it('probe: without the "not the applicant" clause the applicant-member could read the note', async () => {
      await as(
        asScholarA,
        async () => {
          await memberOf(INST_A, 'owner', SCHOLAR_A_ACCOUNT);
          const app = await seedApplication();
          await client.query(`INSERT INTO public.posting_application_notes (application_id, institution_id, body) VALUES ($1, $2, 'Private')`, [app.id, INST_A]);
          await client.query(
            `ALTER POLICY "Members read application notes" ON public.posting_application_notes USING (private.is_institution_user(institution_id))`
          );
        },
        async () => {
          expect((await client.query(`SELECT count(*)::int AS n FROM public.posting_application_notes`)).rows[0].n).toBe(1);
        }
      );
    });

    it('refuses a member of another institution (application not found) and anon', async () => {
      let app = { id: '', posting: '' };
      await as(asMember, async () => { await memberOf(INST_B); app = await seedApplication(); }, async () => {
        const err = await failure(`INSERT INTO public.posting_application_notes (application_id, body) VALUES ($1, 'x')`, [app.id]);
        expect(err.code).toBe('42501');
        expect(err.message).toMatch(/application not found/);
      });
      await as(asAnon, nothing, async () => {
        expect((await failure(`SELECT 1 FROM public.posting_application_notes`)).code).toBe('42501');
      });
    });

    it('lets admins read but not write', async () => {
      let app = { id: '', posting: '' };
      await as(
        asAdmin,
        async () => {
          app = await seedApplication();
          await client.query(`INSERT INTO public.posting_application_notes (application_id, institution_id, body) VALUES ($1, $2, 'Committee view')`, [app.id, INST_A]);
        },
        async () => {
          expect((await client.query(`SELECT count(*)::int AS n FROM public.posting_application_notes`)).rows[0].n).toBe(1);
          expect((await client.query(`UPDATE public.posting_application_notes SET body = 'admin edit'`)).rowCount).toBe(0);
          expect((await failure(`INSERT INTO public.posting_application_notes (application_id, body) VALUES ($1, 'x')`, [uuid()])).code).toBe('42501');
        }
      );
    });

    it('makes the key columns immutable and caps the body at 4000 characters', async () => {
      let app = { id: '', posting: '' };
      await as(asMember, async () => { app = await noteFixture(); await client.query(`INSERT INTO public.posting_application_notes (application_id, institution_id, body) VALUES ($1, $2, 'n')`, [app.id, INST_A]); }, async () => {
        for (const set of [
          `application_id = '${uuid()}'`,
          `institution_id = '${INST_B}'`,
          `id = '${uuid()}'`,
          `created_at = now() - interval '9 days'`,
        ]) {
          const err = await failure(`UPDATE public.posting_application_notes SET ${set}`);
          expect(err.code, set).toBe('42501');
          expect(err.message, set).toMatch(/keys are immutable/);
        }
        expect((await failure(`UPDATE public.posting_application_notes SET body = repeat('x', 4001)`)).code).toBe('23514');
        expect((await client.query(`UPDATE public.posting_application_notes SET body = repeat('x', 4000)`)).rowCount).toBe(1);
        // The author cannot be forged.
        await client.query(`UPDATE public.posting_application_notes SET updated_by = $1, body = 'again'`, [scholarB]);
        expect((await client.query(`SELECT updated_by FROM public.posting_application_notes`)).rows[0].updated_by).toBe(MEMBER_ACCOUNT);
      });
    });

    it('cannot point a note at another institution\'s application (composite foreign key)', async () => {
      let app = { id: '', posting: '' };
      await as(asAdmin, async () => { app = await seedApplication(); }, async () => {
        await client.query('RESET ROLE');
        const err = await failure(`INSERT INTO public.posting_application_notes (application_id, institution_id, body) VALUES ($1, $2, 'x')`, [app.id, INST_B]);
        expect(err.code).toBe('23503');
      });
    });

    it('goes away with its application', async () => {
      let app = { id: '', posting: '' };
      await as(asAdmin, async () => { app = await seedApplication(); await client.query(`INSERT INTO public.posting_application_notes (application_id, institution_id, body) VALUES ($1, $2, 'x')`, [app.id, INST_A]); }, async () => {
        await client.query('RESET ROLE');
        await client.query(`DELETE FROM public.posting_applications WHERE id = $1`, [app.id]);
        expect((await client.query(`SELECT count(*)::int AS n FROM public.posting_application_notes`)).rows[0].n).toBe(0);
      });
    });
  });

  // ===========================================================================
  // 6. Events
  // ===========================================================================
  describe('audit events', () => {
    const events = async () =>
      (await client.query(`SELECT from_status, to_status, actor_account_id FROM public.posting_application_events ORDER BY created_at, ctid`)).rows;

    it('records the submission and every status change, and nothing for a no-op', async () => {
      let posting = '';
      await as(asScholarA, async () => { await memberOf(INST_A); posting = await createPosting(); }, async () => {
        await submit(posting);
        await asMigrationRole(asMember, async () => {}); // continue as the member
        await client.query(`UPDATE public.posting_applications SET status = 'under_review'`);
        await client.query(`UPDATE public.posting_applications SET status = 'under_review'`);
        await client.query(`UPDATE public.posting_applications SET status = 'interview_scheduled'`);
        await client.query(`UPDATE public.posting_applications SET status = 'declined'`);
        const rows = await events();
        expect(rows.map((r) => `${r.from_status ?? 'null'}>${r.to_status}`)).toEqual([
          'null>submitted',
          'submitted>under_review',
          'under_review>interview_scheduled',
          'interview_scheduled>declined',
        ]);
        expect(rows[0].actor_account_id).toBe(SCHOLAR_A_ACCOUNT);
        expect(rows[1].actor_account_id).toBe(MEMBER_ACCOUNT);
      });
    });

    it('is readable by members and admins but not by the applicant, and writable by no API caller', async () => {
      const setup = async () => { await memberOf(INST_A); await seedApplication(); await client.query(`UPDATE public.posting_applications SET status = 'under_review'`); };
      await as(asMember, setup, async () => { expect((await events()).length).toBeGreaterThan(0); });
      await as(asAdmin, setup, async () => { expect((await events()).length).toBeGreaterThan(0); });
      await as(asScholarA, setup, async () => { expect(await events()).toEqual([]); });
      await as(asScholarB, setup, async () => { expect(await events()).toEqual([]); });
      await as(asMember, setup, async () => {
        for (const sql of [
          `INSERT INTO public.posting_application_events (application_id, institution_id, to_status) VALUES ('${uuid()}', '${INST_A}', 'x')`,
          `UPDATE public.posting_application_events SET to_status = 'tampered'`,
          `DELETE FROM public.posting_application_events`,
        ]) {
          expect((await failure(sql)).code, sql).toBe('42501');
        }
      });
    });

    it('probe: with the trigger dropped nothing is recorded, so the trigger is the only writer', async () => {
      await as(
        asMember,
        async () => {
          await memberOf(INST_A);
          await client.query(`DROP TRIGGER trg_log_posting_application_event ON public.posting_applications`);
          await seedApplication();
        },
        async () => {
          await client.query(`UPDATE public.posting_applications SET status = 'under_review'`);
          expect(await events()).toEqual([]);
        }
      );
    });
  });

  // ===========================================================================
  // 7. Contact
  // ===========================================================================
  describe('get_application_contact', () => {
    const contact = async (id: string) =>
      (await client.query(`SELECT public.get_application_contact($1) AS email`, [id])).rows[0].email as string | null;

    it('releases the scholar login email to a member only at interview_scheduled', async () => {
      for (const st of APPLICATION_STATUSES) {
        let id = '';
        await as(asMember, async () => { await memberOf(INST_A); id = (await seedApplication({ status: st })).id; }, async () => {
          expect(await contact(id), st).toBe(st === 'interview_scheduled' ? SCHOLAR_A_EMAIL : null);
        });
      }
    });

    it('never releases it to the applicant, even when the applicant is also a member', async () => {
      let id = '';
      await as(asScholarA, async () => { id = (await seedApplication({ status: 'interview_scheduled' })).id; }, async () => {
        expect(await contact(id)).toBeNull();
      });
      await as(
        asScholarA,
        async () => { await memberOf(INST_A, 'owner', SCHOLAR_A_ACCOUNT); id = (await seedApplication({ status: 'interview_scheduled' })).id; },
        async () => { expect(await contact(id)).toBeNull(); }
      );
    });

    it('never releases it to a member of another institution, another scholar, or an admin who is not a member', async () => {
      let id = '';
      const setup = async () => { id = (await seedApplication({ status: 'interview_scheduled' })).id; };
      await as(asScholarB, setup, async () => { expect(await contact(id)).toBeNull(); });
      await as(asAdmin, setup, async () => { expect(await contact(id)).toBeNull(); });
      await as(asMember, async () => { await memberOf(INST_B); await setup(); }, async () => { expect(await contact(id)).toBeNull(); });
      await as(asMember, async () => { await memberOf(INST_A); }, async () => { expect(await contact(uuid())).toBeNull(); });
    });
  });

  // ===========================================================================
  // 8. Concurrency (committed; marker-cleaned)
  // ===========================================================================
  describe.skipIf(SINGLE_CONNECTION)('concurrency', () => {
    let postingIds: string[] = [];
    let concurrentScholars: { id: string; account: string }[] = [];

    async function cleanup() {
      const postings = (await client.query(`SELECT id FROM public.institution_postings WHERE slug LIKE $1`, [`${MARKER}%`])).rows.map((r) => r.id);
      if (postings.length) {
        await client.query(`DELETE FROM public.posting_applications WHERE posting_id = ANY($1)`, [postings]);
        await client.query(`DELETE FROM public.institution_postings WHERE id = ANY($1)`, [postings]);
      }
    }

    beforeAll(async () => {
      await cleanup();
      concurrentScholars = (
        await client.query(
          `SELECT s.id, s.account_id AS account FROM public.scholars s
           WHERE s.profile_status = 'approved' AND s.id NOT IN ($1, $2)
           ORDER BY s.slug DESC LIMIT 2`,
          [scholarA, scholarB]
        )
      ).rows;
      expect(concurrentScholars.length).toBe(2);
      const stamp = Date.now();
      postingIds = [];
      for (let i = 0; i < 26; i++) {
        const id = uuid();
        await client.query(
          `INSERT INTO public.institution_postings (id, institution_id, title, slug, opportunity_type, term, description, status)
           VALUES ($1, $2, $3, $4, 'adjunct', 'Fall 2027', 'Concurrency probe posting.', 'published')`,
          [id, INST_A, `Concurrency probe ${i}`, `${MARKER}-${stamp}-${i}`]
        );
        postingIds.push(id);
      }
    });

    afterAll(async () => {
      await cleanup();
    });

    async function concurrentSubmit(account: string, posting: string): Promise<{ ok: boolean; code?: string }> {
      const c = new Client({ connectionString: dbUrl });
      await c.connect();
      try {
        await c.query('BEGIN');
        await becomeCaller(c, { role: 'authenticated', sub: account });
        await c.query(`SELECT public.submit_posting_application($1, 'Concurrent application note.')`, [posting]);
        await c.query('COMMIT');
        return { ok: true };
      } catch (err) {
        await c.query('ROLLBACK').catch(() => undefined);
        return { ok: false, code: (err as PgError).code };
      } finally {
        await c.end();
      }
    }

    it('25 parallel applications over 25 postings give exactly 20 successes and 5 rate-limit refusals', async () => {
      const [who] = concurrentScholars;
      const results = await Promise.all(postingIds.slice(0, 25).map((p) => concurrentSubmit(who.account, p)));
      expect(results.filter((r) => r.ok)).toHaveLength(20);
      expect(results.filter((r) => !r.ok).map((r) => r.code)).toEqual(Array(5).fill('FS429'));
      const stored = (await client.query(`SELECT count(*)::int AS n FROM public.posting_applications WHERE scholar_id = $1 AND posting_id = ANY($2)`, [who.id, postingIds])).rows[0].n;
      expect(stored).toBe(20);
    });

    it('2 parallel applications to the same posting give exactly 1 success and 1 duplicate', async () => {
      const who = concurrentScholars[1];
      const results = await Promise.all([concurrentSubmit(who.account, postingIds[25]), concurrentSubmit(who.account, postingIds[25])]);
      expect(results.filter((r) => r.ok)).toHaveLength(1);
      expect(results.filter((r) => !r.ok).map((r) => r.code)).toEqual(['23505']);
      const stored = (await client.query(`SELECT count(*)::int AS n FROM public.posting_applications WHERE scholar_id = $1 AND posting_id = $2`, [who.id, postingIds[25]])).rows[0].n;
      expect(stored).toBe(1);
    });
  });
});
