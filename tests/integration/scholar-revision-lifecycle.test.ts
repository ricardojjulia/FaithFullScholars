import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * Scholar revision lifecycle (ADR 0024, migration 20261006090000) evaluated as
 * real `authenticated` / `anon` / `service_role` callers — the way PostgREST
 * runs requests. Each test runs in a transaction that is rolled back; seed data
 * is never modified. Fixtures are written as the migration role, which the
 * guard triggers do not restrict.
 */

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:49322/postgres';

const SCHOLAR_A_ACCOUNT = 'a1000000-0000-0000-0000-000000000002';
const ADMIN_ACCOUNT = 'a1000000-0000-0000-0000-000000000001';
const MISSING_REVISION = 'c0000000-0000-0000-0000-0000000fffff';

type Caller =
  | { role: 'authenticated'; sub: string }
  | { role: 'anon' }
  | { role: 'service_role' };

const GUARD_REFUSAL = /Unauthorized|row-level security/;

describe('Scholar revision lifecycle — real database roles', () => {
  let client: Client;
  let scholarA: string;
  let otherScholar: string;
  let publishedRevision: string | null;

  beforeAll(async () => {
    client = new Client({ connectionString: dbUrl });
    await client.connect();
    scholarA = (
      await client.query(`SELECT id FROM public.scholars WHERE account_id = $1`, [SCHOLAR_A_ACCOUNT])
    ).rows[0].id;
    publishedRevision =
      (await client.query(`SELECT published_revision_id FROM public.scholars WHERE id = $1`, [scholarA]))
        .rows[0].published_revision_id ?? null;
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
      await client.query(`SET LOCAL ROLE ${caller.role}`);
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify(caller)]);
      await body();
    } finally {
      await client.query('ROLLBACK');
    }
  }

  const asScholar = (setup: () => Promise<void>, body: () => Promise<void>) =>
    as({ role: 'authenticated', sub: SCHOLAR_A_ACCOUNT }, setup, body);

  /** The statement must raise a guard / RLS refusal. */
  async function denied(sql: string, params: unknown[] = []) {
    await client.query('SAVEPOINT attempt');
    await expect(client.query(sql, params)).rejects.toThrow(GUARD_REFUSAL);
    await client.query('ROLLBACK TO SAVEPOINT attempt');
  }

  /** The statement must either raise a refusal or touch no rows (RLS row filtering). */
  async function refused(sql: string, params: unknown[] = []) {
    await client.query('SAVEPOINT attempt');
    try {
      const res = await client.query(sql, params);
      expect(res.rowCount).toBe(0);
    } catch (err) {
      expect(String(err)).toMatch(GUARD_REFUSAL);
    }
    await client.query('ROLLBACK TO SAVEPOINT attempt');
  }

  // ---- fixtures (run as the migration role, before SET LOCAL ROLE) ----------
  const clearOpen = async (scholar: string) => {
    await client.query(
      `UPDATE public.scholar_profile_revisions SET status = 'superseded'
       WHERE scholar_id = $1 AND status IN ('draft', 'submitted', 'changes_requested')`,
      [scholar]
    );
  };

  async function revisionFor(
    scholar: string,
    status: string,
    extra: { reviewed: boolean; snapshot?: object } = { reviewed: false }
  ): Promise<string> {
    await clearOpen(scholar);
    const number = (
      await client.query(
        `SELECT coalesce(max(revision_number), 0) + 1 AS n FROM public.scholar_profile_revisions WHERE scholar_id = $1`,
        [scholar]
      )
    ).rows[0].n;
    const res = await client.query(
      `INSERT INTO public.scholar_profile_revisions
         (scholar_id, revision_number, status, snapshot_data, admin_notes, submitted_at, reviewed_at)
       VALUES ($1, $2, $3, $4::jsonb,
               CASE WHEN $5::boolean THEN 'Earlier reviewer note' END,
               CASE WHEN $3 IN ('submitted', 'changes_requested') THEN now() - interval '1 hour' END,
               CASE WHEN $5::boolean THEN now() - interval '30 minutes' END)
       RETURNING id`,
      [
        scholar,
        number,
        status,
        JSON.stringify(extra.snapshot ?? { full_name: 'Lifecycle Probe', title: 'Original' }),
        extra.reviewed,
      ]
    );
    return res.rows[0].id;
  }

  const ownDraft = () => revisionFor(scholarA, 'draft');

  // ---------------------------------------------------------------------------
  // INSERT
  // ---------------------------------------------------------------------------
  it('insert: a scholar can create a draft; revision_number is assigned by the database', async () => {
    let expectedNumber = 0;
    await asScholar(
      async () => {
        await clearOpen(scholarA);
        expectedNumber =
          (await client.query(`SELECT coalesce(max(revision_number), 0) + 1 AS n FROM public.scholar_profile_revisions WHERE scholar_id = $1`, [scholarA]))
            .rows[0].n;
      },
      async () => {
        // A forged revision_number is replaced by max + 1.
        const res = await client.query(
          `INSERT INTO public.scholar_profile_revisions (scholar_id, revision_number, status, snapshot_data)
           VALUES ($1, 99, 'draft', '{"full_name":"New draft"}'::jsonb)
           RETURNING revision_number, status, submitted_at, reviewed_at, admin_notes`,
          [scholarA]
        );
        expect(res.rows[0].revision_number).toBe(expectedNumber);
        expect(res.rows[0].status).toBe('draft');
        expect(res.rows[0].submitted_at).toBeNull();
        expect(res.rows[0].reviewed_at).toBeNull();
        expect(res.rows[0].admin_notes).toBeNull();
      }
    );
  });

  it('insert: refused for non-draft status, another scholar, or reviewer fields', async () => {
    await asScholar(
      () => clearOpen(scholarA),
      async () => {
        for (const status of ['submitted', 'approved', 'changes_requested', 'superseded', 'rejected']) {
          await denied(
            `INSERT INTO public.scholar_profile_revisions (scholar_id, status, snapshot_data) VALUES ($1, $2, '{}'::jsonb)`,
            [scholarA, status]
          );
        }
        await denied(
          `INSERT INTO public.scholar_profile_revisions (scholar_id, status, snapshot_data) VALUES ($1, 'draft', '{}'::jsonb)`,
          [otherScholar]
        );
        await denied(
          `INSERT INTO public.scholar_profile_revisions (scholar_id, status, admin_notes) VALUES ($1, 'draft', 'forged note')`,
          [scholarA]
        );
        await denied(
          `INSERT INTO public.scholar_profile_revisions (scholar_id, status, reviewed_at) VALUES ($1, 'draft', now())`,
          [scholarA]
        );
        await denied(
          `INSERT INTO public.scholar_profile_revisions (scholar_id, status, submitted_at) VALUES ($1, 'draft', now())`,
          [scholarA]
        );
      }
    );
  });

  it('insert: a second open revision is refused by the unique index', async () => {
    await asScholar(
      async () => {
        await ownDraft();
      },
      async () => {
        await client.query('SAVEPOINT attempt');
        await expect(
          client.query(
            `INSERT INTO public.scholar_profile_revisions (scholar_id, status, snapshot_data) VALUES ($1, 'draft', '{}'::jsonb)`,
            [scholarA]
          )
        ).rejects.toMatchObject({ code: '23505' });
        await client.query('ROLLBACK TO SAVEPOINT attempt');
      }
    );
  });

  it('insert: snapshot_data must be a JSON object within 256 KB', async () => {
    await asScholar(
      () => clearOpen(scholarA),
      async () => {
        await client.query('SAVEPOINT attempt');
        await expect(
          client.query(
            `INSERT INTO public.scholar_profile_revisions (scholar_id, status, snapshot_data) VALUES ($1, 'draft', '[1,2]'::jsonb)`,
            [scholarA]
          )
        ).rejects.toMatchObject({ code: '23514' });
        await client.query('ROLLBACK TO SAVEPOINT attempt');

        await client.query('SAVEPOINT attempt');
        await expect(
          client.query(
            `INSERT INTO public.scholar_profile_revisions (scholar_id, status, snapshot_data)
             VALUES ($1, 'draft', jsonb_build_object('biography', repeat('x', 262200)))`,
            [scholarA]
          )
        ).rejects.toMatchObject({ code: '23514' });
        await client.query('ROLLBACK TO SAVEPOINT attempt');
      }
    );
  });

  // ---------------------------------------------------------------------------
  // Visibility and tenancy
  // ---------------------------------------------------------------------------
  it('tenancy: another scholar cannot read, update, or delete a revision', async () => {
    let foreign = '';
    await asScholar(
      async () => {
        foreign = await revisionFor(otherScholar, 'draft');
      },
      async () => {
        const read = await client.query(`SELECT id FROM public.scholar_profile_revisions WHERE id = $1`, [foreign]);
        expect(read.rowCount).toBe(0);
        const upd = await client.query(
          `UPDATE public.scholar_profile_revisions SET snapshot_data = '{"full_name":"hijack"}'::jsonb WHERE id = $1`,
          [foreign]
        );
        expect(upd.rowCount).toBe(0);
        const del = await client.query(`DELETE FROM public.scholar_profile_revisions WHERE id = $1`, [foreign]);
        expect(del.rowCount).toBe(0);
      }
    );
  });

  it('tenancy: anonymous visitors cannot read any revision, including the published one', async () => {
    await as(
      { role: 'anon' },
      async () => {},
      async () => {
        let rows = 0;
        try {
          rows = (await client.query(`SELECT id FROM public.scholar_profile_revisions`)).rowCount ?? 0;
        } catch (err) {
          expect(String(err)).toMatch(/permission denied/);
        }
        expect(rows).toBe(0);
      }
    );
  });

  it('tenancy: the owner can read own revisions; a scholar DELETE removes nothing', async () => {
    let id = '';
    await asScholar(
      async () => {
        id = await ownDraft();
      },
      async () => {
        const read = await client.query(`SELECT id FROM public.scholar_profile_revisions WHERE id = $1`, [id]);
        expect(read.rowCount).toBe(1);
        const del = await client.query(`DELETE FROM public.scholar_profile_revisions WHERE id = $1`, [id]);
        expect(del.rowCount).toBe(0);
        const still = await client.query(`SELECT id FROM public.scholar_profile_revisions WHERE id = $1`, [id]);
        expect(still.rowCount).toBe(1);
      }
    );
  });

  // ---------------------------------------------------------------------------
  // UPDATE — allowed paths
  // ---------------------------------------------------------------------------
  it('allowed: save, submit (sets submitted_at), edit refused while submitted, withdraw (clears submitted_at)', async () => {
    let id = '';
    await asScholar(
      async () => {
        id = await ownDraft();
      },
      async () => {
        const save = await client.query(
          `UPDATE public.scholar_profile_revisions SET snapshot_data = '{"full_name":"Saved"}'::jsonb WHERE id = $1 RETURNING updated_at`,
          [id]
        );
        expect(save.rowCount).toBe(1);

        const submit = await client.query(
          `UPDATE public.scholar_profile_revisions SET status = 'submitted' WHERE id = $1
           RETURNING status, submitted_at, reviewed_at`,
          [id]
        );
        expect(submit.rows[0].status).toBe('submitted');
        expect(submit.rows[0].submitted_at).not.toBeNull();
        expect(submit.rows[0].reviewed_at).toBeNull();

        await denied(
          `UPDATE public.scholar_profile_revisions SET snapshot_data = '{"full_name":"Edited while submitted"}'::jsonb WHERE id = $1`,
          [id]
        );

        const withdraw = await client.query(
          `UPDATE public.scholar_profile_revisions SET status = 'draft' WHERE id = $1 RETURNING status, submitted_at`,
          [id]
        );
        expect(withdraw.rows[0].status).toBe('draft');
        expect(withdraw.rows[0].submitted_at).toBeNull();
      }
    );
  });

  it('allowed: changes_requested can be edited, returned to draft, or resubmitted (clearing reviewed_at)', async () => {
    let id = '';
    await asScholar(
      async () => {
        id = await revisionFor(scholarA, 'changes_requested', { reviewed: true });
      },
      async () => {
        const edit = await client.query(
          `UPDATE public.scholar_profile_revisions SET snapshot_data = '{"full_name":"Fixed"}'::jsonb WHERE id = $1`,
          [id]
        );
        expect(edit.rowCount).toBe(1);

        await client.query('SAVEPOINT attempt');
        const toDraft = await client.query(
          `UPDATE public.scholar_profile_revisions SET status = 'draft' WHERE id = $1 RETURNING status`,
          [id]
        );
        expect(toDraft.rows[0].status).toBe('draft');
        await client.query('ROLLBACK TO SAVEPOINT attempt');

        const resubmit = await client.query(
          `UPDATE public.scholar_profile_revisions SET status = 'submitted' WHERE id = $1
           RETURNING status, reviewed_at, submitted_at, admin_notes`,
          [id]
        );
        expect(resubmit.rows[0].status).toBe('submitted');
        expect(resubmit.rows[0].reviewed_at).toBeNull();
        expect(resubmit.rows[0].submitted_at).not.toBeNull();
        // The previous note stays visible until the next decision.
        expect(resubmit.rows[0].admin_notes).toBe('Earlier reviewer note');

        // reviewed_at was cleared, so the scholar can withdraw again.
        const withdraw = await client.query(
          `UPDATE public.scholar_profile_revisions SET status = 'draft' WHERE id = $1 RETURNING status`,
          [id]
        );
        expect(withdraw.rows[0].status).toBe('draft');
      }
    );
  });

  // ---------------------------------------------------------------------------
  // UPDATE — forbidden paths
  // ---------------------------------------------------------------------------
  it('forbidden: a scholar can never set approved, superseded, rejected, or changes_requested', async () => {
    let draft = '';
    await asScholar(
      async () => {
        draft = await ownDraft();
      },
      async () => {
        for (const status of ['approved', 'superseded', 'rejected', 'changes_requested']) {
          await denied(`UPDATE public.scholar_profile_revisions SET status = $2 WHERE id = $1`, [draft, status]);
        }
      }
    );
    await asScholar(
      async () => {
        draft = await revisionFor(scholarA, 'submitted');
      },
      async () => {
        for (const status of ['approved', 'superseded', 'rejected', 'changes_requested']) {
          await denied(`UPDATE public.scholar_profile_revisions SET status = $2 WHERE id = $1`, [draft, status]);
        }
      }
    );
  });

  it('forbidden: identity, numbering, and review fields are immutable', async () => {
    let id = '';
    await asScholar(
      async () => {
        id = await ownDraft();
      },
      async () => {
        await denied(`UPDATE public.scholar_profile_revisions SET admin_notes = 'self-approved' WHERE id = $1`, [id]);
        await denied(`UPDATE public.scholar_profile_revisions SET reviewed_at = now() WHERE id = $1`, [id]);
        await denied(`UPDATE public.scholar_profile_revisions SET revision_number = 99 WHERE id = $1`, [id]);
        await denied(`UPDATE public.scholar_profile_revisions SET scholar_id = $2 WHERE id = $1`, [id, otherScholar]);
        await denied(`UPDATE public.scholar_profile_revisions SET created_at = now() - interval '1 year' WHERE id = $1`, [id]);
        await denied(`UPDATE public.scholar_profile_revisions SET submitted_at = now() WHERE id = $1`, [id]);
      }
    );
  });

  it('forbidden: finalized revisions (approved, superseded, rejected) cannot be changed', async () => {
    for (const status of ['approved', 'superseded', 'rejected']) {
      let id = '';
      await asScholar(
        async () => {
          await clearOpen(scholarA);
          const number = (
            await client.query(
              `SELECT coalesce(max(revision_number), 0) + 1 AS n FROM public.scholar_profile_revisions WHERE scholar_id = $1`,
              [scholarA]
            )
          ).rows[0].n;
          id = (
            await client.query(
              `INSERT INTO public.scholar_profile_revisions (scholar_id, revision_number, status, snapshot_data, reviewed_at)
               VALUES ($1, $2, $3, '{"full_name":"Final"}'::jsonb, now()) RETURNING id`,
              [scholarA, number, status]
            )
          ).rows[0].id;
        },
        async () => {
          await refused(`UPDATE public.scholar_profile_revisions SET snapshot_data = '{"full_name":"Tampered"}'::jsonb WHERE id = $1`, [id]);
          await refused(`UPDATE public.scholar_profile_revisions SET status = 'draft' WHERE id = $1`, [id]);
          await refused(`UPDATE public.scholar_profile_revisions SET status = 'submitted' WHERE id = $1`, [id]);
          await refused(`UPDATE public.scholar_profile_revisions SET admin_notes = 'x' WHERE id = $1`, [id]);
        }
      );
    }
  });

  it('forbidden: withdrawing after a review decision', async () => {
    let id = '';
    await asScholar(
      async () => {
        id = await revisionFor(scholarA, 'submitted', { reviewed: true });
      },
      async () => {
        await denied(`UPDATE public.scholar_profile_revisions SET status = 'draft' WHERE id = $1`, [id]);
      }
    );
  });

  // ---------------------------------------------------------------------------
  // scholars.draft_revision_id
  // ---------------------------------------------------------------------------
  it('draft_revision_id: only the scholar\'s own open revision (or NULL) is accepted', async () => {
    let foreign = '';
    let ownClosed = '';
    let ownOpen = '';
    await asScholar(
      async () => {
        foreign = await revisionFor(otherScholar, 'draft');
        await clearOpen(scholarA);
        const number = (
          await client.query(
            `SELECT coalesce(max(revision_number), 0) + 1 AS n FROM public.scholar_profile_revisions WHERE scholar_id = $1`,
            [scholarA]
          )
        ).rows[0].n;
        ownClosed = (
          await client.query(
            `INSERT INTO public.scholar_profile_revisions (scholar_id, revision_number, status, reviewed_at)
             VALUES ($1, $2, 'rejected', now()) RETURNING id`,
            [scholarA, number]
          )
        ).rows[0].id;
        ownOpen = await ownDraft();
      },
      async () => {
        await denied(`UPDATE public.scholars SET draft_revision_id = $2 WHERE id = $1`, [scholarA, foreign]);
        await denied(`UPDATE public.scholars SET draft_revision_id = $2 WHERE id = $1`, [scholarA, ownClosed]);
        const set = await client.query(`UPDATE public.scholars SET draft_revision_id = $2 WHERE id = $1`, [scholarA, ownOpen]);
        expect(set.rowCount).toBe(1);
        const clear = await client.query(`UPDATE public.scholars SET draft_revision_id = NULL WHERE id = $1`, [scholarA]);
        expect(clear.rowCount).toBe(1);
      }
    );
  });

  // ---------------------------------------------------------------------------
  // review_profile_revision
  // ---------------------------------------------------------------------------
  const review = (id: string, action: string, notes: string | null = null) =>
    client.query(`SELECT * FROM public.review_profile_revision($1, $2, $3, $4)`, [id, action, notes, ADMIN_ACCOUNT]);

  it('review function: EXECUTE is denied to anon and authenticated', async () => {
    for (const caller of [{ role: 'anon' }, { role: 'authenticated', sub: SCHOLAR_A_ACCOUNT }] as Caller[]) {
      await as(
        caller,
        async () => {},
        async () => {
          await expect(review(MISSING_REVISION, 'approve')).rejects.toThrow(/permission denied for function review_profile_revision/);
        }
      );
    }
  });

  it('review function: approve copies scalars, supersedes the prior revision, clears the pointer, writes the audit row', async () => {
    let id = '';
    let tierBefore = '';
    await as(
      { role: 'service_role' },
      async () => {
        tierBefore = (await client.query(`SELECT profile_tier FROM public.scholars WHERE id = $1`, [scholarA])).rows[0].profile_tier;
        id = await revisionFor(scholarA, 'submitted', {
          reviewed: false,
          snapshot: {
            full_name: 'Approved Name',
            title: 'Approved Title',
            biography: 'Approved biography',
            profile_tier: 'distinguished_fellow',
            unknown_key: 'ignored',
          },
        });
        await client.query(`UPDATE public.scholars SET draft_revision_id = $2 WHERE id = $1`, [scholarA, id]);
      },
      async () => {
        const res = await review(id, 'approve', 'Looks good');
        expect(res.rows[0]).toMatchObject({ scholar_id: scholarA, revision_id: id, revision_status: 'approved' });

        const scholar = (await client.query(`SELECT * FROM public.scholars WHERE id = $1`, [scholarA])).rows[0];
        expect(scholar.full_name).toBe('Approved Name');
        expect(scholar.title).toBe('Approved Title');
        expect(scholar.biography).toBe('Approved biography');
        expect(scholar.published_revision_id).toBe(id);
        expect(scholar.profile_status).toBe('approved');
        expect(scholar.draft_revision_id).toBeNull();
        expect(scholar.profile_tier).toBe(tierBefore);

        const rev = (await client.query(`SELECT status, reviewed_at, admin_notes FROM public.scholar_profile_revisions WHERE id = $1`, [id])).rows[0];
        expect(rev.status).toBe('approved');
        expect(rev.reviewed_at).not.toBeNull();
        expect(rev.admin_notes).toBe('Looks good');

        expect(publishedRevision, 'seed scholar A has a published revision').not.toBeNull();
        const prior = (await client.query(`SELECT status FROM public.scholar_profile_revisions WHERE id = $1`, [publishedRevision])).rows[0];
        expect(prior.status).toBe('superseded');

        const audit = await client.query(
          `SELECT action, feedback_notes, reviewer_account_id FROM public.profile_reviews WHERE revision_id = $1`,
          [id]
        );
        expect(audit.rowCount).toBe(1);
        expect(audit.rows[0]).toMatchObject({ action: 'approve', feedback_notes: 'Looks good', reviewer_account_id: ADMIN_ACCOUNT });
      }
    );
  });

  it('review function: approving a hidden scholar keeps them hidden', async () => {
    let id = '';
    await as(
      { role: 'service_role' },
      async () => {
        id = await revisionFor(scholarA, 'submitted');
        await client.query(`UPDATE public.scholars SET profile_status = 'hidden' WHERE id = $1`, [scholarA]);
      },
      async () => {
        await review(id, 'approve');
        const scholar = (await client.query(`SELECT profile_status, published_revision_id FROM public.scholars WHERE id = $1`, [scholarA])).rows[0];
        expect(scholar.profile_status).toBe('hidden');
        expect(scholar.published_revision_id).toBe(id);
      }
    );
  });

  it('review function: request_changes keeps the revision editable and records the note', async () => {
    let id = '';
    await as(
      { role: 'service_role' },
      async () => {
        id = await revisionFor(scholarA, 'submitted');
      },
      async () => {
        const res = await review(id, 'request_changes', 'Please add your institution.');
        expect(res.rows[0].revision_status).toBe('changes_requested');
        const rev = (await client.query(`SELECT status, admin_notes, reviewed_at FROM public.scholar_profile_revisions WHERE id = $1`, [id])).rows[0];
        expect(rev.status).toBe('changes_requested');
        expect(rev.admin_notes).toBe('Please add your institution.');
        expect(rev.reviewed_at).not.toBeNull();
      }
    );
  });

  it('review function: reject is terminal and leaves the published profile untouched', async () => {
    let id = '';
    let before: { published_revision_id: string | null; profile_status: string; title: string | null } | undefined;
    await as(
      { role: 'service_role' },
      async () => {
        before = (await client.query(`SELECT published_revision_id, profile_status, title FROM public.scholars WHERE id = $1`, [scholarA])).rows[0];
        id = await revisionFor(scholarA, 'submitted', { reviewed: false, snapshot: { full_name: 'Rejected Name', title: 'Rejected' } });
        await client.query(`UPDATE public.scholars SET draft_revision_id = $2 WHERE id = $1`, [scholarA, id]);
      },
      async () => {
        const res = await review(id, 'reject');
        expect(res.rows[0].revision_status).toBe('rejected');
        const rev = (await client.query(`SELECT status, admin_notes FROM public.scholar_profile_revisions WHERE id = $1`, [id])).rows[0];
        expect(rev.status).toBe('rejected');
        expect(rev.admin_notes).toBe('Submission rejected by editorial review.');
        const scholar = (await client.query(`SELECT published_revision_id, profile_status, title, draft_revision_id FROM public.scholars WHERE id = $1`, [scholarA])).rows[0];
        expect(scholar.published_revision_id).toBe(before!.published_revision_id);
        expect(scholar.profile_status).toBe(before!.profile_status);
        expect(scholar.title).toBe(before!.title);
        expect(scholar.draft_revision_id).toBeNull();

        // Terminal: cannot be reviewed again.
        await client.query('SAVEPOINT attempt');
        await expect(review(id, 'approve')).rejects.toMatchObject({ code: '55000' });
        await client.query('ROLLBACK TO SAVEPOINT attempt');
      }
    );
  });

  it('review function: only submitted revisions are reviewable; missing ids and bad actions are refused', async () => {
    let draft = '';
    await as(
      { role: 'service_role' },
      async () => {
        draft = await ownDraft();
      },
      async () => {
        for (const action of ['approve', 'request_changes', 'reject']) {
          await client.query('SAVEPOINT attempt');
          await expect(review(draft, action)).rejects.toMatchObject({ code: '55000' });
          await client.query('ROLLBACK TO SAVEPOINT attempt');
        }
        await client.query('SAVEPOINT attempt');
        await expect(review(MISSING_REVISION, 'approve')).rejects.toMatchObject({ code: 'P0002' });
        await client.query('ROLLBACK TO SAVEPOINT attempt');
        await client.query('SAVEPOINT attempt');
        await expect(review(draft, 'hide')).rejects.toMatchObject({ code: '22023' });
        await client.query('ROLLBACK TO SAVEPOINT attempt');
      }
    );
  });
});
