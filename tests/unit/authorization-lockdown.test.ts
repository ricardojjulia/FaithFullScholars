import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Authorization lockdown: identity comes from the verified session and role /
 * tenancy from database rows — never from request parameters, hardcoded
 * fallback ids, user-editable auth metadata, or environment toggles.
 */

interface FakeIdentity {
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null;
  accountRole?: string | null;
  scholarId?: string | null;
  institutionIds?: string[];
  /** institution_users.role for the caller's memberships (default owner). */
  institutionRole?: string;
}

let identity: FakeIdentity = { user: null };
// Rows the fake `saved_*` DELETE ... RETURNING reports as removed (empty = nothing matched).
let deletedRows: { id: string }[] = [];
const deleteCalls: { table: string; filters: [string, unknown][] }[] = [];
// UPDATEs issued by the fake client, and the rows an UPDATE ... RETURNING reports (empty = RLS matched nothing).
const updateCalls: { table: string; values: Record<string, unknown>; filters: [string, unknown][] }[] = [];
let updatedRows: { id: string }[] = [{ id: 'row-1' }];
let failTable: string | null = null;
const adminClientSpy = vi.fn();

function resultFor(table: string) {
  if (failTable === table) return { data: null, error: { code: '57014', message: 'timeout detail' } };
  switch (table) {
    case 'institutions':
      return { data: updatedRows, error: null };
    case 'accounts':
      return { data: identity.accountRole ? { role: identity.accountRole } : null, error: null };
    case 'scholars':
      return { data: identity.scholarId ? { id: identity.scholarId } : null, error: null };
    case 'institution_postings':
      return {
        data: { id: 'p1', title: 'Adjunct NT', institution_id: 'inst-x', status: 'published' },
        error: null,
      };
    case 'institution_users':
      return {
        data: (identity.institutionIds ?? []).map((institution_id) => ({
          institution_id,
          role: identity.institutionRole ?? 'owner',
        })),
        error: null,
      };
    case 'saved_scholars':
    case 'saved_courses':
      return { data: deletedRows, error: null };
    default:
      return { data: null, error: null };
  }
}

function fakeQuery(table: string) {
  const result = resultFor(table);
  const builder: Record<string, unknown> = {};
  const filters: [string, unknown][] = [];
  for (const method of ['select', 'order', 'limit', 'in']) {
    builder[method] = () => builder;
  }
  builder.eq = (column: string, value: unknown) => {
    filters.push([column, value]);
    return builder;
  };
  builder.delete = () => {
    deleteCalls.push({ table, filters });
    return builder;
  };
  builder.update = (values: Record<string, unknown>) => {
    updateCalls.push({ table, values, filters });
    return builder;
  };
  builder.maybeSingle = async () => result;
  builder.single = async () => result;
  builder.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: identity.user }, error: null }),
    },
    from: (table: string) => fakeQuery(table),
  }),
  createAdminClient: () => {
    adminClientSpy();
    throw new Error('Service-role client must not be used on this request path');
  },
}));

vi.mock('@/lib/inquiries/queries', () => ({
  fetchScholarInquiries: vi.fn(async () => []),
  fetchInstitutionInquiries: vi.fn(async () => []),
  fetchSavedScholars: vi.fn(async () => []),
  fetchSavedCourses: vi.fn(async () => []),
}));

vi.mock('@/lib/inquiries/export-dossier', () => ({
  fetchShortlistDossier: vi.fn(async () => ({ candidates: [] })),
  generateShortlistCsv: vi.fn(() => ''),
}));

import { resolveInstitutionAccess, type SessionContext } from '@/lib/auth/session';
import { verifyStaffUser } from '@/lib/feedback/auth';
import * as inquiryQueries from '@/lib/inquiries/queries';
import { GET as getInquiries, POST as postInquiry } from '@/app/api/inquiries/route';
import { PATCH as patchInquiry } from '@/app/api/inquiries/[id]/route';
import {
  GET as getSavedScholars,
  POST as postSavedScholar,
  DELETE as deleteSavedScholar,
} from '@/app/api/institution/saved-scholars/route';
import { GET as getSavedCourses, DELETE as deleteSavedCourse } from '@/app/api/institution/saved-courses/route';
import { PATCH as patchInstitutionProfile } from '@/app/api/institution/profile/route';
import { GET as exportShortlist } from '@/app/api/institution/saved-scholars/export/route';
import { POST as createPosting } from '@/app/api/postings/route';
import { POST as issueEndorsement } from '@/app/api/institution/endorsements/route';
import { POST as expressInterest } from '@/app/api/postings/[id]/express-interest/route';
import { GET as listReviews } from '@/app/api/admin/reviews/route';
import { covers } from '../support/covers';

covers(
  'api:GET /api/inquiries',
  'api:POST /api/inquiries',
  'api:PATCH /api/inquiries/[id]',
  'api:GET /api/institution/saved-scholars',
  'api:POST /api/institution/saved-scholars',
  'api:GET /api/institution/saved-courses',
  'api:DELETE /api/institution/saved-scholars',
  'api:DELETE /api/institution/saved-courses',
  'api:GET /api/institution/saved-scholars/export',
  'api:PATCH /api/institution/profile',
  'api:POST /api/postings',
  'api:POST /api/institution/endorsements',
  'api:POST /api/postings/[id]/express-interest',
  'api:GET /api/admin/reviews'
);

const SCHOLAR_A = 'f1000000-0000-0000-0000-00000000000a';
const SCHOLAR_B = 'f1000000-0000-0000-0000-00000000000b';
const INST_A = 'e1000000-0000-0000-0000-00000000000a';
const INST_B = 'e1000000-0000-0000-0000-00000000000b';

const req = (url: string, init?: { method?: string; body?: unknown }) =>
  new NextRequest(`http://localhost:3845${url}`, {
    method: init?.method ?? 'GET',
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });

const anonymous = (): FakeIdentity => ({ user: null });
const scholarA = (): FakeIdentity => ({
  user: { id: 'a-scholar' },
  accountRole: 'scholar',
  scholarId: SCHOLAR_A,
});
const institutionAUser = (): FakeIdentity => ({
  user: { id: 'a-inst' },
  accountRole: 'institution_user',
  institutionIds: [INST_A],
});

describe('Authorization lockdown', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    identity = anonymous();
    adminClientSpy.mockClear();
    deletedRows = [];
    deleteCalls.length = 0;
    updateCalls.length = 0;
    updatedRows = [{ id: 'row-1' }];
    failTable = null;
    vi.mocked(inquiryQueries.fetchScholarInquiries).mockClear();
    vi.mocked(inquiryQueries.fetchInstitutionInquiries).mockClear();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('resolveInstitutionAccess', () => {
    const session: SessionContext = {
      userId: 'u1',
      role: 'institution_user',
      scholarId: null,
      institutionIds: [INST_A],
      institutionRoles: { [INST_A]: 'owner' },
      lookupFailed: false,
    };

    it('rejects anonymous callers with 401', () => {
      expect(resolveInstitutionAccess(null, INST_A)).toMatchObject({ ok: false, status: 401 });
    });

    it('answers 503 (not 403) when the membership lookup itself failed', () => {
      expect(
        resolveInstitutionAccess({ ...session, institutionIds: [], lookupFailed: true }, INST_A)
      ).toMatchObject({ ok: false, status: 503 });
    });

    it('rejects a requested institution the caller does not belong to', () => {
      expect(resolveInstitutionAccess(session, INST_B)).toMatchObject({ ok: false, status: 403 });
    });

    it('defaults to the caller’s own membership when none is requested', () => {
      expect(resolveInstitutionAccess(session, null)).toEqual({ ok: true, institutionId: INST_A });
    });

    it('rejects signed-in users without any institution membership', () => {
      expect(
        resolveInstitutionAccess({ ...session, institutionIds: [] }, null)
      ).toMatchObject({ ok: false, status: 403 });
    });
  });

  describe('verifyStaffUser', () => {
    it('ignores a self-assigned user_metadata admin role', async () => {
      identity = {
        user: { id: 'attacker', user_metadata: { role: 'admin' } },
        accountRole: 'scholar',
      };
      const result = await verifyStaffUser();
      expect(result.authorized).toBe(false);
      expect(result.status).toBe(403);
    });

    it('authorizes only when public.accounts.role is admin', async () => {
      identity = { user: { id: 'staff' }, accountRole: 'admin' };
      const result = await verifyStaffUser();
      expect(result.authorized).toBe(true);
      expect(result.user?.id).toBe('staff');
    });

    it('denies anonymous callers', async () => {
      expect((await verifyStaffUser()).status).toBe(401);
    });
  });

  describe('admin routes have no environment bypass', () => {
    it('returns 401 for anonymous callers even with NODE_ENV=development and ENABLE_DEV_ROUTES=true', async () => {
      process.env = { ...process.env, NODE_ENV: 'development', ENABLE_DEV_ROUTES: 'true' };
      const res = await listReviews(req('/api/admin/reviews'));
      expect(res.status).toBe(401);
    });
  });

  describe('inquiries API', () => {
    it('denies anonymous reads of any scholar inbox', async () => {
      const res = await getInquiries(req(`/api/inquiries?scholarId=${SCHOLAR_A}`));
      expect(res.status).toBe(401);
      expect(inquiryQueries.fetchScholarInquiries).not.toHaveBeenCalled();
    });

    it('denies a scholar reading another scholar’s inbox', async () => {
      identity = scholarA();
      const res = await getInquiries(req(`/api/inquiries?scholarId=${SCHOLAR_B}`));
      expect(res.status).toBe(403);
      expect(inquiryQueries.fetchScholarInquiries).not.toHaveBeenCalled();
    });

    it('serves a scholar only their own inbox, from the session', async () => {
      identity = scholarA();
      const res = await getInquiries(req('/api/inquiries'));
      expect(res.status).toBe(200);
      expect(inquiryQueries.fetchScholarInquiries).toHaveBeenCalledWith(expect.anything(), SCHOLAR_A, 'all');
    });

    it('denies an institution reading another institution’s outbox', async () => {
      identity = institutionAUser();
      const res = await getInquiries(req(`/api/inquiries?institutionId=${INST_B}`));
      expect(res.status).toBe(403);
      expect(inquiryQueries.fetchInstitutionInquiries).not.toHaveBeenCalled();
    });

    it('denies anonymous inquiry submission', async () => {
      const res = await postInquiry(
        req('/api/inquiries', { method: 'POST', body: { institution_id: INST_A, scholar_id: SCHOLAR_A } })
      );
      expect(res.status).toBe(401);
    });

    it('denies sending on behalf of an institution the caller does not belong to', async () => {
      identity = institutionAUser();
      const res = await postInquiry(
        req('/api/inquiries', { method: 'POST', body: { institution_id: INST_B, scholar_id: SCHOLAR_A } })
      );
      expect(res.status).toBe(403);
    });

    it('denies anonymous status changes', async () => {
      const res = await patchInquiry(req('/api/inquiries/x', { method: 'PATCH', body: { status: 'archived' } }), {
        params: Promise.resolve({ id: 'x' }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe('institution shortlist & export', () => {
    it('denies anonymous shortlist reads, writes, and CSV export', async () => {
      expect((await getSavedScholars(req(`/api/institution/saved-scholars?institutionId=${INST_A}`))).status).toBe(401);
      expect((await getSavedCourses(req(`/api/institution/saved-courses?institutionId=${INST_A}`))).status).toBe(401);
      expect(
        (await postSavedScholar(req('/api/institution/saved-scholars', { method: 'POST', body: { scholarId: SCHOLAR_A } }))).status
      ).toBe(401);
      expect((await exportShortlist(req('/api/institution/saved-scholars/export?format=csv'))).status).toBe(401);
    });

    it('denies cross-institution shortlist access', async () => {
      identity = institutionAUser();
      expect((await getSavedScholars(req(`/api/institution/saved-scholars?institutionId=${INST_B}`))).status).toBe(403);
      expect((await exportShortlist(req(`/api/institution/saved-scholars/export?institutionId=${INST_B}`))).status).toBe(403);
    });

    it('scholars without institution membership cannot use the shortlist', async () => {
      identity = scholarA();
      expect((await getSavedScholars(req('/api/institution/saved-scholars'))).status).toBe(403);
    });
  });

  describe('shortlist removal (DELETE)', () => {
    const SCHOLAR_ID = 'f1000000-0000-0000-0000-000000000001';
    const COURSE_ID = 'c1000000-0000-0000-0000-000000000001';
    const cases = [
      { name: 'saved-scholars', param: 'scholarId', id: SCHOLAR_ID, table: 'saved_scholars', column: 'scholar_id', handler: deleteSavedScholar },
      { name: 'saved-courses', param: 'courseId', id: COURSE_ID, table: 'saved_courses', column: 'course_id', handler: deleteSavedCourse },
    ] as const;

    describe.each(cases)('DELETE /api/institution/$name', ({ name, param, id, table, column, handler }) => {
      const url = (query: string) => `/api/institution/${name}?${query}`;
      const call = (query: string) => handler(req(url(query), { method: 'DELETE' }));

      it('returns 401 when signed out and deletes nothing', async () => {
        expect((await call(`${param}=${id}`)).status).toBe(401);
        expect(deleteCalls).toHaveLength(0);
      });

      it('returns 403 for a user without an institution and for a foreign institution', async () => {
        identity = scholarA();
        expect((await call(`${param}=${id}`)).status).toBe(403);
        identity = institutionAUser();
        expect((await call(`${param}=${id}&institutionId=${INST_B}`)).status).toBe(403);
        expect(deleteCalls).toHaveLength(0);
      });

      it('returns 400 for a missing or non-UUID id and deletes nothing', async () => {
        identity = institutionAUser();
        for (const q of ['', `${param}=`, `${param}=not-a-uuid`, `${param}=1' OR '1'='1`, `${param}=${id}x`]) {
          expect((await call(q)).status, q).toBe(400);
        }
        expect(deleteCalls).toHaveLength(0);
      });

      it('deletes within the session institution and reports removed:true', async () => {
        identity = institutionAUser();
        deletedRows = [{ id: 'row-1' }];
        const res = await call(`${param}=${id}`);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true, removed: true });
        expect(deleteCalls).toEqual([
          { table, filters: [['institution_id', INST_A], [column, id]] },
        ]);
      });

      it('is idempotent: a second call finds nothing and returns removed:false', async () => {
        identity = institutionAUser();
        deletedRows = [];
        const res = await call(`${param}=${id}`);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: true, removed: false });
      });

      it('never uses the service-role client', async () => {
        identity = institutionAUser();
        await call(`${param}=${id}`);
        expect(adminClientSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('institution profile (PATCH)', () => {
    const patch = (body: unknown) =>
      patchInstitutionProfile(req('/api/institution/profile', { method: 'PATCH', body }));

    it('returns 401 when signed out and 403 for non-members, updating nothing', async () => {
      expect((await patch({ name: 'X' })).status).toBe(401);
      identity = scholarA();
      expect((await patch({ name: 'X' })).status).toBe(403);
      expect(updateCalls).toHaveLength(0);
    });

    it.each(['recruiter', 'member'])('returns 403 early for a %s and never issues an UPDATE', async (institutionRole) => {
      identity = { ...institutionAUser(), institutionRole };
      const res = await patch({ name: 'Renamed' });
      expect(res.status).toBe(403);
      expect(updateCalls).toHaveLength(0);
      expect(adminClientSpy).not.toHaveBeenCalled();
    });

    it('returns 403 when the membership role is missing (fail closed)', async () => {
      identity = { ...institutionAUser(), institutionRole: '' };
      expect((await patch({ name: 'Renamed' })).status).toBe(403);
      expect(updateCalls).toHaveLength(0);
    });

    it.each(['owner', 'admin'])('lets an institution %s through to the update', async (institutionRole) => {
      identity = { ...institutionAUser(), institutionRole };
      expect((await patch({ name: 'Renamed' })).status).toBe(200);
      expect(updateCalls).toHaveLength(1);
    });

    it('returns 503 (not 403/404) when the membership lookup itself fails', async () => {
      identity = institutionAUser();
      failTable = 'institution_users';
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect((await patch({ name: 'X' })).status).toBe(503);
      expect(updateCalls).toHaveLength(0);
      expect(JSON.stringify(spy.mock.calls)).not.toContain('timeout detail');
      spy.mockRestore();
    });

    it('updates only the session institution and ignores a client-supplied institution id', async () => {
      identity = institutionAUser();
      const res = await patch({ name: ' Renamed Seminary ', website: 'https://example.edu', institutionId: INST_B, id: INST_B });
      expect(res.status).toBe(200);
      expect(updateCalls).toHaveLength(1);
      expect(updateCalls[0].table).toBe('institutions');
      expect(updateCalls[0].filters).toEqual([['id', INST_A]]);
      expect(updateCalls[0].values).toMatchObject({ name: 'Renamed Seminary', website: 'https://example.edu' });
      expect(adminClientSpy).not.toHaveBeenCalled();
    });

    it('never writes trust columns even when the client sends them', async () => {
      identity = institutionAUser();
      await patch({
        name: 'Renamed',
        status: 'approved',
        slug: 'taken-slug',
        accreditation_body: 'ATS',
        accreditation_status: 'accredited',
        accreditation_verified_at: '2026-10-01T00:00:00Z',
      });
      const written = Object.keys(updateCalls[0].values).sort();
      expect(written).toEqual(['name', 'updated_at']);
    });

    it('rejects a body with only trust columns / unknown keys with 400 and writes nothing', async () => {
      identity = institutionAUser();
      const res = await patch({ status: 'approved', slug: 'x', institutionId: INST_B });
      expect(res.status).toBe(400);
      expect(updateCalls).toHaveLength(0);
    });

    it('rejects invalid input with 400 and field errors, updating nothing', async () => {
      identity = institutionAUser();
      const res = await patch({ name: '', website: 'javascript:alert(1)', contact_email: 'nope', institution_type: 'x' });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(Object.keys(body.errors).sort()).toEqual(['contact_email', 'institution_type', 'name', 'website']);
      expect(updateCalls).toHaveLength(0);
    });

    it('reports failure, not success, when RLS matched no row', async () => {
      identity = institutionAUser();
      updatedRows = [];
      expect((await patch({ name: 'Renamed' })).status).toBe(403);
    });

    it('does not leak database detail when the update errors', async () => {
      identity = institutionAUser();
      failTable = 'institutions';
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const res = await patch({ name: 'Renamed' });
      expect(res.status).toBe(500);
      expect(JSON.stringify(await res.json())).not.toContain('timeout detail');
      expect(JSON.stringify(spy.mock.calls)).not.toContain('timeout detail');
      spy.mockRestore();
    });
  });

  describe('postings & institutional endorsements', () => {
    it('no longer fall back to a hardcoded institution for anonymous callers', async () => {
      const posting = await createPosting(
        req('/api/postings', { method: 'POST', body: { title: 'T', term: 'Fall', description: 'D' } })
      );
      expect(posting.status).toBe(401);

      const endorsement = await issueEndorsement(
        req('/api/institution/endorsements', {
          method: 'POST',
          body: { scholarId: SCHOLAR_A, relationshipType: 'Current Faculty', departmentOrField: 'NT', endorsementText: 'x' },
        })
      );
      expect(endorsement.status).toBe(401);
    });
  });

  describe('express interest', () => {
    it('requires a signed-in scholar and never reports a simulated success', async () => {
      const ctx = { params: Promise.resolve({ id: 'p1' }) };
      const body = { coverNote: 'Interested in this adjunct post.' };

      expect((await expressInterest(req('/api/postings/p1/express-interest', { method: 'POST', body }), ctx)).status).toBe(401);

      identity = institutionAUser();
      expect((await expressInterest(req('/api/postings/p1/express-interest', { method: 'POST', body }), ctx)).status).toBe(403);
    });
  });

  it('never reaches for the service-role client on these request paths', () => {
    expect(adminClientSpy).not.toHaveBeenCalled();
  });
});
