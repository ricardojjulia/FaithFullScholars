import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Scholar revision lifecycle routes (ADR 0024): identity comes from the session,
 * the client can never choose scholar_id / status / revision_number / admin_notes,
 * snapshots are allow-listed, errors are generic. Database-level enforcement is
 * covered by tests/integration/scholar-revision-lifecycle.test.ts.
 */

const SCHOLAR_ID = 'f1000000-0000-0000-0000-00000000000a';
const OTHER_SCHOLAR_ID = 'f1000000-0000-0000-0000-00000000000b';

interface FakeCall {
  table: string;
  op: 'select' | 'insert' | 'update';
  payload?: Record<string, unknown>;
  filters: Array<[string, ...unknown[]]>;
}
type FakeResult = { data: unknown; error: unknown };

let user: { id: string } | null = null;
let scholarId: string | null = null;
let revisionHandler: (call: FakeCall) => FakeResult = () => ({ data: null, error: null });
let calls: FakeCall[] = [];
// Database taxonomy and the scholar's live relational rows (ADR 0025).
const TAXONOMY_ROWS: Record<string, Array<{ slug: string; name: string }>> = {
  disciplines: [
    { slug: 'systematic-theology', name: 'Systematic Theology' },
    { slug: 'church-history', name: 'Church History & Historical Theology' },
  ],
  traditions: [
    { slug: 'baptist', name: 'Baptist' },
    { slug: 'reformed-presbyterian', name: 'Reformed & Presbyterian' },
  ],
  confessional_standards: [
    { slug: 'westminster-confession', name: 'Westminster Confession of Faith' },
    { slug: 'lausanne-covenant', name: 'Lausanne Covenant' },
  ],
};
const LIVE_TABLES = ['credentials', 'publications', 'scholar_confessions', 'scholar_disciplines', 'scholar_traditions'];
let liveRows: Record<string, unknown[]> = {};
let taxonomyError = false;

function defaultResult(call: FakeCall): FakeResult {
  switch (call.table) {
    case 'accounts':
      return { data: { role: 'scholar' }, error: null };
    case 'scholars':
      if (call.op === 'update') return { data: null, error: null };
      return {
        data: scholarId
          ? {
              id: scholarId,
              slug: 'dr-a',
              full_name: 'Dr. A',
              title: 'Professor',
              profile_status: 'draft',
              verification_status: 'unverified',
              published_revision_id: null,
              draft_revision_id: null,
            }
          : null,
        error: null,
      };
    case 'institution_users':
      return { data: [], error: null };
    case 'disciplines':
    case 'traditions':
    case 'confessional_standards':
      return taxonomyError
        ? { data: null, error: { code: 'XX000', message: 'taxonomy secret' } }
        : { data: TAXONOMY_ROWS[call.table], error: null };
    default:
      if (LIVE_TABLES.includes(call.table)) return { data: liveRows[call.table] ?? [], error: null };
      return revisionHandler(call);
  }
}

function fakeQuery(table: string) {
  const call: FakeCall = { table, op: 'select', filters: [] };
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.insert = (payload: Record<string, unknown>) => {
    call.op = 'insert';
    call.payload = payload;
    return builder;
  };
  builder.update = (payload: Record<string, unknown>) => {
    call.op = 'update';
    call.payload = payload;
    return builder;
  };
  for (const method of ['eq', 'in', 'is', 'gt', 'order', 'limit']) {
    builder[method] = (...args: unknown[]) => {
      call.filters.push([method, ...args]);
      return builder;
    };
  }
  const run = () => {
    calls.push(call);
    return defaultResult(call);
  };
  builder.maybeSingle = async () => run();
  builder.single = async () => run();
  builder.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(run()).then(resolve, reject);
  return builder;
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: (table: string) => fakeQuery(table),
  }),
  createAdminClient: () => {
    throw new Error('Service-role client must not be used on scholar revision routes');
  },
}));

import { GET, PUT } from '@/app/api/scholars/revisions/route';
import { POST as submit } from '@/app/api/scholars/revisions/submit/route';
import { POST as withdraw } from '@/app/api/scholars/revisions/withdraw/route';
import { sanitizeSnapshot } from '@/lib/profiles/revision-service';
import { covers } from '../support/covers';

covers(
  'api:GET /api/scholars/revisions',
  'api:PUT /api/scholars/revisions',
  'api:POST /api/scholars/revisions/submit',
  'api:POST /api/scholars/revisions/withdraw'
);

const putReq = (body: unknown, raw?: string) =>
  new NextRequest('http://localhost:3845/api/scholars/revisions', {
    method: 'PUT',
    body: raw ?? JSON.stringify(body),
  });

const postReq = (body?: unknown) =>
  new Request('http://localhost:3845/api/scholars/revisions/action', {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const revisionRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'r1',
  scholar_id: SCHOLAR_ID,
  revision_number: 2,
  status: 'draft',
  snapshot_data: { full_name: 'Dr. A' },
  admin_notes: null,
  submitted_at: null,
  reviewed_at: null,
  created_at: '2026-10-06T00:00:00Z',
  updated_at: '2026-10-06T00:00:00Z',
  ...overrides,
});

const revisionCalls = (op?: FakeCall['op']) =>
  calls.filter((c) => c.table === 'scholar_profile_revisions' && (!op || c.op === op));

beforeEach(() => {
  user = { id: 'account-a' };
  scholarId = SCHOLAR_ID;
  calls = [];
  liveRows = {};
  taxonomyError = false;
  revisionHandler = () => ({ data: null, error: null });
});

describe('GET /api/scholars/revisions', () => {
  it('401 without a session, 404 without a scholar profile', async () => {
    user = null;
    expect((await GET()).status).toBe(401);
    user = { id: 'account-a' };
    scholarId = null;
    expect((await GET()).status).toBe(404);
  });

  it('returns the scholar, the open revision, and a profile baseline for a new scholar', async () => {
    revisionHandler = (call) => ({ data: call.op === 'select' ? revisionRow() : null, error: null });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.scholar.id).toBe(SCHOLAR_ID);
    expect(body.revision.id).toBe('r1');
    expect(body.baseline.source).toBe('profile');
    expect(body.baseline.snapshot.credentials).toEqual([]);
    expect(body.taxonomy.traditions).toContainEqual({ slug: 'baptist', name: 'Baptist' });
    expect(body.unresolved).toEqual([]);
  });

  it('builds the baseline from the live rows, even when a published revision exists', async () => {
    liveRows = {
      credentials: [{ degree: 'Ph.D.', field_of_study: 'NT', institution_name: 'Edinburgh', year_awarded: 2005, is_terminal: true }],
      scholar_disciplines: [{ is_primary: true, disciplines: { slug: 'systematic-theology' } }],
      scholar_traditions: [{ is_primary: true, traditions: [{ slug: 'baptist' }] }],
      scholar_confessions: [
        { adherence_level: 'full_subscription', exception_notes: null, confessional_standards: { slug: 'westminster-confession' } },
      ],
    };
    revisionHandler = (call) => ({
      data: call.op === 'select' ? { ...revisionRow({ status: 'approved' }), snapshot_data: { full_name: 'Stale', credentials: [] } } : null,
      error: null,
    });
    const body = await (await GET()).json();
    expect(body.baseline.snapshot.credentials).toHaveLength(1);
    expect(body.baseline.snapshot.disciplines).toEqual(['systematic-theology']);
    expect(body.baseline.snapshot.traditions).toEqual(['baptist']);
    expect(body.baseline.snapshot.confessions).toEqual([
      { confessional_standard_id: 'westminster-confession', adherence_level: 'full_subscription', exception_notes: null },
    ]);
    expect(body.baseline.snapshot.full_name).toBe('Dr. A');
  });

  it('maps legacy names in the open revision to slugs and reports what is unresolved', async () => {
    revisionHandler = () => ({
      data: revisionRow({
        snapshot_data: {
          full_name: 'Dr. A',
          traditions: ['Reformed & Presbyterian', 'Mystery Tradition'],
          confessions: [
            { confessional_standard_id: 'standard-lausanne', adherence_level: 'full_subscription' },
            { confessional_standard_id: 'standard-unknown', adherence_level: 'full_subscription' },
          ],
        },
      }),
      error: null,
    });
    const body = await (await GET()).json();
    expect(body.revision.snapshot_data.traditions).toEqual(['reformed-presbyterian', 'Mystery Tradition']);
    expect(body.revision.snapshot_data.confessions[0].confessional_standard_id).toBe('lausanne-covenant');
    expect(body.unresolved).toEqual([
      { kind: 'tradition', value: 'Mystery Tradition' },
      { kind: 'confession', value: 'standard-unknown' },
    ]);
  });

  it('fails with a generic 500 (no database detail) when the taxonomy cannot be read', async () => {
    taxonomyError = true;
    const res = await GET();
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('secret');
  });
});

describe('PUT /api/scholars/revisions', () => {
  it('401 and 404 before anything is read', async () => {
    user = null;
    expect((await PUT(putReq({ snapshot: {} }))).status).toBe(401);
    user = { id: 'account-a' };
    scholarId = null;
    expect((await PUT(putReq({ snapshot: {} }))).status).toBe(404);
    expect(revisionCalls()).toHaveLength(0);
  });

  it('400 for malformed JSON or a missing snapshot', async () => {
    expect((await PUT(putReq(null, '{not json'))).status).toBe(400);
    expect((await PUT(putReq({ revisionId: 'r1' }))).status).toBe(400);
    expect((await PUT(putReq({ snapshot: [] }))).status).toBe(400);
    expect(revisionCalls()).toHaveLength(0);
  });

  it('413 above 256 KB, before the body is parsed', async () => {
    // Not valid JSON on purpose: a 400 would mean the body was parsed first.
    const res = await PUT(putReq(null, 'x'.repeat(262145)));
    expect(res.status).toBe(413);
    expect(revisionCalls()).toHaveLength(0);
  });

  it('creates a draft with a server-chosen scholar_id and status, ignoring client-supplied control fields', async () => {
    revisionHandler = (call) =>
      call.op === 'insert'
        ? { data: revisionRow({ id: 'new-rev' }), error: null }
        : { data: null, error: null };

    const res = await PUT(
      putReq({
        scholar_id: OTHER_SCHOLAR_ID,
        status: 'approved',
        revision_number: 99,
        admin_notes: 'forged',
        snapshot: {
          full_name: '  Dr. A  ',
          profile_tier: 'distinguished_fellow',
          scholar_id: OTHER_SCHOLAR_ID,
          status: 'approved',
          unknown_key: 'x',
          biography: 'Bio',
        },
      })
    );

    expect(res.status).toBe(201);
    const [insert] = revisionCalls('insert');
    expect(Object.keys(insert.payload!).sort()).toEqual(['scholar_id', 'snapshot_data', 'status']);
    expect(insert.payload!.scholar_id).toBe(SCHOLAR_ID);
    expect(insert.payload!.status).toBe('draft');
    expect(insert.payload!.snapshot_data).toEqual({ full_name: 'Dr. A', biography: 'Bio' });

    // The advisory pointer is set on the scholar, never profile_status.
    const pointer = calls.find((c) => c.table === 'scholars' && c.op === 'update');
    expect(pointer?.payload).toEqual({ draft_revision_id: 'new-rev' });
  });

  it('updates only snapshot_data of an existing draft or changes_requested revision', async () => {
    for (const status of ['draft', 'changes_requested']) {
      calls = [];
      revisionHandler = (call) => {
        if (call.op === 'update') return { data: [revisionRow({ status })], error: null };
        return { data: revisionRow({ status }), error: null };
      };
      const res = await PUT(putReq({ revisionId: 'r1', status: 'submitted', snapshot: { full_name: 'Dr. A' } }));
      expect(res.status).toBe(200);
      const [update] = revisionCalls('update');
      expect(Object.keys(update.payload!)).toEqual(['snapshot_data']);
      expect(update.filters).toContainEqual(['eq', 'scholar_id', SCHOLAR_ID]);
      expect(update.filters).toContainEqual(['in', 'status', ['draft', 'changes_requested']]);
    }
  });

  it('409 while the revision is awaiting review, and for a stale revisionId', async () => {
    revisionHandler = () => ({ data: revisionRow({ status: 'submitted' }), error: null });
    const submitted = await PUT(putReq({ snapshot: { full_name: 'Dr. A' } }));
    expect(submitted.status).toBe(409);
    expect((await submitted.json()).error).toBe('This revision is awaiting review. Withdraw it to edit.');
    expect(revisionCalls('update')).toHaveLength(0);

    revisionHandler = () => ({ data: revisionRow({ id: 'current' }), error: null });
    const stale = await PUT(putReq({ revisionId: 'old', snapshot: { full_name: 'Dr. A' } }));
    expect(stale.status).toBe(409);

    revisionHandler = () => ({ data: null, error: null });
    const staleCreate = await PUT(putReq({ revisionId: 'old', snapshot: { full_name: 'Dr. A' } }));
    expect(staleCreate.status).toBe(409);
    expect(revisionCalls('insert')).toHaveLength(0);
  });

  it('retries once on a unique violation, then returns 409', async () => {
    revisionHandler = (call) =>
      call.op === 'insert' ? { data: null, error: { code: '23505', message: 'duplicate key secret' } } : { data: null, error: null };
    const res = await PUT(putReq({ snapshot: { full_name: 'Dr. A' } }));
    expect(res.status).toBe(409);
    expect(revisionCalls('insert')).toHaveLength(2);
    expect(JSON.stringify(await res.json())).not.toContain('secret');
  });

  it('maps a guard refusal (42501) to a generic 409 and other failures to a generic 500', async () => {
    revisionHandler = (call) =>
      call.op === 'update'
        ? { data: null, error: { code: '42501', message: 'Unauthorized: internal detail' } }
        : { data: revisionRow(), error: null };
    const refused = await PUT(putReq({ snapshot: { full_name: 'Dr. A' } }));
    expect(refused.status).toBe(409);
    expect(JSON.stringify(await refused.json())).not.toContain('internal detail');

    revisionHandler = (call) =>
      call.op === 'update'
        ? { data: null, error: { code: 'XX000', message: 'relation secret_table exploded' } }
        : { data: revisionRow(), error: null };
    const failed = await PUT(putReq({ snapshot: { full_name: 'Dr. A' } }));
    expect(failed.status).toBe(500);
    expect(JSON.stringify(await failed.json())).not.toContain('secret_table');
  });

  it('maps the database snapshot size check (23514) to 413', async () => {
    revisionHandler = (call) =>
      call.op === 'update'
        ? { data: null, error: { code: '23514', message: 'violates check constraint secret' } }
        : { data: revisionRow(), error: null };
    const res = await PUT(putReq({ snapshot: { full_name: 'Dr. A' } }));
    expect(res.status).toBe(413);
    expect(JSON.stringify(await res.json())).not.toContain('secret');
  });
});

describe('POST /api/scholars/revisions/submit', () => {
  it('401 and 404', async () => {
    user = null;
    expect((await submit(postReq())).status).toBe(401);
    user = { id: 'account-a' };
    scholarId = null;
    expect((await submit(postReq())).status).toBe(404);
  });

  it('409 when there is nothing submittable', async () => {
    expect((await submit(postReq())).status).toBe(409);
    revisionHandler = () => ({ data: revisionRow({ status: 'submitted' }), error: null });
    expect((await submit(postReq())).status).toBe(409);
    expect(revisionCalls('update')).toHaveLength(0);
  });

  it('400 when the stored snapshot fails validation', async () => {
    revisionHandler = () => ({ data: revisionRow({ snapshot_data: { full_name: '' } }), error: null });
    const res = await submit(postReq());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(Array.isArray(body.errors)).toBe(true);
    expect(body.errors.length).toBeGreaterThan(0);
    expect(body).not.toHaveProperty('details');
    expect(revisionCalls('update')).toHaveLength(0);
  });

  it('moves draft or changes_requested to submitted, scoped to the session scholar, and verifies the write', async () => {
    revisionHandler = (call) =>
      call.op === 'update'
        ? { data: [revisionRow({ status: 'submitted' })], error: null }
        : { data: revisionRow(), error: null };
    const res = await submit(postReq());
    expect(res.status).toBe(200);
    expect((await res.json()).revision.status).toBe('submitted');
    const [update] = revisionCalls('update');
    expect(update.payload).toEqual({ status: 'submitted', snapshot_data: { full_name: 'Dr. A' } });
    expect(update.filters).toContainEqual(['eq', 'scholar_id', SCHOLAR_ID]);
    expect(update.filters).toContainEqual(['in', 'status', ['draft', 'changes_requested']]);
    // Never touches the public listing state.
    expect(calls.some((c) => c.table === 'scholars' && c.op === 'update')).toBe(false);
  });

  it('422 with the unresolved entries while the draft holds unmatched taxonomy values, without writing', async () => {
    revisionHandler = () => ({
      data: revisionRow({
        snapshot_data: {
          full_name: 'Dr. A',
          disciplines: ['Systematic Theology', 'Underwater Basket Theology'],
          confessions: [{ confessional_standard_id: 'standard-nope', adherence_level: 'full_subscription' }],
        },
      }),
      error: null,
    });
    const res = await submit(postReq());
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.unresolved).toEqual([
      { kind: 'discipline', value: 'Underwater Basket Theology' },
      { kind: 'confession', value: 'standard-nope' },
    ]);
    expect(revisionCalls('update')).toHaveLength(0);
  });

  it('persists the slug-mapped snapshot on submit so approval never sees legacy names', async () => {
    revisionHandler = (call) =>
      call.op === 'update'
        ? { data: [revisionRow({ status: 'submitted' })], error: null }
        : {
            data: revisionRow({
              snapshot_data: {
                full_name: 'Dr. A',
                disciplines: ['Systematic Theology', 'systematic-theology'],
                confessions: [{ confessional_standard_id: 'standard-westminster', adherence_level: 'general_agreement' }],
              },
            }),
            error: null,
          };
    expect((await submit(postReq())).status).toBe(200);
    const [update] = revisionCalls('update');
    expect(update.payload?.snapshot_data).toEqual({
      full_name: 'Dr. A',
      disciplines: ['systematic-theology'],
      confessions: [
        { confessional_standard_id: 'westminster-confession', adherence_level: 'general_agreement', exception_notes: null },
      ],
    });
  });

  it('400 when a credential row is incomplete', async () => {
    revisionHandler = () => ({
      data: revisionRow({
        snapshot_data: {
          full_name: 'Dr. A',
          credentials: [{ degree: 'Ph.D.', field_of_study: '', institution_name: 'Edinburgh' }],
        },
      }),
      error: null,
    });
    const res = await submit(postReq());
    expect(res.status).toBe(400);
    expect((await res.json()).errors.join(' ')).toMatch(/Credential 1/);
  });

  it('409 when the conditional update matched no row; generic 500 on database failure', async () => {
    revisionHandler = (call) => (call.op === 'update' ? { data: [], error: null } : { data: revisionRow(), error: null });
    expect((await submit(postReq())).status).toBe(409);

    revisionHandler = (call) =>
      call.op === 'update'
        ? { data: null, error: { code: 'XX000', message: 'boom secret' } }
        : { data: revisionRow(), error: null };
    const res = await submit(postReq());
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('secret');
  });

  it('409 for a stale revisionId pin, without writing; a matching pin proceeds', async () => {
    revisionHandler = (call) =>
      call.op === 'update'
        ? { data: [revisionRow({ status: 'submitted' })], error: null }
        : { data: revisionRow(), error: null };
    expect((await submit(postReq({ revisionId: 'other' }))).status).toBe(409);
    expect(revisionCalls('update')).toHaveLength(0);
    expect((await submit(postReq({ revisionId: 'r1' }))).status).toBe(200);
  });
});

describe('POST /api/scholars/revisions/withdraw', () => {
  it('401 and 404', async () => {
    user = null;
    expect((await withdraw(postReq())).status).toBe(401);
    user = { id: 'account-a' };
    scholarId = null;
    expect((await withdraw(postReq())).status).toBe(404);
  });

  it('409 unless the open revision is submitted', async () => {
    expect((await withdraw(postReq())).status).toBe(409);
    revisionHandler = () => ({ data: revisionRow({ status: 'draft' }), error: null });
    expect((await withdraw(postReq())).status).toBe(409);
    expect(revisionCalls('update')).toHaveLength(0);
  });

  it('returns an unreviewed submission to draft with a conditional update', async () => {
    revisionHandler = (call) =>
      call.op === 'update'
        ? { data: [revisionRow({ status: 'draft' })], error: null }
        : { data: revisionRow({ status: 'submitted' }), error: null };
    const res = await withdraw(postReq());
    expect(res.status).toBe(200);
    const [update] = revisionCalls('update');
    expect(update.payload).toEqual({ status: 'draft' });
    expect(update.filters).toContainEqual(['eq', 'status', 'submitted']);
    expect(update.filters).toContainEqual(['is', 'reviewed_at', null]);
    expect(update.filters).toContainEqual(['eq', 'scholar_id', SCHOLAR_ID]);
  });

  it('409 when the revision was reviewed in the meantime', async () => {
    revisionHandler = (call) =>
      call.op === 'update'
        ? { data: [], error: null }
        : { data: revisionRow({ status: 'submitted' }), error: null };
    expect((await withdraw(postReq())).status).toBe(409);
  });

  it('409 for a stale revisionId pin, without writing', async () => {
    revisionHandler = () => ({ data: revisionRow({ status: 'submitted' }), error: null });
    expect((await withdraw(postReq({ revisionId: 'other' }))).status).toBe(409);
    expect(revisionCalls('update')).toHaveLength(0);
  });
});

describe('sanitizeSnapshot', () => {
  it('drops unknown keys and profile_tier, and trims strings', () => {
    const out = sanitizeSnapshot({
      full_name: '  Dr. A ',
      profile_tier: 'distinguished_fellow',
      verification_status: 'verified',
      title: ' Prof ',
      location: null,
      timezone: 42,
    });
    expect(out).toEqual({ full_name: 'Dr. A', title: 'Prof', location: null });
  });

  it('caps string lengths and array sizes', () => {
    const out = sanitizeSnapshot({
      full_name: 'x',
      title: 't'.repeat(500),
      biography: 'b'.repeat(6000),
      doctrinal_statement_text: 'd'.repeat(11000),
      disciplines: Array.from({ length: 80 }, (_, i) => `D${i}`),
    });
    expect(out.title).toHaveLength(200);
    expect(out.biography).toHaveLength(5000);
    expect(out.doctrinal_statement_text).toHaveLength(10000);
    expect(out.disciplines).toHaveLength(50);
  });

  it('type-checks array item fields and discards malformed items', () => {
    const out = sanitizeSnapshot({
      full_name: 'x',
      credentials: [
        { degree: 'Ph.D.', field_of_study: 'NT', institution_name: 'Edinburgh', year_awarded: 2005, is_terminal: true, extra: 1 },
        { degree: 5 },
        'nope',
      ],
      publications: [
        { title: 'Book', publication_type: 'book', year: 2018 },
        { title: 'Bad type', publication_type: 'blog' },
      ],
      confessions: [
        { confessional_standard_id: 'c1', adherence_level: 'full_subscription' },
        { confessional_standard_id: 'c2', adherence_level: 'whatever' },
      ],
      traditions: ['Reformed', 7, ''],
    });
    expect(out.credentials).toEqual([
      { degree: 'Ph.D.', field_of_study: 'NT', institution_name: 'Edinburgh', year_awarded: 2005, is_terminal: true },
    ]);
    expect(out.publications).toHaveLength(1);
    expect(out.publications![0].title).toBe('Book');
    expect(out.confessions).toHaveLength(1);
    expect(out.traditions).toEqual(['Reformed']);
  });

  it('returns an empty-named snapshot for non-object input', () => {
    expect(sanitizeSnapshot(null)).toEqual({ full_name: '' });
    expect(sanitizeSnapshot([1, 2])).toEqual({ full_name: '' });
  });
});

describe('sanitizeSnapshot taxonomy handling (ADR 0025)', () => {
  const taxonomy = {
    disciplines: TAXONOMY_ROWS.disciplines,
    traditions: TAXONOMY_ROWS.traditions,
    confessions: TAXONOMY_ROWS.confessional_standards,
  };

  it('maps slug, alias and name to the canonical slug and removes duplicates, keeping order', () => {
    const out = sanitizeSnapshot(
      {
        full_name: 'x',
        disciplines: ['church-history', 'Church History & Historical Theology', 'Historical Theology & Church History', 'SYSTEMATIC THEOLOGY'],
        traditions: ['Baptist', 'Confessional Baptist', 'baptist'],
      },
      taxonomy
    );
    expect(out.disciplines).toEqual(['church-history', 'systematic-theology']);
    expect(out.traditions).toEqual(['baptist']);
  });

  it('keeps unresolved values raw but capped', () => {
    const out = sanitizeSnapshot({ full_name: 'x', traditions: ['z'.repeat(500)] }, taxonomy);
    expect(out.traditions).toEqual(['z'.repeat(200)]);
  });

  it('maps confession ids, no longer emits confessional_standard_name, and de-duplicates', () => {
    const out = sanitizeSnapshot(
      {
        full_name: 'x',
        confessions: [
          { confessional_standard_id: 'standard-westminster', confessional_standard_name: 'WCF', adherence_level: 'full_subscription' },
          { confessional_standard_id: 'westminster-confession', adherence_level: 'with_exceptions' },
          { confessional_standard_id: 'x', confessional_standard_name: 'Lausanne Covenant', adherence_level: 'general_agreement' },
        ],
      },
      taxonomy
    );
    expect(out.confessions).toEqual([
      { confessional_standard_id: 'westminster-confession', adherence_level: 'full_subscription', exception_notes: null },
      { confessional_standard_id: 'lausanne-covenant', adherence_level: 'general_agreement', exception_notes: null },
    ]);
  });

  it('maps aliases without a taxonomy and keeps unknown values raw', () => {
    const out = sanitizeSnapshot({ full_name: 'x', traditions: ['Confessional Baptist', 'Unknown'] });
    expect(out.traditions).toEqual(['baptist', 'Unknown']);
  });

  it('keeps http(s) and DOI links and clears any other scheme', () => {
    const pub = (doi_or_url: string) => ({ title: 'T', publication_type: 'book', doi_or_url });
    const out = sanitizeSnapshot({
      full_name: 'x',
      publications: [
        pub('https://example.org/a'),
        pub('HTTP://example.org/b'),
        pub('10.1000/xyz123'),
        pub('javascript:alert(1)'),
        pub('ftp://example.org'),
        pub('data:text/html,hi'),
      ],
    });
    expect(out.publications!.map((p) => p.doi_or_url)).toEqual([
      'https://example.org/a',
      'HTTP://example.org/b',
      '10.1000/xyz123',
      null,
      null,
      null,
    ]);
  });
});

describe('PUT /api/scholars/revisions taxonomy mapping', () => {
  it('stores slugs for legacy names sent by an older editor', async () => {
    revisionHandler = (call) =>
      call.op === 'insert' ? { data: revisionRow(), error: null } : { data: null, error: null };
    const res = await PUT(
      putReq({ snapshot: { full_name: 'Dr. A', traditions: ['Confessional Baptist'], disciplines: ['Church History & Historical Theology'] } })
    );
    expect(res.status).toBe(201);
    const [insert] = revisionCalls('insert');
    const stored = insert.payload?.snapshot_data as Record<string, unknown>;
    expect(stored.traditions).toEqual(['baptist']);
    expect(stored.disciplines).toEqual(['church-history']);
  });
});
