import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { sendInquiry } from '@/lib/inquiries/actions';
import { checkLimit } from '@/lib/rate-limit/limiter';
import { checkSearchRateLimit, SEARCH_LIMITS } from '@/lib/search/rate-limiter';
import { covers } from '../support/covers';

covers('api:POST /api/inquiries');

/**
 * Persistent rate limits (ADR 0026, migration 20261008090000) evaluated as real
 * `anon` / `authenticated` / `service_role` callers, the way PostgREST runs
 * requests. Role-based tests run in a transaction that is rolled back. The
 * concurrency tests commit under unique keys / a message marker and clean up.
 *
 * Proof of failure is in-suite: each "probe" removes a guard (revokes the
 * deny, drops the trigger) inside a rolled-back transaction and shows the very
 * statement the denial test uses then SUCCEEDS, so the denial comes from the
 * guard and not from a bad fixture.
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
const MARKER = 'rate-limit-concurrency-probe';

type Caller =
  | { role: 'anon' }
  | { role: 'authenticated'; sub: string }
  | { role: 'service_role' };
type PgError = { code?: string; message: string };

const asMember: Caller = { role: 'authenticated', sub: INST_USER_ACCOUNT };

async function becomeCaller(client: Client, caller: Caller) {
  await client.query(`SET LOCAL ROLE ${caller.role}`);
  await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify(caller)]);
}

describe('Persistent rate limits — real database roles', () => {
  let client: Client;
  let scholarId: string;
  const uniq = `it:${Date.now()}`;

  beforeAll(async () => {
    client = new Client({ connectionString: dbUrl });
    await client.connect();
    scholarId = (
      await client.query(`SELECT id FROM public.scholars WHERE profile_status = 'approved' LIMIT 1`)
    ).rows[0].id;
  });

  afterAll(async () => {
    await client.query(`DELETE FROM public.rate_limit_buckets WHERE key LIKE $1`, [`${uniq}%`]);
    await client.query(`DELETE FROM public.rate_limit_buckets WHERE key LIKE 'it:%'`);
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

  // ---- fixtures (migration role, before SET LOCAL ROLE) ---------------------
  async function memberOfBoth() {
    for (const inst of [INST_A, INST_B]) {
      await client.query(
        `INSERT INTO public.institution_users (institution_id, account_id, role) VALUES ($1, $2, 'owner')
         ON CONFLICT (account_id, institution_id) DO UPDATE SET role = 'owner'`,
        [inst, INST_USER_ACCOUNT]
      );
    }
    await client.query(`DELETE FROM public.inquiries WHERE institution_id = ANY($1)`, [[INST_A, INST_B]]);
  }

  const insertInquiry = (inst: string, sender: string) =>
    client.query(
      `INSERT INTO public.inquiries (institution_id, scholar_id, sender_account_id, opportunity_type, message, contact_email)
       VALUES ($1, $2, $3, 'adjunct_teaching', 'Rate limit probe inquiry message.', 'dean@wts.edu')`,
      [inst, scholarId, sender]
    );

  async function fillTen(inst: string, ageHours = 0) {
    for (let i = 0; i < 10; i++) {
      await client.query(
        `INSERT INTO public.inquiries (institution_id, scholar_id, sender_account_id, opportunity_type, message, contact_email, created_at)
         VALUES ($1, $2, $3, 'adjunct_teaching', 'Pre-filled rate limit inquiry.', 'dean@wts.edu', now() - make_interval(hours => $4::int))`,
        [inst, scholarId, INST_USER_ACCOUNT, ageHours]
      );
    }
  }

  // ---- A. the limiter primitive --------------------------------------------
  describe('check_rate_limit grants', () => {
    const calls = [
      `SELECT * FROM public.check_rate_limit('it:grant', 60, 5)`,
      `SELECT * FROM public.check_search_rate_limit('it-grant-fp', 5, false)`,
    ];

    it('is not executable by anon or authenticated (42501)', async () => {
      for (const caller of [{ role: 'anon' }, asMember] as Caller[]) {
        for (const sql of calls) {
          await as(caller, nothing, async () => {
            expect((await failure(sql)).code, `${caller.role}: ${sql}`).toBe('42501');
          });
        }
      }
    });

    it('cannot read or write rate_limit_buckets directly (42501)', async () => {
      for (const caller of [{ role: 'anon' }, asMember] as Caller[]) {
        await as(caller, nothing, async () => {
          expect((await failure(`SELECT * FROM public.rate_limit_buckets`)).code).toBe('42501');
          expect(
            (await failure(`INSERT INTO public.rate_limit_buckets (key, window_start, hits) VALUES ('it:x', now(), 1)`)).code
          ).toBe('42501');
        });
      }
    });

    it('is executable by service_role', async () => {
      await as({ role: 'service_role' }, nothing, async () => {
        const res = await client.query(calls[0]);
        expect(res.rows[0].allowed).toBe(true);
      });
    });

    it('probe: granting EXECUTE to authenticated makes the call succeed, so the denial comes from the revoke', async () => {
      await as(
        asMember,
        async () => {
          await client.query(`GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) TO authenticated`);
          await client.query(`GRANT EXECUTE ON FUNCTION public.check_search_rate_limit(TEXT, INT, BOOLEAN) TO authenticated`);
        },
        async () => {
          for (const sql of calls) {
            const res = await client.query(sql);
            expect(res.rows.length, sql).toBe(1);
          }
        }
      );
    });
  });

  describe('check_rate_limit behaviour', () => {
    it('allows exactly N hits then refuses, with remaining and a future reset', async () => {
      await as({ role: 'service_role' }, nothing, async () => {
        const key = `${uniq}:seq`;
        for (let i = 1; i <= 3; i++) {
          const r = (await client.query(`SELECT * FROM public.check_rate_limit($1, 3600, 3)`, [key])).rows[0];
          expect(r.allowed).toBe(true);
          expect(r.remaining).toBe(3 - i);
          expect(new Date(r.reset_at).getTime()).toBeGreaterThan(Date.now());
        }
        const over = (await client.query(`SELECT * FROM public.check_rate_limit($1, 3600, 3)`, [key])).rows[0];
        expect(over.allowed).toBe(false);
        expect(over.remaining).toBe(0);
      });
    });

    it('keeps keys independent', async () => {
      await as({ role: 'service_role' }, nothing, async () => {
        await client.query(`SELECT * FROM public.check_rate_limit($1, 3600, 1)`, [`${uniq}:k1`]);
        const other = (await client.query(`SELECT * FROM public.check_rate_limit($1, 3600, 1)`, [`${uniq}:k2`])).rows[0];
        expect(other.allowed).toBe(true);
      });
    });

    it('rejects invalid input (22023)', async () => {
      await as({ role: 'service_role' }, nothing, async () => {
        for (const args of [
          [`''`, 60, 5],
          [`'${'k'.repeat(201)}'`, 60, 5],
          [`'it:v'`, 0, 5],
          [`'it:v'`, 86401, 5],
          [`'it:v'`, 60, 0],
          [`'it:v'`, 60, 10001],
        ]) {
          const err = await failure(`SELECT * FROM public.check_rate_limit(${args[0]}, ${args[1]}, ${args[2]})`);
          expect(err.code, String(args)).toBe('22023');
        }
      });
    });

    it('resets when the window rolls over', async () => {
      const key = `${uniq}:reset`;
      const hit = async () =>
        (await checkLimit(key, 2, 1)).allowed;
      // Align to the start of a 2-second window so both calls land in the same one.
      await new Promise((r) => setTimeout(r, 2000 - (Date.now() % 2000) + 20));
      expect(await hit()).toBe(true);
      expect(await hit()).toBe(false);
      await new Promise((r) => setTimeout(r, 2100));
      expect(await hit()).toBe(true);
    });

    it('cleans expired buckets, at most 100 per call', async () => {
      await as({ role: 'service_role' }, nothing, async () => {
        // service_role has no direct table grant, so fixtures and counts switch back
        // to the migration role briefly; the transaction is rolled back at the end.
        await client.query('RESET ROLE');
        await client.query(
          `INSERT INTO public.rate_limit_buckets (key, window_start, hits)
           SELECT 'it:aged:' || g, now() - interval '3 days', 1 FROM generate_series(1, 150) g`
        );
        await client.query(`SET LOCAL ROLE service_role`);
        const aged = async () => {
          await client.query('RESET ROLE');
          const n = (await client.query(`SELECT count(*)::int AS n FROM public.rate_limit_buckets WHERE key LIKE 'it:aged:%'`)).rows[0].n;
          await client.query(`SET LOCAL ROLE service_role`);
          return n;
        };
        expect(await aged()).toBe(150);
        await client.query(`SELECT * FROM public.check_rate_limit($1, 60, 5)`, [`${uniq}:clean1`]);
        expect(await aged()).toBe(50);
        await client.query(`SELECT * FROM public.check_rate_limit($1, 60, 5)`, [`${uniq}:clean2`]);
        expect(await aged()).toBe(0);
      });
    });

    it('retires each bucket one hour after its own window ended, not before', async () => {
      await as({ role: 'service_role' }, nothing, async () => {
        await client.query('RESET ROLE');
        await client.query(
          `INSERT INTO public.rate_limit_buckets (key, window_start, hits, window_seconds) VALUES
             ('it:ret:short-old', now() - interval '90 minutes', 1, 60),
             ('it:ret:short-recent', now() - interval '30 minutes', 1, 60),
             ('it:ret:day-live', now() - interval '3 hours', 1, 86400),
             ('it:ret:hour-old', now() - interval '3 hours', 1, 3600)`
        );
        await client.query(`SET LOCAL ROLE service_role`);
        await client.query(`SELECT * FROM public.check_rate_limit($1, 60, 5)`, [`${uniq}:ret`]);
        await client.query('RESET ROLE');
        const left = (
          await client.query(`SELECT key FROM public.rate_limit_buckets WHERE key LIKE 'it:ret:%' ORDER BY key`)
        ).rows.map((r) => r.key);
        // 90 min old / 1 min window and 3 h old / 1 h window are past window+1h; the day-long bucket is live.
        expect(left).toEqual(['it:ret:day-live', 'it:ret:short-recent']);
      });
    });

    it('counts concurrent calls exactly: 20 parallel hits against a max of 7 allow exactly 7', async () => {
      const key = `${uniq}:parallel`;
      const clients = await Promise.all(
        Array.from({ length: 20 }, async () => {
          const c = new Client({ connectionString: dbUrl });
          await c.connect();
          return c;
        })
      );
      try {
        const results = await Promise.all(
          clients.map(async (c) => {
            await c.query('BEGIN');
            await becomeCaller(c, { role: 'service_role' });
            const r = await c.query(`SELECT * FROM public.check_rate_limit($1, 3600, 7)`, [key]);
            await c.query('COMMIT');
            return r.rows[0].allowed as boolean;
          })
        );
        expect(results.filter(Boolean).length).toBe(7);
        expect(results.filter((a) => !a).length).toBe(13);
      } finally {
        await Promise.all(clients.map((c) => c.end()));
      }
    });
  });

  describe('app wrappers (service role through PostgREST)', () => {
    it('checkSearchRateLimit enforces the anonymous limit and then refuses', async () => {
      const key = `${uniq}:search`;
      let last = await checkSearchRateLimit(key, false);
      expect(last.allowed).toBe(true);
      expect(last.limit).toBe(SEARCH_LIMITS.ANONYMOUS);
      for (let i = 1; i < SEARCH_LIMITS.ANONYMOUS; i++) last = await checkSearchRateLimit(key, false);
      expect(last.allowed).toBe(true);
      expect(last.remaining).toBe(0);
      const over = await checkSearchRateLimit(key, false);
      expect(over.allowed).toBe(false);
    });
  });

  // ---- C. the inquiry cap ---------------------------------------------------
  describe('inquiry cap (guard_inquiry_rate, FS429)', () => {
    it('refuses the 11th inquiry in an hour for a member, while another institution is unaffected', async () => {
      await as(asMember, memberOfBoth, async () => {
        for (let i = 0; i < 10; i++) {
          await client.query('SAVEPOINT ok');
          await insertInquiry(INST_A, INST_USER_ACCOUNT);
          await client.query('RELEASE SAVEPOINT ok');
        }
        const err = await failure(
          `INSERT INTO public.inquiries (institution_id, scholar_id, sender_account_id, opportunity_type, message, contact_email)
           VALUES ($1, $2, $3, 'adjunct_teaching', 'Rate limit probe inquiry message.', 'dean@wts.edu')`,
          [INST_A, scholarId, INST_USER_ACCOUNT]
        );
        expect(err.code).toBe('FS429');
        expect(err.message).toMatch(/^Unauthorized: inquiry rate limit reached/);

        // Institution B still has its own allowance.
        await client.query('SAVEPOINT other');
        await insertInquiry(INST_B, INST_USER_ACCOUNT);
        await client.query('RELEASE SAVEPOINT other');
      });
    });

    it('does not count inquiries older than an hour', async () => {
      await as(
        asMember,
        async () => {
          await memberOfBoth();
          await fillTen(INST_A, 2);
        },
        async () => {
          await insertInquiry(INST_A, INST_USER_ACCOUNT);
        }
      );
    });

    it('exempts admins and the service role', async () => {
      for (const caller of [{ role: 'authenticated', sub: ADMIN_ACCOUNT }, { role: 'service_role' }] as Caller[]) {
        await as(
          caller,
          async () => {
            await memberOfBoth();
            await fillTen(INST_A);
          },
          async () => {
            await insertInquiry(INST_A, INST_USER_ACCOUNT);
          }
        );
      }
    });

    it('existing guard messages are unchanged: a non-pending status is refused by trg_guard_inquiries first', async () => {
      await as(
        asMember,
        async () => {
          await memberOfBoth();
          await fillTen(INST_A);
        },
        async () => {
          const err = await failure(
            `INSERT INTO public.inquiries (institution_id, scholar_id, sender_account_id, opportunity_type, message, contact_email, status)
             VALUES ($1, $2, $3, 'adjunct_teaching', 'Rate limit probe inquiry message.', 'dean@wts.edu', 'accepted')`,
            [INST_A, scholarId, INST_USER_ACCOUNT]
          );
          expect(err.code).toBe('42501');
          expect(err.message).toMatch(/new inquiries start pending/);
        }
      );
    });

    it('probe: dropping the trigger lets the 11th insert succeed, so the refusal comes from the guard', async () => {
      await as(
        asMember,
        async () => {
          await memberOfBoth();
          await fillTen(INST_A);
          await client.query(`DROP TRIGGER trg_guard_inquiry_rate ON public.inquiries`);
        },
        async () => {
          await insertInquiry(INST_A, INST_USER_ACCOUNT);
        }
      );
    });

    // ---- created_at is server-controlled (the cap counts it) ----------------
    const insertBackdated = (inst: string, hoursAgo: number) =>
      client.query(
        `INSERT INTO public.inquiries (institution_id, scholar_id, sender_account_id, opportunity_type, message, contact_email, created_at, updated_at)
         VALUES ($1, $2, $3, 'adjunct_teaching', 'Back-dated rate limit probe.', 'dean@wts.edu',
                 now() - make_interval(hours => $4::int), now() - make_interval(hours => $4::int))
         RETURNING id, created_at, updated_at`,
        [inst, scholarId, INST_USER_ACCOUNT, hoursAgo]
      );

    const eleventh = () =>
      failure(
        `INSERT INTO public.inquiries (institution_id, scholar_id, sender_account_id, opportunity_type, message, contact_email)
         VALUES ($1, $2, $3, 'adjunct_teaching', 'Rate limit probe inquiry message.', 'dean@wts.edu')`,
        [INST_A, scholarId, INST_USER_ACCOUNT]
      );

    it('stores now() for a back-dated INSERT by a member, so the row still counts', async () => {
      await as(asMember, memberOfBoth, async () => {
        const row = (await insertBackdated(INST_A, 5)).rows[0];
        expect(Math.abs(Date.now() - new Date(row.created_at).getTime())).toBeLessThan(60_000);
        expect(Math.abs(Date.now() - new Date(row.updated_at).getTime())).toBeLessThan(60_000);
      });
    });

    it('refuses an UPDATE that moves created_at backwards (42501), but allows a status update', async () => {
      await as(asMember, memberOfBoth, async () => {
        const id = (await insertBackdated(INST_A, 0)).rows[0].id;
        const err = await failure(
          `UPDATE public.inquiries SET created_at = now() - interval '5 hours' WHERE id = $1`,
          [id]
        );
        expect(err.code).toBe('42501');
        expect(err.message).toMatch(/^Unauthorized: inquiry created_at cannot be changed/);
        const ok = await client.query(`UPDATE public.inquiries SET status = 'read' WHERE id = $1`, [id]);
        expect(ok.rowCount).toBe(1);
      });
    });

    it('still refuses the 11th insert after back-dated inserts and a created_at UPDATE attempt', async () => {
      await as(asMember, memberOfBoth, async () => {
        let lastId = '';
        for (let i = 0; i < 10; i++) {
          await client.query('SAVEPOINT ok');
          lastId = (await insertBackdated(INST_A, 6)).rows[0].id;
          await client.query('RELEASE SAVEPOINT ok');
        }
        await failure(`UPDATE public.inquiries SET created_at = now() - interval '9 hours' WHERE id = $1`, [lastId]);
        const err = await eleventh();
        expect(err.code).toBe('FS429');
      });
    });

    it('probe: without the created_at protection, back-dating evades the cap', async () => {
      await as(
        asMember,
        async () => {
          await memberOfBoth();
          // The cap alone (no created_at forcing, no UPDATE refusal).
          await client.query(`
            CREATE OR REPLACE FUNCTION private.guard_inquiry_rate() RETURNS TRIGGER
            LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
            BEGIN
              IF private.is_restricted_caller() AND TG_OP = 'INSERT' THEN
                PERFORM pg_advisory_xact_lock(hashtextextended('inquiry-rate:' || NEW.institution_id::text, 0));
                IF private.recent_inquiry_count(NEW.institution_id) >= 10 THEN
                  RAISE EXCEPTION 'Unauthorized: inquiry rate limit reached' USING ERRCODE = 'FS429';
                END IF;
              END IF;
              RETURN NEW;
            END; $$`);
        },
        async () => {
          for (let i = 0; i < 12; i++) {
            await client.query('SAVEPOINT ok');
            const row = (await insertBackdated(INST_A, 6)).rows[0];
            expect(Date.now() - new Date(row.created_at).getTime()).toBeGreaterThan(5 * 3600 * 1000);
            await client.query('RELEASE SAVEPOINT ok');
          }
          // Twelve inserts went through: the cap was evaded.
          const n = (await client.query(
            `SELECT count(*)::int AS n FROM public.inquiries WHERE institution_id = $1 AND message = 'Back-dated rate limit probe.'`,
            [INST_A]
          )).rows[0].n;
          expect(n).toBe(12);
        }
      );
    });

    it('does not let a non-member read an institution count through the helper', async () => {
      await as(
        { role: 'authenticated', sub: ADMIN_ACCOUNT },
        async () => {
          await memberOfBoth();
          await fillTen(INST_A);
          await client.query(`DELETE FROM public.institution_users WHERE account_id = $1`, [ADMIN_ACCOUNT]);
        },
        async () => {
          const r = await client.query(`SELECT private.recent_inquiry_count($1) AS n`, [INST_A]);
          expect(r.rows[0].n).toBe(0);
        }
      );
      await as(asMember, async () => { await memberOfBoth(); await fillTen(INST_A); }, async () => {
        const r = await client.query(`SELECT private.recent_inquiry_count($1) AS n`, [INST_A]);
        expect(r.rows[0].n).toBe(10);
      });
    });

    it('serialises concurrent inserts: 14 parallel inserts into one institution commit exactly the remaining allowance', async () => {
      const createdMembership =
        (
          await client.query(
            `INSERT INTO public.institution_users (institution_id, account_id, role) VALUES ($1, $2, 'owner')
             ON CONFLICT (account_id, institution_id) DO NOTHING`,
            [INST_A, INST_USER_ACCOUNT]
          )
        ).rowCount === 1;
      const baseline = (
        await client.query(
          `SELECT count(*)::int AS n FROM public.inquiries WHERE institution_id = $1 AND created_at > now() - interval '1 hour'`,
          [INST_A]
        )
      ).rows[0].n as number;
      const clients = await Promise.all(
        Array.from({ length: 14 }, async () => {
          const c = new Client({ connectionString: dbUrl });
          await c.connect();
          return c;
        })
      );
      try {
        const outcomes = await Promise.all(
          clients.map(async (c) => {
            try {
              await c.query('BEGIN');
              await becomeCaller(c, asMember);
              await c.query(
                `INSERT INTO public.inquiries (institution_id, scholar_id, sender_account_id, opportunity_type, message, contact_email)
                 VALUES ($1, $2, $3, 'adjunct_teaching', $4, 'dean@wts.edu')`,
                [INST_A, scholarId, INST_USER_ACCOUNT, MARKER]
              );
              await c.query('COMMIT');
              return 'ok';
            } catch (err) {
              await c.query('ROLLBACK');
              return (err as PgError).code ?? 'error';
            }
          })
        );
        const ok = outcomes.filter((o) => o === 'ok').length;
        expect(ok).toBe(Math.max(0, 10 - baseline));
        expect(outcomes.filter((o) => o !== 'ok').every((o) => o === 'FS429')).toBe(true);
      } finally {
        await Promise.all(clients.map((c) => c.end()));
        await client.query(`DELETE FROM public.inquiries WHERE message = $1`, [MARKER]);
        if (createdMembership) {
          await client.query(`DELETE FROM public.institution_users WHERE institution_id = $1 AND account_id = $2`, [
            INST_A,
            INST_USER_ACCOUNT,
          ]);
        }
      }
    });
  });

  // ---- C. through the app action -------------------------------------------
  describe('sendInquiry (app action) as a real authenticated member', () => {
    /**
     * Minimal Supabase-client stand-in that runs the exact statements sendInquiry
     * issues against the open transaction, as the `authenticated` role, so RLS and
     * the guards apply. Error objects carry the SQLSTATE like PostgREST's.
     */
    function userClient() {
      const builder = (table: string) => {
        let cols = '*';
        let mode: 'select' | 'insert' = 'select';
        let row: Record<string, unknown> = {};
        const filters: [string, unknown][] = [];
        const api = {
          select(c = '*') { cols = c; return api; },
          eq(col: string, val: unknown) { filters.push([col, val]); return api; },
          insert(r: Record<string, unknown>) { mode = 'insert'; row = r; return api; },
          async single() {
            try {
              await client.query('SAVEPOINT action');
              let res;
              if (mode === 'insert') {
                const keys = Object.keys(row);
                res = await client.query(
                  `INSERT INTO public.${table} (${keys.join(',')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(',')}) RETURNING ${cols}`,
                  keys.map((k) => row[k])
                );
              } else {
                res = await client.query(
                  `SELECT ${cols} FROM public.${table} WHERE ${filters.map(([c], i) => `${c} = $${i + 1}`).join(' AND ')}`,
                  filters.map(([, v]) => v)
                );
              }
              await client.query('RELEASE SAVEPOINT action');
              return res.rows[0] ? { data: res.rows[0], error: null } : { data: null, error: { code: 'PGRST116' } };
            } catch (err) {
              await client.query('ROLLBACK TO SAVEPOINT action');
              return { data: null, error: { code: (err as PgError).code, message: (err as PgError).message } };
            }
          },
        };
        return api;
      };
      return { from: builder } as unknown as Parameters<typeof sendInquiry>[0];
    }

    const input = {
      institution_id: INST_A,
      scholar_id: '',
      opportunity_type: 'adjunct_teaching',
      message: 'We would like to discuss a teaching opportunity with you this term.',
      contact_email: 'dean@wts.edu',
    };

    it('maps the database FS429 refusal to a friendly 429 result', async () => {
      await as(
        asMember,
        async () => {
          await memberOfBoth();
          await fillTen(INST_A);
        },
        async () => {
          const result = await sendInquiry(
            userClient(),
            { ...input, scholar_id: scholarId } as unknown as Parameters<typeof sendInquiry>[1],
            INST_USER_ACCOUNT
          );
          expect(result.success).toBe(false);
          expect(result.status).toBe(429);
          expect(result.error).toMatch(/institution has reached its limit of 10 inquiries per hour/);
        }
      );
    });

    it('probe: with the trigger dropped the same call succeeds, so the 429 comes from the database guard', async () => {
      await as(
        asMember,
        async () => {
          await memberOfBoth();
          await fillTen(INST_A);
          await client.query(`DROP TRIGGER trg_guard_inquiry_rate ON public.inquiries`);
        },
        async () => {
          const result = await sendInquiry(
            userClient(),
            { ...input, scholar_id: scholarId } as unknown as Parameters<typeof sendInquiry>[1],
            INST_USER_ACCOUNT
          );
          expect(result.status).not.toBe(429);
          expect(result.success).toBe(true);
        }
      );
    });
  });
});
