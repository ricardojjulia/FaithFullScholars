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
}

let identity: FakeIdentity = { user: null };
const adminClientSpy = vi.fn();

function resultFor(table: string) {
  switch (table) {
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
        data: (identity.institutionIds ?? []).map((institution_id) => ({ institution_id })),
        error: null,
      };
    default:
      return { data: null, error: null };
  }
}

function fakeQuery(table: string) {
  const result = resultFor(table);
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order', 'limit']) {
    builder[method] = () => builder;
  }
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
import { GET as getSavedScholars, POST as postSavedScholar } from '@/app/api/institution/saved-scholars/route';
import { GET as getSavedCourses } from '@/app/api/institution/saved-courses/route';
import { GET as exportShortlist } from '@/app/api/institution/saved-scholars/export/route';
import { POST as createPosting } from '@/app/api/postings/route';
import { POST as issueEndorsement } from '@/app/api/institution/endorsements/route';
import { POST as expressInterest } from '@/app/api/postings/[id]/express-interest/route';
import { GET as listReviews } from '@/app/api/admin/reviews/route';

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
    };

    it('rejects anonymous callers with 401', () => {
      expect(resolveInstitutionAccess(null, INST_A)).toMatchObject({ ok: false, status: 401 });
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
