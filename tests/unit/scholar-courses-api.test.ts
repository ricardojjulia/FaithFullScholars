import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Scholar course routes: identity comes from the session, a body-supplied
 * scholar_id is ignored, new courses are private, delete is blocked when
 * licensing agreements exist, logs carry codes only. Database-level isolation is
 * covered by tests/integration/scholar-courses-rls.test.ts.
 */

const SCHOLAR_ID = 'f1000000-0000-0000-0000-00000000000a';
const OTHER_SCHOLAR_ID = 'f1000000-0000-0000-0000-00000000000b';
const COURSE_ID = 'c1000000-0000-4000-8000-000000000001';

interface FakeCall {
  table: string;
  op: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
  payload?: unknown;
  filters: Array<[string, ...unknown[]]>;
}
type FakeResult = { data: unknown; error: unknown; count?: number | null };

let user: { id: string } | null = null;
let scholarId: string | null = null;
let lookupError = false;
let knownDisciplines: string[] = [];
let handler: (call: FakeCall) => FakeResult = () => ({ data: null, error: null });
let calls: FakeCall[] = [];

function defaultResult(call: FakeCall): FakeResult {
  if (call.table === 'accounts') {
    return lookupError ? { data: null, error: { code: '57014' } } : { data: { role: 'scholar' }, error: null };
  }
  if (call.table === 'scholars') return { data: scholarId ? { id: scholarId } : null, error: null };
  if (call.table === 'institution_users') return { data: [], error: null };
  if (call.table === 'disciplines') return { data: knownDisciplines.map((id) => ({ id })), error: null };
  return handler(call);
}

function fakeQuery(table: string) {
  const call: FakeCall = { table, op: 'select', filters: [] };
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.insert = (payload: unknown) => {
    call.op = 'insert';
    call.payload = payload;
    return builder;
  };
  builder.update = (payload: unknown) => {
    call.op = 'update';
    call.payload = payload;
    return builder;
  };
  builder.upsert = (payload: unknown) => {
    call.op = 'upsert';
    call.payload = payload;
    return builder;
  };
  builder.delete = () => {
    call.op = 'delete';
    return builder;
  };
  for (const method of ['eq', 'like', 'order', 'in', 'not']) {
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
  builder.then = (resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) =>
    Promise.resolve(run()).then(resolve, reject);
  return builder;
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: (table: string) => fakeQuery(table),
  }),
  createAdminClient: () => {
    throw new Error('Service-role client must not be used on scholar course routes');
  },
}));

import { GET, POST } from '@/app/api/scholars/courses/route';
import { PATCH, DELETE } from '@/app/api/scholars/courses/[id]/route';
import { covers } from '../support/covers';

covers(
  'api:GET /api/scholars/courses',
  'api:POST /api/scholars/courses',
  'api:PATCH /api/scholars/courses/[id]',
  'api:DELETE /api/scholars/courses/[id]'
);

const jsonReq = (method: string, body: unknown, url = 'http://localhost:3845/api/scholars/courses') =>
  new NextRequest(url, { method, body: typeof body === 'string' ? body : JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const callsFor = (table: string, op?: FakeCall['op']) => calls.filter((c) => c.table === table && (!op || c.op === op));

const courseRow = (over: Record<string, unknown> = {}) => ({
  id: COURSE_ID,
  title: 'Romans',
  slug: 'romans',
  visibility: 'private',
  course_disciplines: [],
  ...over,
});

beforeEach(() => {
  user = { id: 'account-a' };
  scholarId = SCHOLAR_ID;
  lookupError = false;
  knownDisciplines = [];
  calls = [];
  handler = () => ({ data: null, error: null });
  vi.restoreAllMocks();
});

describe('auth outcomes', () => {
  it('401 when signed out, 404 without a scholar profile, 503 when the lookup fails', async () => {
    user = null;
    expect((await GET()).status).toBe(401);
    expect((await POST(jsonReq('POST', {}))).status).toBe(401);
    expect((await PATCH(jsonReq('PATCH', {}), ctx(COURSE_ID))).status).toBe(401);
    expect((await DELETE(jsonReq('DELETE', {}), ctx(COURSE_ID))).status).toBe(401);

    user = { id: 'account-a' };
    scholarId = null;
    expect((await GET()).status).toBe(404);

    scholarId = SCHOLAR_ID;
    lookupError = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await GET()).status).toBe(503);
    expect(callsFor('courses')).toHaveLength(0);
  });
});

describe('GET /api/scholars/courses', () => {
  it('lists only the session scholar courses', async () => {
    handler = () => ({ data: [courseRow()], error: null });
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).courses).toHaveLength(1);
    expect(callsFor('courses')[0].filters).toContainEqual(['eq', 'scholar_id', SCHOLAR_ID]);
  });

  it('500 with a generic message and a code-only log on a database error', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    handler = () => ({ data: null, error: { code: '42501', message: 'secret detail', details: 'row dump' } });
    const res = await GET();
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('secret');
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret');
    expect(JSON.stringify(log.mock.calls)).toContain('42501');
  });
});

describe('POST /api/scholars/courses', () => {
  it('forces private, ignores a body scholar_id, slug and visibility', async () => {
    handler = (call) => {
      if (call.op === 'insert' && call.table === 'courses') return { data: { id: COURSE_ID }, error: null };
      if (call.op === 'select' && call.filters.some((f) => f[0] === 'like')) return { data: [{ slug: 'romans' }], error: null };
      if (call.op === 'select') return { data: courseRow({ slug: 'romans-2' }), error: null };
      return { data: null, error: null };
    };
    const res = await POST(
      jsonReq('POST', {
        title: 'Romans',
        level: 'graduate',
        scholar_id: OTHER_SCHOLAR_ID,
        slug: 'hijack',
        visibility: 'public',
      })
    );
    expect(res.status).toBe(201);
    const [insert] = callsFor('courses', 'insert');
    const row = insert.payload as Record<string, unknown>;
    expect(row.scholar_id).toBe(SCHOLAR_ID);
    expect(row.visibility).toBe('private');
    expect(row.slug).toBe('romans-2');
  });

  it('writes course_disciplines for the chosen discipline', async () => {
    const D1 = '11111111-1111-4111-8111-111111111111';
    knownDisciplines = [D1];
    handler = (call) => {
      if (call.op === 'insert' && call.table === 'courses') return { data: { id: COURSE_ID }, error: null };
      if (call.op === 'select' && call.filters.some((f) => f[0] === 'like')) return { data: [], error: null };
      if (call.op === 'select') return { data: courseRow(), error: null };
      return { data: null, error: null };
    };
    const res = await POST(jsonReq('POST', { title: 'Romans', level: 'graduate', primary_discipline_id: D1 }));
    expect(res.status).toBe(201);
    expect(callsFor('course_disciplines', 'upsert')[0].payload).toEqual([{ course_id: COURSE_ID, discipline_id: D1 }]);
  });

  it('400 on invalid input without touching the database, 400 on bad JSON', async () => {
    const res = await POST(jsonReq('POST', { title: '', level: 'nope' }));
    expect(res.status).toBe(400);
    expect((await res.json()).fields).toHaveProperty('title');
    expect((await POST(jsonReq('POST', '{not json'))).status).toBe(400);
    expect(callsFor('courses')).toHaveLength(0);
  });

  it('413 on an oversized body', async () => {
    expect((await POST(jsonReq('POST', 'x'.repeat(50_000)))).status).toBe(413);
  });
});

describe('POST slug collisions and cleanup', () => {
  it('retries a global slug clash with a random suffix and succeeds', async () => {
    let inserts = 0;
    handler = (call) => {
      if (call.op === 'insert' && call.table === 'courses') {
        inserts += 1;
        return inserts < 3 ? { data: null, error: { code: '23505' } } : { data: { id: COURSE_ID }, error: null };
      }
      if (call.op === 'select' && call.filters.some((f) => f[0] === 'like')) return { data: [], error: null };
      if (call.op === 'select') return { data: courseRow(), error: null };
      return { data: null, error: null };
    };
    const res = await POST(jsonReq('POST', { title: 'Romans', level: 'graduate' }));
    expect(res.status).toBe(201);
    const slugs = callsFor('courses', 'insert').map((c) => (c.payload as { slug: string }).slug);
    expect(slugs).toHaveLength(3);
    expect(new Set(slugs).size).toBe(3);
  });

  it('gives a generic 409 after five retries without revealing another course', async () => {
    handler = (call) => {
      if (call.op === 'insert' && call.table === 'courses') return { data: null, error: { code: '23505', details: 'Key (slug)=(romans) already exists.' } };
      if (call.op === 'select') return { data: [], error: null };
      return { data: null, error: null };
    };
    const res = await POST(jsonReq('POST', { title: 'Romans', level: 'graduate' }));
    expect(res.status).toBe(409);
    expect(callsFor('courses', 'insert')).toHaveLength(6); // first attempt + 5 retries
    expect(JSON.stringify(await res.json())).not.toMatch(/already exists|another|taken/i);
  });

  it('400 before any write when a discipline does not exist', async () => {
    knownDisciplines = [];
    const res = await POST(
      jsonReq('POST', { title: 'Romans', level: 'graduate', primary_discipline_id: '11111111-1111-4111-8111-111111111111' })
    );
    expect(res.status).toBe(400);
    expect(callsFor('courses', 'insert')).toHaveLength(0);
  });

  it('logs the code when the half-created course cannot be cleaned up', async () => {
    const D1 = '11111111-1111-4111-8111-111111111111';
    knownDisciplines = [D1];
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    handler = (call) => {
      if (call.op === 'insert' && call.table === 'courses') return { data: { id: COURSE_ID }, error: null };
      if (call.table === 'course_disciplines') return { data: null, error: { code: '40001', message: 'secret' } };
      if (call.op === 'delete') return { data: null, error: { code: '42501', message: 'secret' } };
      return { data: [], error: null };
    };
    const res = await POST(jsonReq('POST', { title: 'Romans', level: 'graduate', primary_discipline_id: D1 }));
    expect(res.status).toBe(500);
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain('cleanup');
    expect(logged).toContain('42501');
    expect(logged).not.toContain('secret');
  });
});

describe('PATCH /api/scholars/courses/[id]', () => {
  it('updates allow-listed fields scoped to the session scholar and never writes scholar_id', async () => {
    handler = (call) => {
      if (call.op === 'update') return { data: { id: COURSE_ID }, error: null };
      return { data: courseRow({ visibility: 'public' }), error: null };
    };
    const res = await PATCH(
      jsonReq('PATCH', { visibility: 'public', scholar_id: OTHER_SCHOLAR_ID, slug: 'x' }),
      ctx(COURSE_ID)
    );
    expect(res.status).toBe(200);
    const [update] = callsFor('courses', 'update');
    expect(Object.keys(update.payload as object).sort()).toEqual(['updated_at', 'visibility']);
    expect(update.filters).toContainEqual(['eq', 'scholar_id', SCHOLAR_ID]);
    expect(update.filters).toContainEqual(['eq', 'id', COURSE_ID]);
  });

  it('a primary alone ensures the primary is tagged and never deletes other tags', async () => {
    const D1 = '11111111-1111-4111-8111-111111111111';
    knownDisciplines = [D1];
    handler = (call) => {
      if (call.table === 'courses' && call.op === 'update') return { data: { id: COURSE_ID }, error: null };
      if (call.table === 'courses') return { data: courseRow(), error: null };
      return { data: null, error: null };
    };
    const res = await PATCH(jsonReq('PATCH', { primary_discipline_id: D1 }), ctx(COURSE_ID));
    expect(res.status).toBe(200);
    expect(callsFor('course_disciplines', 'upsert')).toHaveLength(1);
    expect(callsFor('course_disciplines', 'delete')).toHaveLength(0);
  });

  it('a title-only edit leaves course_disciplines untouched', async () => {
    handler = (call) => {
      if (call.table === 'courses' && call.op === 'update') return { data: { id: COURSE_ID }, error: null };
      return { data: courseRow(), error: null };
    };
    expect((await PATCH(jsonReq('PATCH', { title: 'New' }), ctx(COURSE_ID))).status).toBe(200);
    expect(callsFor('course_disciplines')).toHaveLength(0);
  });

  it('explicit discipline_ids upsert first, then delete only the tags not in the set', async () => {
    const D1 = '11111111-1111-4111-8111-111111111111';
    knownDisciplines = [D1];
    handler = (call) => {
      if (call.table === 'courses' && call.op === 'update') return { data: { id: COURSE_ID }, error: null };
      if (call.table === 'courses') return { data: courseRow(), error: null };
      return { data: null, error: null };
    };
    const res = await PATCH(jsonReq('PATCH', { discipline_ids: [D1] }), ctx(COURSE_ID));
    expect(res.status).toBe(200);
    const tagCalls = callsFor('course_disciplines');
    expect(tagCalls.map((c) => c.op)).toEqual(['upsert', 'delete']);
    expect(tagCalls[1].filters.some((f) => f[0] === 'not' && f[1] === 'discipline_id')).toBe(true);
  });

  it('a nonexistent discipline is a 400 with no partial update', async () => {
    knownDisciplines = [];
    handler = (call) => (call.table === 'courses' ? { data: { id: COURSE_ID }, error: null } : { data: null, error: null });
    const res = await PATCH(
      jsonReq('PATCH', { title: 'Changed', discipline_ids: ['11111111-1111-4111-8111-111111111111'] }),
      ctx(COURSE_ID)
    );
    expect(res.status).toBe(400);
    expect(callsFor('courses', 'update')).toHaveLength(0);
    expect(callsFor('course_disciplines')).toHaveLength(0);
  });

  it('404 for a course that is not the scholar, and for a malformed id', async () => {
    handler = () => ({ data: null, error: null });
    expect((await PATCH(jsonReq('PATCH', { visibility: 'public' }), ctx(COURSE_ID))).status).toBe(404);
    expect((await PATCH(jsonReq('PATCH', { visibility: 'public' }), ctx('not-a-uuid'))).status).toBe(404);
  });

  it('400 on invalid visibility or an empty update', async () => {
    expect((await PATCH(jsonReq('PATCH', { visibility: 'draft' }), ctx(COURSE_ID))).status).toBe(400);
    expect((await PATCH(jsonReq('PATCH', {}), ctx(COURSE_ID))).status).toBe(400);
  });
});

describe('DELETE /api/scholars/courses/[id]', () => {
  it('404 when the course is not the scholar, without counting or deleting', async () => {
    handler = () => ({ data: null, error: null });
    const res = await DELETE(jsonReq('DELETE', ''), ctx(COURSE_ID));
    expect(res.status).toBe(404);
    expect(callsFor('courses', 'delete')).toHaveLength(0);
    expect(callsFor('course_licensing_agreements')).toHaveLength(0);
  });

  it('409 and no delete when licensing agreements exist', async () => {
    handler = (call) =>
      call.table === 'course_licensing_agreements'
        ? { data: null, error: null, count: 2 }
        : { data: { id: COURSE_ID }, error: null };
    const res = await DELETE(jsonReq('DELETE', ''), ctx(COURSE_ID));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('has_licensing_agreements');
    expect(body.error).toMatch(/private/i);
    expect(callsFor('courses', 'delete')).toHaveLength(0);
  });

  it('deletes scoped to the scholar when there are no agreements', async () => {
    handler = (call) =>
      call.table === 'course_licensing_agreements'
        ? { data: null, error: null, count: 0 }
        : { data: { id: COURSE_ID }, error: null };
    const res = await DELETE(jsonReq('DELETE', ''), ctx(COURSE_ID));
    expect(res.status).toBe(200);
    const [del] = callsFor('courses', 'delete');
    expect(del.filters).toContainEqual(['eq', 'scholar_id', SCHOLAR_ID]);
  });

  it('maps the database trigger refusal (42501) to the same 409', async () => {
    handler = (call) => {
      if (call.table === 'course_licensing_agreements') return { data: null, error: null, count: 0 };
      if (call.op === 'delete') return { data: null, error: { code: '42501' } };
      return { data: { id: COURSE_ID }, error: null };
    };
    const res = await DELETE(jsonReq('DELETE', ''), ctx(COURSE_ID));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('has_licensing_agreements');
  });

  it('fails closed (500, no delete) when the licensing count errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    handler = (call) =>
      call.table === 'course_licensing_agreements'
        ? { data: null, error: { code: '42501' }, count: null }
        : { data: { id: COURSE_ID }, error: null };
    expect((await DELETE(jsonReq('DELETE', ''), ctx(COURSE_ID))).status).toBe(500);
    expect(callsFor('courses', 'delete')).toHaveLength(0);
  });
});
