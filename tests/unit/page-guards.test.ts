import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Page-level guards. Next.js renders layouts and pages in parallel, so a layout
 * check does not stop a page from fetching data into the RSC payload. These
 * tests prove protected pages stop *before* their data loaders run.
 */

const NOT_FOUND = 'NEXT_NOT_FOUND';
const REDIRECT = 'NEXT_REDIRECT';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error(NOT_FOUND);
  },
  redirect: (url: string) => {
    throw new Error(`${REDIRECT}:${url}`);
  },
}));

let identity: { userId: string | null; role?: string; institutionIds?: string[] } = { userId: null };

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: identity.userId ? { id: identity.userId } : null },
        error: null,
      }),
    },
    from: (table: string) => {
      const result =
        table === 'accounts'
          ? { data: identity.role ? { role: identity.role } : null, error: null }
          : table === 'institution_users'
            ? { data: (identity.institutionIds ?? []).map((institution_id) => ({ institution_id })), error: null }
            : { data: null, error: null };
      const builder: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'order', 'limit']) builder[m] = () => builder;
      builder.maybeSingle = async () => result;
      builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
      return builder;
    },
  }),
  createAdminClient: () => {
    throw new Error('Service-role client reached before the guard');
  },
}));

const { fetchPendingRevisions, getPostingApplicantReport } = vi.hoisted(() => ({
  fetchPendingRevisions: vi.fn(async () => []),
  getPostingApplicantReport: vi.fn(async () => null),
}));

vi.mock('@/lib/admin/queries', () => ({
  fetchPendingRevisions,
  fetchRevisionWithBaseline: vi.fn(async () => null),
  fetchReviewAuditHistory: vi.fn(async () => []),
  fetchPendingInstitutions: vi.fn(async () => []),
  fetchContentReports: vi.fn(async () => []),
}));

vi.mock('@/lib/postings/applicant-service', () => ({ getPostingApplicantReport }));

import { requireInstitutionMember, requireSignedIn, requireStaffPage } from '@/lib/auth/guards';
import AdminReviewsPage from '@/app/(admin)/admin/reviews/page';
import PostingApplicantsPage from '@/app/(institution)/institution/postings/[id]/applicants/page';

describe('page-level authorization guards', () => {
  beforeEach(() => {
    identity = { userId: null };
    fetchPendingRevisions.mockClear();
    getPostingApplicantReport.mockClear();
  });

  it('requireStaffPage 404s anonymous and non-admin callers', async () => {
    await expect(requireStaffPage()).rejects.toThrow(NOT_FOUND);
    identity = { userId: 'u1', role: 'scholar' };
    await expect(requireStaffPage()).rejects.toThrow(NOT_FOUND);
  });

  it('requireStaffPage admits accounts.role = admin', async () => {
    identity = { userId: 'staff', role: 'admin' };
    await expect(requireStaffPage()).resolves.toBeUndefined();
  });

  it('requireInstitutionMember redirects anonymous visitors to /login and 404s non-members', async () => {
    await expect(requireInstitutionMember()).rejects.toThrow(`${REDIRECT}:/login`);
    identity = { userId: 'u1', role: 'scholar', institutionIds: [] };
    await expect(requireInstitutionMember()).rejects.toThrow(NOT_FOUND);
  });

  it('requireSignedIn redirects anonymous visitors to /login', async () => {
    await expect(requireSignedIn()).rejects.toThrow(`${REDIRECT}:/login`);
  });

  it('admin review queue does not load revisions for anonymous visitors', async () => {
    await expect(
      AdminReviewsPage({ searchParams: Promise.resolve({}) })
    ).rejects.toThrow(NOT_FOUND);
    expect(fetchPendingRevisions).not.toHaveBeenCalled();
  });

  it('posting applicants page does not load applicants for anonymous visitors', async () => {
    await expect(
      PostingApplicantsPage({ params: Promise.resolve({ id: 'posting-1' }) })
    ).rejects.toThrow(`${REDIRECT}:/login`);
    expect(getPostingApplicantReport).not.toHaveBeenCalled();
  });
});
