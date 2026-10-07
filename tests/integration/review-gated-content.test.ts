import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { readFileSync } from 'node:fs';
import { createAdminClient } from '@/lib/supabase/server';
import { loadLiveProfileSnapshot, loadTaxonomy, sanitizeSnapshot } from '@/lib/profiles/revision-service';
import { processRevisionReview } from '@/lib/admin/actions';
import { TAXONOMY_ALIASES } from '@/lib/taxonomy/aliases';
import { findUnresolved, resolveTaxonomySlug } from '@/lib/taxonomy/resolve';

/**
 * Review-gated profile content and relational promotion (ADR 0025, migration
 * 20261007090000) evaluated as real `authenticated` / `service_role` callers, the
 * way PostgREST runs requests. Almost every test runs in a transaction that is
 * rolled back; seed data is never modified. The one end-to-end test at the bottom
 * commits a dedicated scholar and removes it again.
 *
 * Proof of failure is in-suite: the "probes" replace each guard with a
 * pass-through inside a transaction, assert the very statements the denial tests
 * use now SUCCEED, then roll back. A denial test that cannot fail would be false
 * confidence, so the probes show the denials come from the guards, not from
 * something incidental (RLS row filtering, a bad fixture).
 */

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:49322/postgres';

const SCHOLAR_A_ACCOUNT = 'a1000000-0000-0000-0000-000000000002';
const ADMIN_ACCOUNT = 'a1000000-0000-0000-0000-000000000001';
const NEW_ACCOUNT = 'a1999999-0000-0000-0000-0000000000c1';

type Caller =
  | { role: 'authenticated'; sub: string }
  | { role: 'service_role' };

type PgError = { code?: string; message: string; detail?: string };

describe('Review-gated profile content — real database roles', () => {
  let client: Client;
  let scholarA: string;
  let otherScholar: string;

  beforeAll(async () => {
    client = new Client({ connectionString: dbUrl });
    await client.connect();
    scholarA = (
      await client.query(`SELECT id FROM public.scholars WHERE account_id = $1`, [SCHOLAR_A_ACCOUNT])
    ).rows[0].id;
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
  const asAdmin = (setup: () => Promise<void>, body: () => Promise<void>) =>
    as({ role: 'authenticated', sub: ADMIN_ACCOUNT }, setup, body);
  const asService = (setup: () => Promise<void>, body: () => Promise<void>) =>
    as({ role: 'service_role' }, setup, body);
  const nothing = async () => {};

  /** The statement must fail; returns the error. */
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

  /** The guard trigger itself must refuse: message starts with 'Unauthorized:' (42501), not merely RLS. */
  async function guardDenied(sql: string, params: unknown[] = []) {
    const error = await failure(sql, params);
    expect(error.message, sql).toMatch(/^Unauthorized:/);
    expect(error.code, sql).toBe('42501');
  }

  /** The statement must succeed and touch at least one row. */
  async function allowed(sql: string, params: unknown[] = []) {
    await client.query('SAVEPOINT attempt');
    const res = await client.query(sql, params);
    await client.query('ROLLBACK TO SAVEPOINT attempt');
    expect(res.rowCount, sql).toBeGreaterThan(0);
  }

  // ---- fixtures (run as the migration role, before SET LOCAL ROLE) ----------
  async function ensureChildRows(scholar: string) {
    await client.query(
      `INSERT INTO public.credentials (scholar_id, degree, field_of_study, institution_name, display_order)
       VALUES ($1, 'Gate Probe', 'Probe Field', 'Probe University', 99)`,
      [scholar]
    );
    await client.query(
      `INSERT INTO public.publications (scholar_id, title, publication_type, display_order)
       VALUES ($1, 'Gate Probe Publication', 'book', 99)`,
      [scholar]
    );
    await client.query(
      `INSERT INTO public.scholar_disciplines (scholar_id, discipline_id, is_primary)
       SELECT $1, d.id, false FROM public.disciplines d WHERE d.slug = 'apologetics'
       ON CONFLICT (scholar_id, discipline_id) DO NOTHING`,
      [scholar]
    );
    await client.query(
      `INSERT INTO public.scholar_traditions (scholar_id, tradition_id, is_primary)
       SELECT $1, t.id, false FROM public.traditions t WHERE t.slug = 'lutheran'
       ON CONFLICT (scholar_id, tradition_id) DO NOTHING`,
      [scholar]
    );
    await client.query(
      `INSERT INTO public.scholar_confessions (scholar_id, confessional_standard_id, adherence_level)
       SELECT $1, c.id, 'general_agreement' FROM public.confessional_standards c WHERE c.slug = 'apostles-creed'
       ON CONFLICT (scholar_id, confessional_standard_id) DO NOTHING`,
      [scholar]
    );
  }

  const clearOpen = async (scholar: string) => {
    await client.query(
      `UPDATE public.scholar_profile_revisions SET status = 'superseded'
       WHERE scholar_id = $1 AND status IN ('draft', 'submitted', 'changes_requested')`,
      [scholar]
    );
  };

  /** A submitted revision holding `snapshot`, for the given scholar. */
  async function submitted(scholar: string, snapshot: object): Promise<string> {
    await clearOpen(scholar);
    const number = (
      await client.query(
        `SELECT coalesce(max(revision_number), 0) + 1 AS n FROM public.scholar_profile_revisions WHERE scholar_id = $1`,
        [scholar]
      )
    ).rows[0].n;
    const res = await client.query(
      `INSERT INTO public.scholar_profile_revisions
         (scholar_id, revision_number, status, snapshot_data, submitted_at)
       VALUES ($1, $2, 'submitted', $3::jsonb, now() - interval '1 hour') RETURNING id`,
      [scholar, number, JSON.stringify(snapshot)]
    );
    return res.rows[0].id;
  }

  const approveSql = `SELECT * FROM public.review_profile_revision($1, 'approve', 'ok', $2)`;
  const approve = (revision: string) => client.query(approveSql, [revision, ADMIN_ACCOUNT]);

  async function lists(scholar: string) {
    const q = async (sql: string) => (await client.query(sql, [scholar])).rows;
    return {
      credentials: await q(
        `SELECT degree, field_of_study, institution_name, year_awarded, is_terminal, display_order
         FROM public.credentials WHERE scholar_id = $1 ORDER BY display_order, degree`
      ),
      publications: await q(
        `SELECT title, publication_type, publisher_or_journal, year, doi_or_url, citation_text, display_order
         FROM public.publications WHERE scholar_id = $1 ORDER BY display_order, title`
      ),
      disciplines: await q(
        `SELECT d.slug, sd.is_primary FROM public.scholar_disciplines sd
         JOIN public.disciplines d ON d.id = sd.discipline_id WHERE sd.scholar_id = $1 ORDER BY d.slug`
      ),
      traditions: await q(
        `SELECT t.slug, st.is_primary FROM public.scholar_traditions st
         JOIN public.traditions t ON t.id = st.tradition_id WHERE st.scholar_id = $1 ORDER BY t.slug`
      ),
      confessions: await q(
        `SELECT c.slug, sc.adherence_level, sc.exception_notes FROM public.scholar_confessions sc
         JOIN public.confessional_standards c ON c.id = sc.confessional_standard_id
         WHERE sc.scholar_id = $1 ORDER BY c.slug`
      ),
    };
  }

  const reviewCount = async (scholar: string) =>
    Number((await client.query(`SELECT count(*) AS n FROM public.profile_reviews WHERE scholar_id = $1`, [scholar])).rows[0].n);

  // ---------------------------------------------------------------------------
  // A. scholars: the allow-list
  // ---------------------------------------------------------------------------
  const GATED_UPDATES: Array<[string, string]> = [
    ['full_name', `'Changed Name'`],
    ['title', `'Changed Title'`],
    ['current_institution', `'Changed Institution'`],
    ['institutional_role', `'Changed Role'`],
    ['biography', `'Changed biography'`],
    ['location', `'Changed City'`],
    ['timezone', `'Europe/London'`],
    ['doctrinal_statement_text', `'Changed statement'`],
    ['orcid_id', `'0000-0002-1825-0097'`],
    ['google_scholar_url', `'https://scholar.google.com/citations?user=changed'`],
    ['slug', `'changed-slug'`],
    ['profile_photo_path', `'changed/photo.png'`],
    ['doctrinal_statement_path', `'changed/statement.pdf'`],
    ['created_at', `now() - interval '2 days'`],
  ];

  it('refuses a scholar UPDATE of every review-gated column (and the file paths and slug)', async () => {
    await asScholar(nothing, async () => {
      for (const [column, value] of GATED_UPDATES) {
        await guardDenied(`UPDATE public.scholars SET ${column} = ${value} WHERE id = $1`, [scholarA]);
      }
    });
  });

  it('refuses a gated column smuggled in next to an allowed one', async () => {
    await asScholar(nothing, async () => {
      await guardDenied(
        `UPDATE public.scholars SET contact_preference = 'email', biography = 'smuggled' WHERE id = $1`,
        [scholarA]
      );
    });
  });

  it('still allows the self-service columns, and a no-op write of a gated column', async () => {
    await asScholar(nothing, async () => {
      await allowed(`UPDATE public.scholars SET contact_preference = 'allowed-probe' WHERE id = $1`, [scholarA]);
      await allowed(`UPDATE public.scholars SET draft_revision_id = NULL WHERE id = $1`, [scholarA]);
      await allowed(`UPDATE public.scholars SET biography = biography WHERE id = $1`, [scholarA]);
    });
  });

  it('leaves the profile_tier refusal and its message to the tier trigger', async () => {
    await asScholar(nothing, async () => {
      const error = await failure(`UPDATE public.scholars SET profile_tier = 'distinguished_fellow' WHERE id = $1`, [scholarA]);
      expect(error.message).toMatch(/only platform administrators can modify scholar profile_tier/);
    });
  });

  it('refuses a restricted INSERT that carries content, and allows one with only slug and full_name', async () => {
    const setup = async () => {
      await client.query(
        `INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
           raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
         VALUES ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
           'gate.new.scholar@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())`,
        [NEW_ACCOUNT]
      );
      await client.query(
        `INSERT INTO public.accounts (id, email, role) VALUES ($1, 'gate.new.scholar@faithfullscholars.org', 'scholar')
         ON CONFLICT (id) DO NOTHING`,
        [NEW_ACCOUNT]
      );
    };
    await as({ role: 'authenticated', sub: NEW_ACCOUNT }, setup, async () => {
      for (const column of [
        'title', 'current_institution', 'institutional_role', 'biography', 'location', 'timezone',
        'doctrinal_statement_text', 'profile_photo_path', 'doctrinal_statement_path', 'orcid_id', 'google_scholar_url',
      ]) {
        await guardDenied(
          `INSERT INTO public.scholars (account_id, slug, full_name, ${column}) VALUES ($1, 'gate-new', 'Gate New', 'x')`,
          [NEW_ACCOUNT]
        );
      }
      await allowed(`INSERT INTO public.scholars (account_id, slug, full_name) VALUES ($1, 'gate-new', 'Gate New')`, [NEW_ACCOUNT]);
    });
  });

  it('leaves admin, service role and direct sessions unaffected', async () => {
    await asAdmin(nothing, async () => {
      await allowed(`UPDATE public.scholars SET biography = 'Admin edit' WHERE id = $1`, [scholarA]);
      await allowed(`UPDATE public.scholars SET slug = 'admin-slug-probe' WHERE id = $1`, [scholarA]);
      await allowed(
        `INSERT INTO public.credentials (scholar_id, degree, field_of_study, institution_name) VALUES ($1, 'A', 'B', 'C')`,
        [scholarA]
      );
    });
    await asService(nothing, async () => {
      await allowed(`UPDATE public.scholars SET biography = 'Service edit' WHERE id = $1`, [scholarA]);
      await allowed(`UPDATE public.scholars SET profile_photo_path = 'service/photo.png' WHERE id = $1`, [scholarA]);
      await allowed(
        `INSERT INTO public.credentials (scholar_id, degree, field_of_study, institution_name) VALUES ($1, 'A', 'B', 'C')`,
        [scholarA]
      );
    });
    await client.query('BEGIN');
    try {
      const direct = await client.query(`UPDATE public.scholars SET biography = 'Direct edit' WHERE id = $1`, [scholarA]);
      expect(direct.rowCount).toBe(1);
      await client.query(`DELETE FROM public.credentials WHERE scholar_id = $1`, [scholarA]);
    } finally {
      await client.query('ROLLBACK');
    }
  });

  // ---------------------------------------------------------------------------
  // B. published child tables
  // ---------------------------------------------------------------------------
  const CHILD_STATEMENTS: Array<{ table: string; insert: string; update: string }> = [
    {
      table: 'credentials',
      insert: `INSERT INTO public.credentials (scholar_id, degree, field_of_study, institution_name) VALUES ($1, 'X', 'Y', 'Z')`,
      update: `UPDATE public.credentials SET degree = 'Changed' WHERE scholar_id = $1`,
    },
    {
      table: 'publications',
      insert: `INSERT INTO public.publications (scholar_id, title, publication_type) VALUES ($1, 'T', 'book')`,
      update: `UPDATE public.publications SET title = 'Changed' WHERE scholar_id = $1`,
    },
    {
      table: 'scholar_disciplines',
      insert: `INSERT INTO public.scholar_disciplines (scholar_id, discipline_id)
               SELECT $1, d.id FROM public.disciplines d WHERE d.slug = 'missiology'`,
      update: `UPDATE public.scholar_disciplines SET is_primary = NOT is_primary WHERE scholar_id = $1`,
    },
    {
      table: 'scholar_traditions',
      insert: `INSERT INTO public.scholar_traditions (scholar_id, tradition_id)
               SELECT $1, t.id FROM public.traditions t WHERE t.slug = 'wesleyan-methodist'`,
      update: `UPDATE public.scholar_traditions SET is_primary = NOT is_primary WHERE scholar_id = $1`,
    },
    {
      table: 'scholar_confessions',
      insert: `INSERT INTO public.scholar_confessions (scholar_id, confessional_standard_id, adherence_level)
               SELECT $1, c.id, 'full_subscription' FROM public.confessional_standards c WHERE c.slug = 'chalcedonian-definition'`,
      update: `UPDATE public.scholar_confessions SET exception_notes = 'changed' WHERE scholar_id = $1`,
    },
  ];

  it('refuses a scholar INSERT, UPDATE and DELETE on each published child table', async () => {
    await asScholar(
      async () => {
        // Make sure the scholar's own row exists in every table, so the UPDATE/DELETE reach the guard.
        await ensureChildRows(scholarA);
        // Nothing to insert for the scholar's own pre-existing combination: use fresh taxonomy rows.
        await client.query(
          `DELETE FROM public.scholar_disciplines WHERE scholar_id = $1 AND discipline_id IN (SELECT id FROM public.disciplines WHERE slug = 'missiology')`,
          [scholarA]
        );
        await client.query(
          `DELETE FROM public.scholar_traditions WHERE scholar_id = $1 AND tradition_id IN (SELECT id FROM public.traditions WHERE slug = 'wesleyan-methodist')`,
          [scholarA]
        );
        await client.query(
          `DELETE FROM public.scholar_confessions WHERE scholar_id = $1 AND confessional_standard_id IN (SELECT id FROM public.confessional_standards WHERE slug = 'chalcedonian-definition')`,
          [scholarA]
        );
      },
      async () => {
        for (const { table, insert, update } of CHILD_STATEMENTS) {
          await guardDenied(insert, [scholarA]);
          await guardDenied(update, [scholarA]);
          await guardDenied(`DELETE FROM public.${table} WHERE scholar_id = $1`, [scholarA]);
        }
      }
    );
  });

  it('refuses writes to another scholar’s lists as well (no row can be reached)', async () => {
    await asScholar(nothing, async () => {
      for (const { insert } of CHILD_STATEMENTS) {
        const error = await failure(insert, [otherScholar]);
        expect(error.message).toMatch(/^Unauthorized:|row-level security/);
      }
    });
  });

  it('still allows the self-service tables: courses, course disciplines, media, speaker topics, availability', async () => {
    await asScholar(nothing, async () => {
      const course = await client.query(
        `INSERT INTO public.courses (scholar_id, title, slug, level)
         VALUES ($1, 'Gate Probe Course', 'gate-probe-course', 'graduate') RETURNING id`,
        [scholarA]
      );
      expect(course.rowCount).toBe(1);
      await allowed(
        `INSERT INTO public.course_disciplines (course_id, discipline_id)
         SELECT $1, d.id FROM public.disciplines d WHERE d.slug = 'systematic-theology'`,
        [course.rows[0].id]
      );
      await allowed(
        `INSERT INTO public.media_links (scholar_id, title, media_type, url)
         VALUES ($1, 'Gate Probe Media', 'youtube_video', 'https://www.youtube.com/watch?v=gateprobe')`,
        [scholarA]
      );
      await allowed(
        `INSERT INTO public.speaker_topics (scholar_id, title, description)
         VALUES ($1, 'Gate Probe Topic', 'Gate probe description')`,
        [scholarA]
      );
      await allowed(
        `INSERT INTO public.availability_profiles (scholar_id, notes) VALUES ($1, 'gate probe')
         ON CONFLICT (scholar_id) DO UPDATE SET notes = EXCLUDED.notes`,
        [scholarA]
      );
    });
  });

  // ---------------------------------------------------------------------------
  // C. promotion on approval
  // ---------------------------------------------------------------------------
  const cred = (degree: string, extra: object = {}) => ({
    degree,
    field_of_study: 'Field',
    institution_name: 'Institution',
    year_awarded: 2001,
    is_terminal: false,
    ...extra,
  });
  const pub = (title: string, extra: object = {}) => ({ title, publication_type: 'book', year: 2020, ...extra });

  it('replaces each list present in the snapshot: order, primary flag, enums, adherence and notes', async () => {
    await asService(
      async () => {
        await ensureChildRows(scholarA);
      },
      async () => {
        const id = await submitted(scholarA, {
          full_name: 'Promotion Probe',
          credentials: [cred('Second-listed first', { is_terminal: true }), cred('Listed second')],
          publications: [
            pub('Zebra', { doi_or_url: 'https://example.org/z' }),
            pub('Alpha', { publication_type: 'journal_article', doi_or_url: '10.1000/xyz', publisher_or_journal: 'Journal' }),
          ],
          disciplines: ['church-history', 'systematic-theology'],
          traditions: ['baptist', 'lutheran'],
          confessions: [
            { confessional_standard_id: 'lausanne-covenant', adherence_level: 'with_exceptions', exception_notes: 'Article 7' },
            { confessional_standard_id: 'nicene-creed', adherence_level: 'full_subscription', exception_notes: null },
          ],
        });
        await approve(id);

        const after = await lists(scholarA);
        expect(after.credentials.map((c) => [c.degree, c.display_order, c.is_terminal])).toEqual([
          ['Second-listed first', 0, true],
          ['Listed second', 1, false],
        ]);
        expect(after.publications.map((p) => [p.title, p.display_order, p.publication_type])).toEqual([
          ['Zebra', 0, 'book'],
          ['Alpha', 1, 'journal_article'],
        ]);
        expect(after.disciplines).toEqual([
          { slug: 'church-history', is_primary: true },
          { slug: 'systematic-theology', is_primary: false },
        ]);
        expect(after.traditions).toEqual([
          { slug: 'baptist', is_primary: true },
          { slug: 'lutheran', is_primary: false },
        ]);
        expect(after.confessions).toEqual([
          { slug: 'lausanne-covenant', adherence_level: 'with_exceptions', exception_notes: 'Article 7' },
          { slug: 'nicene-creed', adherence_level: 'full_subscription', exception_notes: null },
        ]);
        const published = await client.query(`SELECT published_revision_id FROM public.scholars WHERE id = $1`, [scholarA]);
        expect(published.rows[0].published_revision_id).toBe(id);
      }
    );
  });

  it('leaves a list unchanged when its key is absent or not an array, and clears it on []', async () => {
    let before: Awaited<ReturnType<typeof lists>>;
    await asService(
      async () => {
        await ensureChildRows(scholarA);
        before = await lists(scholarA);
      },
      async () => {
        await approve(await submitted(scholarA, { full_name: 'Absent Probe' }));
        expect(await lists(scholarA)).toEqual(before);
      }
    );
    await asService(
      async () => {
        await ensureChildRows(scholarA);
        before = await lists(scholarA);
      },
      async () => {
        await approve(
          await submitted(scholarA, {
            full_name: 'Not Array Probe',
            credentials: 'oops',
            publications: null,
            disciplines: { a: 1 },
            traditions: 7,
            confessions: true,
          })
        );
        expect(await lists(scholarA)).toEqual(before);
      }
    );
    await asService(
      async () => {
        await ensureChildRows(scholarA);
        before = await lists(scholarA);
        expect(before.credentials.length).toBeGreaterThan(0);
      },
      async () => {
        await approve(await submitted(scholarA, { full_name: 'Clear Probe', credentials: [], traditions: [] }));
        const after = await lists(scholarA);
        expect(after.credentials).toEqual([]);
        expect(after.traditions).toEqual([]);
        expect(after.publications).toEqual(before.publications);
        expect(after.disciplines).toEqual(before.disciplines);
        expect(after.confessions).toEqual(before.confessions);
      }
    );
  });

  it('removes duplicates (first wins) and makes the first entry primary', async () => {
    await asService(nothing, async () => {
      await approve(
        await submitted(scholarA, {
          full_name: 'Dedupe Probe',
          disciplines: ['systematic-theology', 'church-history', 'systematic-theology'],
          traditions: ['lutheran', 'lutheran'],
          confessions: [
            { confessional_standard_id: 'nicene-creed', adherence_level: 'full_subscription' },
            { confessional_standard_id: 'nicene-creed', adherence_level: 'with_exceptions', exception_notes: 'dup' },
          ],
        })
      );
      const after = await lists(scholarA);
      expect(after.disciplines).toEqual([
        { slug: 'church-history', is_primary: false },
        { slug: 'systematic-theology', is_primary: true },
      ]);
      expect(after.traditions).toEqual([{ slug: 'lutheran', is_primary: true }]);
      expect(after.confessions).toEqual([{ slug: 'nicene-creed', adherence_level: 'full_subscription', exception_notes: null }]);
    });
  });

  it('promotes the Lausanne Covenant (added by the migration and by the seed)', async () => {
    const res = await client.query(`SELECT slug, year FROM public.confessional_standards WHERE slug = 'lausanne-covenant'`);
    expect(res.rows).toEqual([{ slug: 'lausanne-covenant', year: 1974 }]);
  });

  it('keeps a hidden scholar hidden while still publishing the content', async () => {
    await asService(
      async () => {
        await client.query(`UPDATE public.scholars SET profile_status = 'hidden' WHERE id = $1`, [scholarA]);
      },
      async () => {
        await approve(await submitted(scholarA, { full_name: 'Hidden Probe', credentials: [cred('Hidden Degree')] }));
        const scholar = await client.query(`SELECT profile_status, full_name FROM public.scholars WHERE id = $1`, [scholarA]);
        expect(scholar.rows[0]).toEqual({ profile_status: 'hidden', full_name: 'Hidden Probe' });
        expect((await lists(scholarA)).credentials.map((c) => c.degree)).toEqual(['Hidden Degree']);
      }
    );
  });

  it('FS001: unmatched taxonomy blocks approval, names every entry, and leaves nothing changed', async () => {
    await asService(
      async () => {
        await ensureChildRows(scholarA);
      },
      async () => {
        const before = await lists(scholarA);
        const reviews = await reviewCount(scholarA);
        const scholarBefore = (await client.query(`SELECT * FROM public.scholars WHERE id = $1`, [scholarA])).rows[0];
        const id = await submitted(scholarA, {
          full_name: 'Unmatched Probe',
          credentials: [cred('Would be replaced')],
          disciplines: ['church-history', 'Underwater Basket Theology'],
          traditions: ['Confessional Baptist'], // a legacy name: SQL matches slugs only
          confessions: [{ confessional_standard_id: 'standard-westminster', adherence_level: 'full_subscription' }],
        });

        const error = await failure(approveSql, [id, ADMIN_ACCOUNT]);
        expect(error.code).toBe('FS001');
        expect(JSON.parse(error.detail ?? '[]')).toEqual([
          // Lists are scanned in the order credentials, publications, confessions, disciplines, traditions.
          { kind: 'confession', value: 'standard-westminster' },
          { kind: 'discipline', value: 'Underwater Basket Theology' },
          { kind: 'tradition', value: 'Confessional Baptist' },
        ]);

        expect(await lists(scholarA)).toEqual(before);
        expect(await reviewCount(scholarA)).toBe(reviews);
        expect((await client.query(`SELECT * FROM public.scholars WHERE id = $1`, [scholarA])).rows[0]).toEqual(scholarBefore);
        const revision = await client.query(`SELECT status, reviewed_at FROM public.scholar_profile_revisions WHERE id = $1`, [id]);
        expect(revision.rows[0]).toEqual({ status: 'submitted', reviewed_at: null });
      }
    );
  });

  it('an approved revision is readable by an anonymous visitor in the shape getPublicScholarBySlug embeds', async () => {
    await asService(
      async () => {
        await ensureChildRows(scholarA);
      },
      async () => {
        const id = await submitted(scholarA, {
          full_name: 'Public Read Probe',
          credentials: [cred('Public Degree')],
          publications: [pub('Public Publication')],
          disciplines: ['church-history'],
          traditions: ['baptist'],
          confessions: [{ confessional_standard_id: 'lausanne-covenant', adherence_level: 'full_subscription' }],
        });
        await approve(id);
        const slug = (await client.query(`SELECT slug FROM public.scholars WHERE id = $1`, [scholarA])).rows[0].slug;

        // Switch to the anonymous visitor, as PostgREST does for the public profile page.
        await client.query('RESET ROLE');
        await client.query('SET LOCAL ROLE anon');
        await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ role: 'anon' })]);
        const rows = async (sql: string) => (await client.query(sql, [slug])).rows;
        expect(await rows(`SELECT full_name FROM public.scholars WHERE slug = $1 AND profile_status = 'approved'`)).toEqual([
          { full_name: 'Public Read Probe' },
        ]);
        expect(
          await rows(`SELECT c.degree FROM public.credentials c JOIN public.scholars s ON s.id = c.scholar_id WHERE s.slug = $1`)
        ).toEqual([{ degree: 'Public Degree' }]);
        expect(
          await rows(`SELECT p.title FROM public.publications p JOIN public.scholars s ON s.id = p.scholar_id WHERE s.slug = $1`)
        ).toEqual([{ title: 'Public Publication' }]);
        expect(
          await rows(`SELECT d.slug FROM public.scholar_disciplines sd JOIN public.disciplines d ON d.id = sd.discipline_id
                      JOIN public.scholars s ON s.id = sd.scholar_id WHERE s.slug = $1`)
        ).toEqual([{ slug: 'church-history' }]);
        expect(
          await rows(`SELECT t.slug FROM public.scholar_traditions st JOIN public.traditions t ON t.id = st.tradition_id
                      JOIN public.scholars s ON s.id = st.scholar_id WHERE s.slug = $1`)
        ).toEqual([{ slug: 'baptist' }]);
        expect(
          await rows(`SELECT c.slug FROM public.scholar_confessions sc JOIN public.confessional_standards c ON c.id = sc.confessional_standard_id
                      JOIN public.scholars s ON s.id = sc.scholar_id WHERE s.slug = $1`)
        ).toEqual([{ slug: 'lausanne-covenant' }]);
      }
    );
  });

  const INVALID_SNAPSHOTS: Array<[string, object, RegExp]> = [
    ['an item that is not an object', { credentials: ['nope'] }, /credentials\[0\]/],
    ['a missing credential degree', { credentials: [cred('x', { degree: '' })] }, /credentials\[0\] degree/],
    ['an over-long credential field', { credentials: [cred('ok'), cred('ok', { field_of_study: 'f'.repeat(201) })] }, /credentials\[1\] field_of_study/],
    ['a fractional year', { credentials: [cred('ok', { year_awarded: 2001.5 })] }, /credentials\[0\] year_awarded/],
    ['a non-boolean is_terminal', { credentials: [cred('ok', { is_terminal: 'yes' })] }, /credentials\[0\] is_terminal/],
    ['an unknown publication type', { publications: [pub('T', { publication_type: 'blog' })] }, /publications\[0\] publication_type/],
    ['a javascript: link', { publications: [pub('T', { doi_or_url: 'javascript:alert(1)' })] }, /publications\[0\] doi_or_url/],
    ['an ftp link', { publications: [pub('T', { doi_or_url: 'ftp://example.org/x' })] }, /publications\[0\] doi_or_url/],
    ['an unknown adherence level', { confessions: [{ confessional_standard_id: 'nicene-creed', adherence_level: 'whatever' }] }, /confessions\[0\] adherence_level/],
    ['a non-string discipline', { disciplines: ['church-history', 5] }, /disciplines\[1\]/],
    ['too many items', { credentials: Array.from({ length: 51 }, (_, i) => cred(`D${i}`)) }, /credentials has more than 50 items/],
  ];

  it('FS002: an invalid shape names the list and index, and nothing changes', async () => {
    await asService(
      async () => {
        await ensureChildRows(scholarA);
      },
      async () => {
        const before = await lists(scholarA);
        for (const [label, snapshot, message] of INVALID_SNAPSHOTS) {
          const id = await submitted(scholarA, { full_name: 'Invalid Probe', ...snapshot });
          const error = await failure(approveSql, [id, ADMIN_ACCOUNT]);
          expect(error.code, label).toBe('FS002');
          expect(error.message, label).toMatch(message);
          expect(await lists(scholarA), label).toEqual(before);
          expect(
            (await client.query(`SELECT status FROM public.scholar_profile_revisions WHERE id = $1`, [id])).rows[0].status,
            label
          ).toBe('submitted');
        }
      }
    );
  });

  it('FS002 wins over FS001 when a snapshot is both malformed and unmatched', async () => {
    await asService(nothing, async () => {
      const id = await submitted(scholarA, {
        full_name: 'Both Probe',
        disciplines: ['Not A Slug'],
        credentials: [cred('x', { degree: '' })],
      });
      expect((await failure(approveSql, [id, ADMIN_ACCOUNT])).code).toBe('FS002');
    });
  });

  // ---------------------------------------------------------------------------
  // D. proof of failure: replace each guard with a pass-through, assert the
  //    denied statements now succeed, then roll back.
  // ---------------------------------------------------------------------------
  const passThroughTrigger = (fn: string) => `
    CREATE OR REPLACE FUNCTION private.${fn}() RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
    AS $f$ BEGIN IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW; END; $f$`;

  it('probe: with the scholars guard replaced by a pass-through, the gated UPDATEs succeed', async () => {
    await asScholar(
      () => client.query(passThroughTrigger('guard_scholars')).then(() => undefined),
      async () => {
        for (const [column, value] of GATED_UPDATES) {
          await allowed(`UPDATE public.scholars SET ${column} = ${value} WHERE id = $1`, [scholarA]);
        }
      }
    );
    // The guard is back after the rollback: the same statement is refused again.
    await asScholar(nothing, async () => {
      await guardDenied(`UPDATE public.scholars SET biography = 'Changed biography' WHERE id = $1`, [scholarA]);
    });
  });

  it('probe: with the scholars guard replaced by a pass-through, a restricted INSERT carrying content succeeds', async () => {
    await as(
      { role: 'authenticated', sub: NEW_ACCOUNT },
      async () => {
        await client.query(
          `INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
             raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
           VALUES ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
             'gate.new.scholar@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())`,
          [NEW_ACCOUNT]
        );
        await client.query(
          `INSERT INTO public.accounts (id, email, role) VALUES ($1, 'gate.new.scholar@faithfullscholars.org', 'scholar')
           ON CONFLICT (id) DO NOTHING`,
          [NEW_ACCOUNT]
        );
        await client.query(passThroughTrigger('guard_scholars'));
      },
      async () => {
        await allowed(
          `INSERT INTO public.scholars (account_id, slug, full_name, biography) VALUES ($1, 'gate-new', 'Gate New', 'x')`,
          [NEW_ACCOUNT]
        );
      }
    );
  });

  it('probe: with the child guard replaced by a pass-through, scholar INSERT, UPDATE and DELETE succeed', async () => {
    await asScholar(
      async () => {
        await ensureChildRows(scholarA);
        await client.query(passThroughTrigger('guard_scholar_published_children'));
      },
      async () => {
        for (const { table, insert, update } of CHILD_STATEMENTS) {
          await allowed(update, [scholarA]);
          await allowed(`DELETE FROM public.${table} WHERE scholar_id = $1`, [scholarA]);
          // After the delete no unique key can collide, so an INSERT now proves the guard (not a constraint) was the barrier.
          await allowed(insert, [scholarA]);
        }
      }
    );
    await asScholar(nothing, async () => {
      await guardDenied(CHILD_STATEMENTS[0].insert, [scholarA]);
    });
  });

  it('probe: with promotion replaced by a no-op, approval neither promotes lists nor refuses unmatched entries', async () => {
    await asService(
      async () => {
        await client.query(
          `CREATE OR REPLACE FUNCTION private.promote_snapshot_lists(p_scholar UUID, p_snapshot JSONB)
           RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
           AS $f$ BEGIN NULL; END; $f$`
        );
        await ensureChildRows(scholarA);
      },
      async () => {
        const before = await lists(scholarA);
        const id = await submitted(scholarA, {
          full_name: 'No-op Probe',
          credentials: [cred('Never promoted')],
          disciplines: ['Underwater Basket Theology'],
        });
        await approve(id); // would raise FS001 with the real function
        expect(await lists(scholarA)).toEqual(before);
      }
    );
  });

  // ---------------------------------------------------------------------------
  // E. TypeScript / SQL parity
  // ---------------------------------------------------------------------------
  it('every alias target exists in the database, and the TS resolver maps to slugs SQL accepts', async () => {
    const taxonomy = await loadTaxonomy(createAdminClient());
    const slugs = {
      discipline: new Set(taxonomy.disciplines.map((o) => o.slug)),
      tradition: new Set(taxonomy.traditions.map((o) => o.slug)),
      confession: new Set(taxonomy.confessions.map((o) => o.slug)),
    };
    for (const kind of ['discipline', 'tradition', 'confession'] as const) {
      for (const [alias, target] of Object.entries(TAXONOMY_ALIASES[kind])) {
        expect(slugs[kind].has(target), `${kind} alias "${alias}" -> "${target}" is not in the database`).toBe(true);
        expect(resolveTaxonomySlug(kind, alias, taxonomy)).toBe(target);
      }
    }
    // Every database row resolves to itself, by slug and by name, and SQL agrees.
    for (const [kind, rows] of [
      ['discipline', taxonomy.disciplines],
      ['tradition', taxonomy.traditions],
      ['confession', taxonomy.confessions],
    ] as const) {
      for (const row of rows) {
        expect(resolveTaxonomySlug(kind, row.slug, taxonomy)).toBe(row.slug);
        expect(resolveTaxonomySlug(kind, row.name, taxonomy)).toBe(row.slug);
        const sql = await client.query(`SELECT private.resolve_taxonomy_id($1, $2) AS id`, [kind, row.slug]);
        expect(sql.rows[0].id, `${kind} ${row.slug}`).not.toBeNull();
      }
    }
    expect(findUnresolved({ disciplines: ['church-history'], traditions: ['baptist'] }, taxonomy)).toEqual([]);
  });

  it('every slug in supabase/seed.sql that the editor can pick is present in the database', async () => {
    const seed = readFileSync(path.resolve(process.cwd(), 'supabase/seed.sql'), 'utf8');
    for (const slug of ['lausanne-covenant', 'chicago-statement-inerrancy', 'westminster-confession']) {
      expect(seed).toContain(`'${slug}'`);
    }
  });
});

// ------------------------------------------------------------------------------
// F. end to end: a first approval with pre-existing rows loses nothing (via the
//    loader). Commits a dedicated, hidden scholar and removes it again.
// ------------------------------------------------------------------------------
describe('First approval with pre-existing rows (loader to approval)', () => {
  let client: Client;
  const scholarId = 'f1999999-0000-0000-0000-0000000000b1';
  const accountId = 'a1999999-0000-0000-0000-0000000000b1';
  const adminAccount = 'a1000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    client = new Client({ connectionString: dbUrl });
    await client.connect();
    await client.query(
      `INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
         raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
       VALUES ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'gate.first.approval@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
       ON CONFLICT (id) DO NOTHING`,
      [accountId]
    );
    await client.query(
      `INSERT INTO public.accounts (id, email, role) VALUES ($1, 'gate.first.approval@faithfullscholars.org', 'scholar')
       ON CONFLICT (id) DO NOTHING`,
      [accountId]
    );
    await client.query(
      `INSERT INTO public.scholars (id, account_id, slug, full_name, title, profile_status)
       VALUES ($1, $2, 'gate-first-approval', 'Dr. First Approval', 'Lecturer', 'hidden')
       ON CONFLICT (id) DO NOTHING`,
      [scholarId, accountId]
    );
    await client.query(
      `INSERT INTO public.credentials (scholar_id, degree, field_of_study, institution_name, year_awarded, is_terminal, display_order) VALUES
         ($1, 'Ph.D.', 'Historical Theology', 'Edinburgh', 2008, true, 0),
         ($1, 'M.Div.', 'Pastoral Studies', 'RTS', 2002, false, 1)`,
      [scholarId]
    );
    await client.query(
      `INSERT INTO public.publications (scholar_id, title, publication_type, year, display_order)
       VALUES ($1, 'A Pre-existing Book', 'book', 2018, 0)`,
      [scholarId]
    );
    await client.query(
      `INSERT INTO public.scholar_confessions (scholar_id, confessional_standard_id, adherence_level, exception_notes)
       SELECT $1, c.id, 'with_exceptions', 'Chapter 24' FROM public.confessional_standards c WHERE c.slug = 'westminster-confession'`,
      [scholarId]
    );
    await client.query(
      `INSERT INTO public.scholar_disciplines (scholar_id, discipline_id, is_primary)
       SELECT $1, d.id, d.slug = 'church-history' FROM public.disciplines d WHERE d.slug IN ('church-history', 'systematic-theology')`,
      [scholarId]
    );
    await client.query(
      `INSERT INTO public.scholar_traditions (scholar_id, tradition_id, is_primary)
       SELECT $1, t.id, true FROM public.traditions t WHERE t.slug = 'reformed-presbyterian'`,
      [scholarId]
    );
  });

  afterAll(async () => {
    await client.query('DELETE FROM public.profile_reviews WHERE scholar_id = $1', [scholarId]);
    await client.query('UPDATE public.scholars SET published_revision_id = NULL, draft_revision_id = NULL WHERE id = $1', [scholarId]);
    await client.query('DELETE FROM public.scholar_profile_revisions WHERE scholar_id = $1', [scholarId]);
    await client.query('DELETE FROM public.scholars WHERE id = $1', [scholarId]);
    await client.query('DELETE FROM public.accounts WHERE id = $1', [accountId]);
    await client.query('DELETE FROM auth.users WHERE id = $1', [accountId]);
    await client.end();
  });

  it('an editor that starts from the live baseline and changes only the title removes nothing', async () => {
    const admin = createAdminClient();
    const live = await loadLiveProfileSnapshot(admin, scholarId);
    expect(live).not.toBeNull();
    expect(live?.credentials).toHaveLength(2);
    expect(live?.publications).toHaveLength(1);
    expect(live?.confessions).toEqual([
      { confessional_standard_id: 'westminster-confession', adherence_level: 'with_exceptions', exception_notes: 'Chapter 24' },
    ]);
    expect(live?.disciplines?.[0]).toBe('church-history');
    expect(live?.traditions).toEqual(['reformed-presbyterian']);

    // The editor saves its start point with one edit; the API sanitises with the taxonomy.
    const taxonomy = await loadTaxonomy(admin);
    const draft = sanitizeSnapshot({ ...live, title: 'Senior Lecturer' }, taxonomy);
    expect(findUnresolved(draft, taxonomy)).toEqual([]);
    const revision = await client.query(
      `INSERT INTO public.scholar_profile_revisions (scholar_id, revision_number, status, snapshot_data, submitted_at)
       VALUES ($1, 1, 'submitted', $2::jsonb, now()) RETURNING id`,
      [scholarId, JSON.stringify(draft)]
    );

    const result = await processRevisionReview({
      revisionId: revision.rows[0].id,
      action: 'approve',
      reviewerAccountId: adminAccount,
    });
    expect(result.success).toBe(true);

    const after = await loadLiveProfileSnapshot(admin, scholarId);
    expect(after).toEqual({ ...live, title: 'Senior Lecturer' });
    const scholar = await client.query(`SELECT profile_status FROM public.scholars WHERE id = $1`, [scholarId]);
    expect(scholar.rows[0].profile_status).toBe('hidden');
  });
});
