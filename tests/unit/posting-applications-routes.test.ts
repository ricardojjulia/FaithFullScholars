import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Posting application routes (ADR 0027): authentication, input validation, the
 * SQLSTATE -> HTTP mapping, Retry-After, and that no request path reaches for the
 * service-role client or leaks a database message. The database rules themselves
 * are proven against real roles in tests/integration/posting-applications.test.ts.
 */

interface Identity {
  user: { id: string } | null;
  role?: string | null;
  scholarId?: string | null;
  institutionIds?: string[];
  failTable?: string | null;
}

let identity: Identity = { user: null };
let rpcResult: { data: unknown; error: { code?: string; message?: string } | null } = { data: null, error: null };
let tableResult: { data: unknown; error: { code?: string; message?: string } | null } = { data: [], error: null };
let singleResult: { data: unknown; error: { code?: string; message?: string } | null } = { data: null, error: null };
const rpcCalls: { fn: string; args: unknown }[] = [];
const ops: { table: string; op: string; payload?: unknown; options?: unknown; filters: [string, unknown][] }[] = [];
const adminClientSpy = vi.fn();

function fakeFrom(table: string) {
  const sessionTable = ['accounts', 'scholars', 'institution_users'].includes(table);
  const sessionResult = () => {
    if (identity.failTable === table) return { data: null, error: { code: '57014', message: 'canceling statement due to timeout' } };
    if (table === 'accounts') return { data: identity.role ? { role: identity.role } : null, error: null };
    if (table === 'scholars') return { data: identity.scholarId ? { id: identity.scholarId } : null, error: null };
    return { data: (identity.institutionIds ?? []).map((institution_id) => ({ institution_id })), error: null };
  };
  const filters: [string, unknown][] = [];
  const builder: Record<string, unknown> = {};
  const op = (name: string) => (payload?: unknown, options?: unknown) => {
    ops.push({ table, op: name, payload, options, filters });
    return builder;
  };
  builder.select = () => builder;
  builder.order = () => builder;
  builder.range = () => builder;
  builder.update = op('update');
  builder.upsert = op('upsert');
  for (const m of ['eq', 'in']) {
    builder[m] = (column: string, value: unknown) => {
      filters.push([`${m}:${column}`, value]);
      return builder;
    };
  }
  builder.maybeSingle = async () => (sessionTable ? sessionResult() : tableResult);
  builder.single = async () => singleResult;
  builder.then = (resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) =>
    Promise.resolve(sessionTable ? sessionResult() : tableResult).then(resolve, reject);
  return builder;
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: identity.user }, error: null }) },
    from: (table: string) => fakeFrom(table),
    rpc: async (fn: string, args: unknown) => {
      rpcCalls.push({ fn, args });
      return rpcResult;
    },
  }),
  createAdminClient: () => {
    adminClientSpy();
    throw new Error('Service-role client must not be used on this request path');
  },
}));

import { POST as expressInterest } from '@/app/api/postings/[id]/express-interest/route';
import { POST as withdraw } from '@/app/api/applications/[id]/withdraw/route';
import { PATCH as setStatus } from '@/app/api/institution/applications/[id]/status/route';
import { PUT as saveNote } from '@/app/api/institution/applications/[id]/notes/route';
import { GET as getContact } from '@/app/api/institution/applications/[id]/contact/route';
import { computeRetryAfterSeconds, mapSubmitError } from '@/lib/postings/applications-api';
import { covers } from '../support/covers';

covers(
  'api:POST /api/postings/[id]/express-interest',
  'api:POST /api/applications/[id]/withdraw',
  'api:PATCH /api/institution/applications/[id]/status',
  'api:PUT /api/institution/applications/[id]/notes',
  'api:GET /api/institution/applications/[id]/contact'
);

const ID = '33333333-3333-4333-8333-333333333333';
const SCHOLAR = 'f1000000-0000-0000-0000-00000000000a';
const INST = 'e1000000-0000-0000-0000-00000000000a';
const ctx = { params: Promise.resolve({ id: ID }) };
const badCtx = { params: Promise.resolve({ id: 'not-a-uuid' }) };

const req = (url: string, init?: { method?: string; body?: unknown; raw?: string }) =>
  new NextRequest(`http://localhost:3845${url}`, {
    method: init?.method ?? 'POST',
    body: init?.raw ?? (init?.body === undefined ? undefined : JSON.stringify(init.body)),
  });

const scholar = (): Identity => ({ user: { id: 'u-scholar' }, role: 'scholar', scholarId: SCHOLAR });
const member = (): Identity => ({ user: { id: 'u-member' }, role: 'institution_user', institutionIds: [INST] });
const NOTE = { coverNote: 'I would love to teach this course.' };

describe('posting application routes', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    identity = { user: null };
    rpcResult = { data: 'app-1', error: null };
    tableResult = { data: [], error: null };
    singleResult = { data: null, error: null };
    rpcCalls.length = 0;
    ops.length = 0;
    adminClientSpy.mockClear();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('POST /api/postings/[id]/express-interest', () => {
    const post = (body: unknown = NOTE, c = ctx) => expressInterest(req(`/api/postings/${ID}/express-interest`, { body }), c);

    it('rejects a malformed posting id before doing anything', async () => {
      identity = scholar();
      expect((await post(NOTE, badCtx)).status).toBe(400);
      expect(rpcCalls).toEqual([]);
    });

    it('answers 401 when signed out and 503 when the session lookup failed', async () => {
      expect((await post()).status).toBe(401);
      identity = { ...scholar(), failTable: 'scholars' };
      expect((await post()).status).toBe(503);
      expect(rpcCalls).toEqual([]);
    });

    it('rejects a missing, malformed, short or oversized note', async () => {
      identity = scholar();
      expect((await post({})).status).toBe(400);
      expect((await post({ coverNote: 42 })).status).toBe(400);
      expect((await post({ coverNote: ' abc ' })).status).toBe(400);
      expect((await post({ coverNote: 'x'.repeat(4001) })).status).toBe(400);
      expect((await expressInterest(req('/x', { raw: '{not json' }), ctx)).status).toBe(400);
      expect(rpcCalls).toEqual([]);
    });

    it('sends only the posting id and the trimmed note to the database function, and reports the new id', async () => {
      identity = scholar();
      const res = await post({ coverNote: '  I would love to teach this course.  ', status: 'under_review', institution_id: 'x', dossier_snapshot: {} });
      expect(res.status).toBe(201);
      expect(await res.json()).toMatchObject({ success: true, applicationId: 'app-1' });
      expect(rpcCalls).toEqual([
        { fn: 'submit_posting_application', args: { p_posting_id: ID, p_cover_note: 'I would love to teach this course.' } },
      ]);
      expect(ops).toEqual([]);
    });

    it.each([
      ['28000', 401],
      ['42501', 403],
      ['P0002', 404],
      ['23505', 409],
      ['22023', 400],
    ])('maps SQLSTATE %s to HTTP %i', async (code, status) => {
      identity = scholar();
      rpcResult = { data: null, error: { code, message: 'secret relation detail' } };
      const res = await post();
      expect(res.status).toBe(status);
      expect(JSON.stringify(await res.json())).not.toContain('secret relation detail');
    });

    it('answers 500 with a generic message for an unknown database error and never leaks it', async () => {
      identity = scholar();
      rpcResult = { data: null, error: { code: 'XX000', message: 'password authentication failed for user postgres' } };
      const res = await post();
      expect(res.status).toBe(500);
      expect(JSON.stringify(await res.json())).not.toContain('postgres');
      for (const call of errorSpy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain('password authentication');
      }
    });

    it('logs the SQLSTATE only', async () => {
      identity = scholar();
      rpcResult = { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "x"' } };
      await post();
      const logged = JSON.stringify(errorSpy.mock.calls);
      expect(logged).toContain('23505');
      expect(logged).not.toContain('duplicate key value');
    });

    it('answers 429 with Retry-After computed from the 20th newest of the caller\'s own applications', async () => {
      identity = scholar();
      rpcResult = { data: null, error: { code: 'FS429', message: 'x' } };
      const twentiethCreatedAt = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();
      tableResult = { data: [{ created_at: twentiethCreatedAt }], error: null };
      const res = await post();
      expect(res.status).toBe(429);
      const retryAfter = Number(res.headers.get('Retry-After'));
      expect(retryAfter).toBeGreaterThan(3500);
      expect(retryAfter).toBeLessThanOrEqual(3600);
    });

    it('falls back to 3600 seconds when the 20th row cannot be found', async () => {
      identity = scholar();
      rpcResult = { data: null, error: { code: 'FS429' } };
      tableResult = { data: [], error: null };
      expect((await post()).headers.get('Retry-After')).toBe('3600');
      tableResult = { data: null, error: { code: '57014' } };
      expect((await post()).headers.get('Retry-After')).toBe('3600');
    });

    it('never uses the service-role client', async () => {
      identity = scholar();
      await post();
      expect(adminClientSpy).not.toHaveBeenCalled();
    });
  });

  describe('computeRetryAfterSeconds', () => {
    const clientWith = (row: unknown, error: unknown = null) =>
      ({
        from: () => {
          const b: Record<string, unknown> = {};
          for (const m of ['select', 'eq', 'order', 'range']) b[m] = () => b;
          b.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: row, error }).then(resolve);
          return b;
        },
      }) as never;

    it('is the time until the 20th newest application leaves the 24-hour window', async () => {
      const now = Date.parse('2026-10-09T12:00:00Z');
      const secs = await computeRetryAfterSeconds(clientWith([{ created_at: '2026-10-08T14:00:00Z' }]), SCHOLAR, now);
      expect(secs).toBe(2 * 60 * 60);
    });

    it('is at least one second and at most a day', async () => {
      const now = Date.parse('2026-10-09T12:00:00Z');
      expect(await computeRetryAfterSeconds(clientWith([{ created_at: '2026-10-01T00:00:00Z' }]), SCHOLAR, now)).toBe(1);
      expect(await computeRetryAfterSeconds(clientWith([{ created_at: '2026-10-09T12:00:00Z' }]), SCHOLAR, now)).toBe(86400);
    });

    it('falls back to 3600 without a scholar, a row, or on error', async () => {
      expect(await computeRetryAfterSeconds(clientWith([]), null)).toBe(3600);
      expect(await computeRetryAfterSeconds(clientWith([]), SCHOLAR)).toBe(3600);
      expect(await computeRetryAfterSeconds(clientWith(null, { code: 'x' }), SCHOLAR)).toBe(3600);
    });

    it('maps the documented codes', () => {
      expect(mapSubmitError({ code: 'FS429' }).status).toBe(429);
      expect(mapSubmitError(null).status).toBe(500);
    });
  });

  describe('POST /api/applications/[id]/withdraw', () => {
    const call = (c = ctx) => withdraw(req(`/api/applications/${ID}/withdraw`), c);

    it('validates the id and the caller', async () => {
      expect((await call(badCtx)).status).toBe(400);
      expect((await call()).status).toBe(401);
      identity = { ...scholar(), failTable: 'accounts' };
      expect((await call()).status).toBe(503);
      identity = member();
      expect((await call()).status).toBe(403);
    });

    it('withdraws only the caller\'s own application, and sends only the status', async () => {
      identity = scholar();
      tableResult = { data: [{ id: ID, status: 'withdrawn' }], error: null };
      const res = await call();
      expect(res.status).toBe(200);
      expect(ops).toHaveLength(1);
      expect(ops[0]).toMatchObject({ table: 'posting_applications', op: 'update', payload: { status: 'withdrawn' } });
      expect(ops[0].filters).toContainEqual(['eq:id', ID]);
      expect(ops[0].filters).toContainEqual(['eq:scholar_id', SCHOLAR]);
    });

    it('answers 404 when RLS or the scholar filter matches nothing', async () => {
      identity = scholar();
      tableResult = { data: [], error: null };
      expect((await call()).status).toBe(404);
    });

    it('answers 409 when the guard refuses (already declined) and hides the database message', async () => {
      identity = scholar();
      tableResult = { data: null, error: { code: '42501', message: 'Unauthorized: a withdrawn or declined application cannot change status' } };
      const res = await call();
      expect(res.status).toBe(409);
      expect(JSON.stringify(await res.json())).not.toContain('Unauthorized:');
    });

    it('never uses the service-role client', async () => {
      identity = scholar();
      await call();
      expect(adminClientSpy).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /api/institution/applications/[id]/status', () => {
    const call = (body: unknown, c = ctx) => setStatus(req(`/api/institution/applications/${ID}/status`, { method: 'PATCH', body }), c);

    it('requires a signed-in institution member', async () => {
      expect((await call({ status: 'under_review' })).status).toBe(401);
      identity = scholar();
      expect((await call({ status: 'under_review' })).status).toBe(403);
      identity = { ...member(), failTable: 'institution_users' };
      expect((await call({ status: 'under_review' })).status).toBe(503);
      expect(ops).toEqual([]);
    });

    it('accepts only under_review, interview_scheduled or declined', async () => {
      identity = member();
      for (const status of ['withdrawn', 'submitted', 'accepted', '', 7, undefined]) {
        expect((await call({ status })).status).toBe(400);
      }
      expect((await call(null)).status).toBe(400);
      expect((await call({ status: 'under_review' }, badCtx)).status).toBe(400);
      expect(ops).toEqual([]);
    });

    it('scopes the update to the member\'s institutions', async () => {
      identity = member();
      tableResult = { data: [{ id: ID, status: 'under_review', status_changed_at: '2026-10-09T00:00:00Z' }], error: null };
      const res = await call({ status: 'under_review' });
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ status: 'under_review' });
      expect(ops[0]).toMatchObject({ table: 'posting_applications', op: 'update', payload: { status: 'under_review' } });
      expect(ops[0].filters).toContainEqual(['in:institution_id', [INST]]);
    });

    it('answers 404 when nothing matched and 409 when the guard refused', async () => {
      identity = member();
      tableResult = { data: [], error: null };
      expect((await call({ status: 'declined' })).status).toBe(404);
      tableResult = { data: null, error: { code: '42501', message: 'Unauthorized: invalid application status transition' } };
      const res = await call({ status: 'interview_scheduled' });
      expect(res.status).toBe(409);
      expect(JSON.stringify(await res.json())).not.toContain('Unauthorized:');
    });

    it('never uses the service-role client', async () => {
      identity = member();
      await call({ status: 'under_review' });
      expect(adminClientSpy).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/institution/applications/[id]/notes', () => {
    const call = (body: unknown, c = ctx) => saveNote(req(`/api/institution/applications/${ID}/notes`, { method: 'PUT', body }), c);

    it('requires an institution member and a valid body', async () => {
      expect((await call({ body: 'x' })).status).toBe(401);
      identity = scholar();
      expect((await call({ body: 'x' })).status).toBe(403);
      identity = member();
      expect((await call({ body: 7 })).status).toBe(400);
      expect((await call({ body: 'x'.repeat(4001) })).status).toBe(400);
      expect((await call({ body: 'ok' }, badCtx)).status).toBe(400);
      expect(ops).toEqual([]);
    });

    it('upserts one note per application on application_id and sends no institution or author', async () => {
      identity = member();
      singleResult = { data: { body: 'Strong candidate', updated_at: '2026-10-09T00:00:00Z' }, error: null };
      const res = await call({ body: 'Strong candidate', institution_id: 'forged', updated_by: 'forged' });
      expect(res.status).toBe(200);
      expect(ops[0]).toMatchObject({
        table: 'posting_application_notes',
        op: 'upsert',
        payload: { application_id: ID, body: 'Strong candidate' },
        options: { onConflict: 'application_id' },
      });
    });

    it('answers 404 (not 403) when the database refuses, so existence is not revealed', async () => {
      identity = member();
      singleResult = { data: null, error: { code: '42501', message: 'Unauthorized: application not found' } };
      expect((await call({ body: 'x' })).status).toBe(404);
    });
  });

  describe('GET /api/institution/applications/[id]/contact', () => {
    const call = (c = ctx) => getContact(req(`/api/institution/applications/${ID}/contact`, { method: 'GET' }), c);

    it('is never cacheable, whatever the outcome', async () => {
      for (const setup of [
        () => {
          identity = { user: null };
        },
        () => {
          identity = scholar();
        },
        () => {
          identity = member();
          rpcResult = { data: null, error: null };
        },
        () => {
          identity = member();
          rpcResult = { data: 'dr@example.org', error: null };
        },
        () => {
          identity = member();
          rpcResult = { data: null, error: { code: 'XX000', message: 'boom' } };
        },
      ]) {
        setup();
        expect((await call()).headers.get('Cache-Control')).toBe('no-store');
      }
      expect((await call(badCtx)).headers.get('Cache-Control')).toBe('no-store');
    });

    it('returns the email only when the database function releases it', async () => {
      identity = member();
      rpcResult = { data: 'dr@example.org', error: null };
      const res = await call();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ email: 'dr@example.org' });
      expect(rpcCalls).toEqual([{ fn: 'get_application_contact', args: { p_application_id: ID } }]);
    });

    it('answers 404 when the function returns nothing (wrong stage, wrong institution, or the applicant)', async () => {
      identity = member();
      rpcResult = { data: null, error: null };
      expect((await call()).status).toBe(404);
    });

    it('requires a signed-in member and never uses the service-role client', async () => {
      expect((await call()).status).toBe(401);
      identity = scholar();
      expect((await call()).status).toBe(403);
      expect(rpcCalls).toEqual([]);
      expect(adminClientSpy).not.toHaveBeenCalled();
    });
  });

  it('references the service-role client nowhere in the application code paths', () => {
    const root = path.resolve(import.meta.dirname, '../..');
    const files = [
      'app/api/postings/[id]/express-interest/route.ts',
      'app/api/applications/[id]/withdraw/route.ts',
      'app/api/institution/applications/[id]/status/route.ts',
      'app/api/institution/applications/[id]/notes/route.ts',
      'app/api/institution/applications/[id]/contact/route.ts',
      'app/dashboard/applications/page.tsx',
      'app/opportunities/[slug]/page.tsx',
      'app/(institution)/institution/postings/[id]/applicants/page.tsx',
      ...readdirSync(path.join(root, 'lib/postings')).map((f) => `lib/postings/${f}`),
    ];
    for (const file of files) {
      // postings-service.ts predates this slice and is not an application path.
      if (file.endsWith('postings-service.ts')) continue;
      expect(readFileSync(path.join(root, file), 'utf8'), file).not.toMatch(/createAdminClient/);
    }
  });
});
