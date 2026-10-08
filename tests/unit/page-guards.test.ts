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

let identity: {
  userId: string | null;
  role?: string;
  institutionIds?: string[];
  /** institution_users.role for the caller's memberships (default owner). */
  institutionRole?: string;
  scholarId?: string;
  /** Tables whose session lookup fails (a database blip). */
  failTables?: string[];
} = {
  userId: null,
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: identity.userId ? { id: identity.userId } : null },
        error: null,
      }),
    },
    from: (table: string) => {
      const failed = identity.failTables?.includes(table);
      const result = failed
        ? { data: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } }
        : table === 'accounts'
          ? { data: identity.role ? { role: identity.role } : null, error: null }
          : table === 'institution_users'
            ? { data: (identity.institutionIds ?? []).map((institution_id) => ({ institution_id, role: identity.institutionRole ?? 'owner' })), error: null }
            : table === 'scholars'
              ? { data: identity.scholarId ? { id: identity.scholarId } : null, error: null }
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

// Portal data loaders: spied so the tests can prove no fetch runs before a guard
// passes, and which institution / scholar a fetch is scoped to. PortalQueryError
// stays real so the pages' error handling is exercised.
const portal = vi.hoisted(() => ({
  fetchInstitutionProfileOrThrow: vi.fn(),
  fetchInstitutionStats: vi.fn(),
  fetchInstitutionProfileForEdit: vi.fn(),
  fetchSavedScholarsOrThrow: vi.fn(),
  fetchSavedCoursesOrThrow: vi.fn(),
  fetchInstitutionInquiriesOrThrow: vi.fn(),
  fetchScholarInquiriesOrThrow: vi.fn(),
  fetchScholarDashboardSummary: vi.fn(),
}));

vi.mock('@/lib/inquiries/queries', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/inquiries/queries')>()),
  fetchInstitutionProfileOrThrow: portal.fetchInstitutionProfileOrThrow,
  fetchInstitutionStats: portal.fetchInstitutionStats,
  fetchInstitutionProfileForEdit: portal.fetchInstitutionProfileForEdit,
  fetchSavedScholarsOrThrow: portal.fetchSavedScholarsOrThrow,
  fetchSavedCoursesOrThrow: portal.fetchSavedCoursesOrThrow,
  fetchInstitutionInquiriesOrThrow: portal.fetchInstitutionInquiriesOrThrow,
  fetchScholarInquiriesOrThrow: portal.fetchScholarInquiriesOrThrow,
}));

vi.mock('@/lib/profiles/dashboard-summary', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/profiles/dashboard-summary')>()),
  fetchScholarDashboardSummary: portal.fetchScholarDashboardSummary,
}));

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { requireInstitutionMember, requireSignedIn, requireStaffPage } from '@/lib/auth/guards';
import { SessionLookupError } from '@/lib/auth/session';
import { PortalQueryError } from '@/lib/inquiries/queries';
import InstitutionHomePage from '@/app/(institution)/institution/page';
import InstitutionSavedPage from '@/app/(institution)/institution/saved/page';
import InstitutionProfilePage from '@/app/(institution)/institution/profile/page';
import InstitutionOutreachPage from '@/app/(institution)/institution/inquiries/page';
import InstitutionConferencesPage from '@/app/(institution)/institution/conferences/page';
import DashboardPage from '@/app/dashboard/page';
import ScholarInquiriesPage from '@/app/dashboard/inquiries/page';
import { ConferenceHubPreview } from '@/components/conferences/conference-hub-preview';
import { ConferencesComingSoon } from '@/components/conferences/conferences-coming-soon';
import AdminReviewsPage from '@/app/(admin)/admin/reviews/page';
import PostingApplicantsPage from '@/app/(institution)/institution/postings/[id]/applicants/page';
import { covers } from '../support/covers';

covers(
  'page:/admin/reviews',
  'page:/institution/postings/[id]/applicants',
  'page:/institution',
  'page:/institution/saved',
  'page:/institution/inquiries',
  'page:/institution/profile',
  'page:/institution/conferences',
  'page:/dashboard',
  'page:/dashboard/inquiries'
);

describe('page-level authorization guards', () => {
  beforeEach(() => {
    identity = { userId: null };
    fetchPendingRevisions.mockClear();
    getPostingApplicantReport.mockClear();
    for (const fn of Object.values(portal)) fn.mockReset();
    portal.fetchInstitutionProfileOrThrow.mockResolvedValue({
      id: 'inst-1',
      name: 'Fixture-Free Seminary',
      slug: 'ffs',
      location: 'Springfield',
      institution_type: 'seminary',
      status: 'approved',
      accreditation_body: 'ATS',
      accreditation_status: 'accredited',
    });
    portal.fetchInstitutionStats.mockResolvedValue({
      totalInquiries: 11,
      pendingInquiries: 2,
      awaitingInquiries: 5,
      acceptedInquiries: 3,
      savedScholarsCount: 7,
      savedCoursesCount: 1,
    });
    portal.fetchInstitutionProfileForEdit.mockResolvedValue({
      id: 'inst-1',
      name: 'Fixture-Free Seminary',
      slug: 'ffs',
      location: 'Springfield',
      institution_type: 'seminary',
      status: 'approved',
      website: 'https://ffs.example.edu',
      contact_email: 'registrar@ffs.example.edu',
      accreditation_body: 'ATS',
      accreditation_status: 'accredited',
    });
    portal.fetchSavedScholarsOrThrow.mockResolvedValue([]);
    portal.fetchSavedCoursesOrThrow.mockResolvedValue([]);
    portal.fetchInstitutionInquiriesOrThrow.mockResolvedValue([]);
    portal.fetchScholarInquiriesOrThrow.mockResolvedValue([]);
    portal.fetchScholarDashboardSummary.mockResolvedValue({
      fullName: 'Dr. Real Scholar',
      initials: 'RS',
      profile: { label: 'Published', tone: 'success' },
      revisionText: 'Live revision #1 • No draft in progress',
      totalInquiries: 6,
      trend: { last30: 2, previous30: 1, delta: 1, direction: 'up', label: '+1 vs previous 30 days' },
      publicCourseCount: 4,
      availability: { state: 'available', badge: 'Available', detail: 'Adjunct Teaching' },
    });
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

const html = (node: unknown) => renderToStaticMarkup(node as React.ReactElement);

describe('institution portal pages call their own guard before fetching', () => {
  const pages: [string, () => Promise<unknown>, (typeof portal)[keyof typeof portal][]][] = [
    ['/institution', () => InstitutionHomePage(), [portal.fetchInstitutionProfileOrThrow, portal.fetchInstitutionStats]],
    ['/institution/saved', () => InstitutionSavedPage(), [portal.fetchSavedScholarsOrThrow, portal.fetchSavedCoursesOrThrow]],
    ['/institution/inquiries', () => InstitutionOutreachPage(), [portal.fetchInstitutionInquiriesOrThrow]],
    ['/institution/profile', () => InstitutionProfilePage(), [portal.fetchInstitutionProfileForEdit]],
  ];

  beforeEach(() => {
    identity = { userId: null };
  });

  it.each(pages)('%s redirects anonymous visitors and never fetches', async (_route, render, fetchers) => {
    await expect(render()).rejects.toThrow(`${REDIRECT}:/login`);
    for (const fn of fetchers) expect(fn).not.toHaveBeenCalled();
  });

  it.each(pages)('%s 404s signed-in non-members and never fetches', async (_route, render, fetchers) => {
    identity = { userId: 'u1', role: 'scholar', institutionIds: [] };
    await expect(render()).rejects.toThrow(NOT_FOUND);
    for (const fn of fetchers) expect(fn).not.toHaveBeenCalled();
  });

  it.each(pages)('%s scopes every fetch to the session institution', async (_route, render, fetchers) => {
    identity = { userId: 'u1', role: 'institution_user', institutionIds: ['inst-1', 'inst-2'] };
    await render();
    for (const fn of fetchers) {
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn.mock.calls[0][1]).toBe('inst-1');
    }
  });

  it('ignores a client-supplied institution id in params or search params', async () => {
    identity = { userId: 'u1', role: 'institution_user', institutionIds: ['inst-1'] };
    const hostile = {
      params: Promise.resolve({ institutionId: 'inst-victim' }),
      searchParams: Promise.resolve({ institutionId: 'inst-victim' }),
    };
    await (InstitutionHomePage as unknown as (p: unknown) => Promise<unknown>)(hostile);
    await (InstitutionSavedPage as unknown as (p: unknown) => Promise<unknown>)(hostile);
    await (InstitutionOutreachPage as unknown as (p: unknown) => Promise<unknown>)(hostile);
    await (InstitutionProfilePage as unknown as (p: unknown) => Promise<unknown>)(hostile);
    for (const fn of [
      portal.fetchInstitutionProfileForEdit,
      portal.fetchInstitutionProfileOrThrow,
      portal.fetchInstitutionStats,
      portal.fetchSavedScholarsOrThrow,
      portal.fetchSavedCoursesOrThrow,
      portal.fetchInstitutionInquiriesOrThrow,
    ]) {
      expect(fn.mock.calls.every((call) => call[1] === 'inst-1')).toBe(true);
    }
  });

  it('home shows the member institution and real counts, not fixtures', async () => {
    identity = { userId: 'u1', role: 'institution_user', institutionIds: ['inst-1'] };
    const markup = html(await InstitutionHomePage());
    expect(markup).toContain('Fixture-Free Seminary');
    expect(markup).toContain('Springfield');
    expect(markup).toContain('ATS Accredited');
    expect(markup).toContain('Verified Academic Partner');
    expect(markup).toContain('>11<');
    expect(markup).toContain('>5<'); // awaiting = pending + read
    expect(markup).not.toContain('Westminster Theological Seminary');
    expect(markup).not.toContain('Average response time');
  });

  it('home labels an unapproved institution as pending verification', async () => {
    identity = { userId: 'u1', role: 'institution_user', institutionIds: ['inst-1'] };
    portal.fetchInstitutionProfileOrThrow.mockResolvedValue({
      id: 'inst-1',
      name: 'New Seminary',
      status: 'pending',
      accreditation_body: 'none',
      accreditation_status: 'none',
    });
    const markup = html(await InstitutionHomePage());
    expect(markup).toContain('Pending verification');
    expect(markup).not.toContain('Verified Academic Partner');
    expect(markup).not.toContain('Accredited');
  });

  it('profile page shows the real institution values and trust status, none of the old fixture', async () => {
    identity = { userId: 'u1', role: 'institution_user', institutionIds: ['inst-1'] };
    const markup = html(await InstitutionProfilePage());
    expect(markup).toContain('value="Fixture-Free Seminary"');
    expect(markup).toContain('value="https://ffs.example.edu"');
    expect(markup).toContain('value="registrar@ffs.example.edu"');
    expect(markup).toContain('Verified Academic Partner');
    expect(markup).toContain('ATS Accredited');
    for (const fixture of ['Westminster Theological Seminary', 'academic.dean@wts.edu', 'Glenside']) {
      expect(markup).not.toContain(fixture);
    }
  });

  it('profile page is editable for owners and admins', async () => {
    for (const institutionRole of ['owner', 'admin']) {
      identity = { userId: 'u1', role: 'institution_user', institutionIds: ['inst-1'], institutionRole };
      const markup = html(await InstitutionProfilePage());
      expect(markup, institutionRole).toContain('Save Profile Settings');
      expect(markup, institutionRole).not.toContain('data-testid="profile-read-only"');
      expect(markup, institutionRole).not.toContain('readOnly');
    }
  });

  it('profile page is read-only with an explanation for recruiters and members', async () => {
    for (const institutionRole of ['recruiter', 'member']) {
      identity = { userId: 'u1', role: 'institution_user', institutionIds: ['inst-1'], institutionRole };
      const markup = html(await InstitutionProfilePage());
      expect(markup, institutionRole).toContain('data-testid="profile-read-only"');
      expect(markup, institutionRole).toContain('only institution owners and admins can edit');
      expect(markup, institutionRole).not.toContain('Save Profile Settings');
      expect(markup, institutionRole).toContain('value="Fixture-Free Seminary"');
      expect(markup, institutionRole).toMatch(/readOnly=""|readonly=""/i);
      expect(markup, institutionRole).toMatch(/<select[^>]*disabled/);
      expect(markup, institutionRole).toContain('id="profile-read-only-notice"');
      expect(markup, institutionRole).toMatch(/id="profile-name"[^>]*aria-describedby="profile-read-only-notice"|aria-describedby="profile-read-only-notice"[^>]*id="profile-name"/);
    }
  });

  it('profile page does not claim verification for a pending institution', async () => {
    identity = { userId: 'u1', role: 'institution_user', institutionIds: ['inst-1'] };
    portal.fetchInstitutionProfileForEdit.mockResolvedValue({
      id: 'inst-1',
      name: 'New Seminary',
      slug: 'ns',
      institution_type: 'seminary',
      status: 'pending',
      website: null,
      contact_email: 'a@b.edu',
      accreditation_body: 'none',
      accreditation_status: 'none',
    });
    const markup = html(await InstitutionProfilePage());
    expect(markup).toContain('Pending verification');
    expect(markup).not.toContain('Verified Academic Partner');
  });

  it.each(pages)('%s shows an error panel, not fake zeros, when the data load fails', async (_route, render, fetchers) => {
    identity = { userId: 'u1', role: 'institution_user', institutionIds: ['inst-1'] };
    for (const fn of fetchers) fn.mockRejectedValue(new PortalQueryError('x', '57014'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const markup = html(await render());
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('data-testid="data-error-panel"');
    expect(markup).not.toContain('data-testid="stat-');
    // logs carry the code only, never the error object
    expect(JSON.stringify(spy.mock.calls)).toContain('57014');
    spy.mockRestore();
  });
});

describe('a failed session lookup is an outage, never "no profile" or "not a member"', () => {
  it('requireInstitutionMember throws SessionLookupError instead of 404 when the membership lookup fails', async () => {
    identity = { userId: 'u1', role: 'institution_user', institutionIds: ['inst-1'], failTables: ['institution_users'] };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(requireInstitutionMember()).rejects.toBeInstanceOf(SessionLookupError);
    // logs carry the code only
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).toContain('57014');
    expect(logged).not.toContain('statement timeout');
    spy.mockRestore();
  });

  it('requireSignedIn throws SessionLookupError when the scholar lookup fails', async () => {
    identity = { userId: 'u1', role: 'scholar', scholarId: 'sch-me', failTables: ['scholars'] };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(requireSignedIn()).rejects.toBeInstanceOf(SessionLookupError);
    spy.mockRestore();
  });

  it('anonymous visitors are still redirected, not reported as an outage', async () => {
    identity = { userId: null };
    await expect(requireSignedIn()).rejects.toThrow(`${REDIRECT}:/login`);
  });

  it.each([
    ['/institution', () => InstitutionHomePage(), 'institution_users'],
    ['/institution/saved', () => InstitutionSavedPage(), 'institution_users'],
    ['/institution/inquiries', () => InstitutionOutreachPage(), 'institution_users'],
    ['/institution/profile', () => InstitutionProfilePage(), 'institution_users'],
    ['/dashboard', () => DashboardPage(), 'scholars'],
    ['/dashboard/inquiries', () => ScholarInquiriesPage(), 'scholars'],
  ])('%s surfaces the outage (error boundary panel) and never fetches or shows an empty state', async (_route, render, table) => {
    identity = { userId: 'u1', role: 'scholar', scholarId: 'sch-me', institutionIds: ['inst-1'], failTables: [table] };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render()).rejects.toBeInstanceOf(SessionLookupError);
    for (const fn of Object.values(portal)) expect(fn).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('scholar workspace pages call their own guard before fetching', () => {
  beforeEach(() => {
    identity = { userId: null };
  });

  it('/dashboard redirects anonymous visitors and never fetches', async () => {
    await expect(DashboardPage()).rejects.toThrow(`${REDIRECT}:/login`);
    expect(portal.fetchScholarDashboardSummary).not.toHaveBeenCalled();
  });

  it('/dashboard/inquiries redirects anonymous visitors and never fetches', async () => {
    await expect(ScholarInquiriesPage()).rejects.toThrow(`${REDIRECT}:/login`);
    expect(portal.fetchScholarInquiriesOrThrow).not.toHaveBeenCalled();
  });

  it('a signed-in user without a scholar profile gets the onboarding prompt and no fetch', async () => {
    identity = { userId: 'u1', role: 'institution_user', institutionIds: [] };
    const markup = html(await DashboardPage());
    expect(markup).toContain('data-testid="dashboard-onboarding-prompt"');
    expect(portal.fetchScholarDashboardSummary).not.toHaveBeenCalled();
    const inbox = html(await ScholarInquiriesPage());
    expect(portal.fetchScholarInquiriesOrThrow).not.toHaveBeenCalled();
    // not a bare empty inbox: point to onboarding
    expect(inbox).toContain('data-testid="inquiries-onboarding-prompt"');
    expect(inbox).toContain('/dashboard/onboarding');
  });

  it('fetches only for the session scholar, ignoring client-supplied ids', async () => {
    identity = { userId: 'u1', role: 'scholar', scholarId: 'sch-me' };
    const hostile = { searchParams: Promise.resolve({ scholarId: 'sch-victim' }) };
    await (DashboardPage as unknown as (p: unknown) => Promise<unknown>)(hostile);
    await (ScholarInquiriesPage as unknown as (p: unknown) => Promise<unknown>)(hostile);
    expect(portal.fetchScholarDashboardSummary.mock.calls[0][1]).toBe('sch-me');
    expect(portal.fetchScholarInquiriesOrThrow.mock.calls[0][1]).toBe('sch-me');
  });

  it('dashboard renders the real summary and none of the old fixture text', async () => {
    identity = { userId: 'u1', role: 'scholar', scholarId: 'sch-me' };
    const markup = html(await DashboardPage());
    expect(markup).toContain('Dr. Real Scholar');
    expect(markup).toContain('RS');
    expect(markup).toContain('Published');
    expect(markup).toContain('+1 vs previous 30 days');
    for (const fixture of ['Approved &amp; Active', 'Live Revision #1 active', '+18%', 'Public Directory Views']) {
      expect(markup).not.toContain(fixture);
    }
  });

  it('shows an error panel, not zeros, when the load fails', async () => {
    identity = { userId: 'u1', role: 'scholar', scholarId: 'sch-me' };
    portal.fetchScholarDashboardSummary.mockRejectedValue(new PortalQueryError('x', '42501'));
    portal.fetchScholarInquiriesOrThrow.mockRejectedValue(new PortalQueryError('x', '42501'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const page of [DashboardPage, ScholarInquiriesPage]) {
      const markup = html(await page());
      expect(markup).toContain('data-testid="data-error-panel"');
      expect(markup).not.toContain('data-testid="dashboard-inquiry-count"');
    }
    spy.mockRestore();
  });
});

describe('/institution/conferences is a staff-only preview', () => {
  beforeEach(() => {
    identity = { userId: null };
  });

  it('shows "coming soon" to anonymous callers and non-staff members', async () => {
    for (const who of [
      { userId: null },
      { userId: 'u1', role: 'institution_user', institutionIds: ['inst-1'] },
      { userId: 'u2', role: 'scholar' },
    ]) {
      identity = who;
      const result = (await InstitutionConferencesPage()) as React.ReactElement;
      expect(result.type).toBe(ConferencesComingSoon);
    }
  });

  it('shows the preview to platform staff', async () => {
    identity = { userId: 'staff', role: 'admin' };
    const result = (await InstitutionConferencesPage()) as React.ReactElement;
    expect(result.type).toBe(ConferenceHubPreview);
  });

  it('the preview banner says nothing is saved and no save control or message exists', () => {
    const markup = html(createElement(ConferenceHubPreview));
    expect(markup).toContain('data-testid="conference-preview-banner"');
    expect(markup).toContain('Preview — demo data, nothing is saved');
    expect(markup).not.toContain('Saved to Committee Docket');
    expect(markup).not.toContain('Save Deliberation Notes');
    expect(markup).not.toContain('Westminster Theological Seminary');
  });
});
