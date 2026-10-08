import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  initialsFrom,
  profileStatusLabel,
  revisionStatusText,
  inquiryTrend,
  summarizeAvailability,
  fetchScholarDashboardSummary,
} from '@/lib/profiles/dashboard-summary';
import {
  accreditationLabel,
  verificationLabel,
  isAwaiting,
  opportunityLabel,
  OPPORTUNITY_LABELS,
} from '@/lib/inquiries/labels';
import {
  toInboxItems,
  toOutboxItems,
  toShortlistedScholarItems,
  toBookmarkedCourseItems,
} from '@/lib/inquiries/mappers';
import {
  fetchInstitutionStats,
  fetchInstitutionProfileOrThrow,
  fetchSavedScholarsOrThrow,
  fetchSavedScholars,
  PortalQueryError,
} from '@/lib/inquiries/queries';
import type { SupabaseClient } from '@supabase/supabase-js';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-08T12:00:00.000Z');
const ago = (days: number, extraMs = 0) => new Date(NOW.getTime() - days * DAY + extraMs).toISOString();

describe('initialsFrom', () => {
  it('uses first and last significant word', () => {
    expect(initialsFrom('Sarah Edwards')).toBe('SE');
    expect(initialsFrom('Thomas Cranmer-Davies')).toBe('TC');
    expect(initialsFrom('Marcus Aurelius Vance')).toBe('MV');
  });
  it('ignores honorifics', () => {
    expect(initialsFrom('Dr. Sarah Edwards')).toBe('SE');
    expect(initialsFrom('Prof Marcus Vance')).toBe('MV');
  });
  it('handles one word, empty and unicode names', () => {
    expect(initialsFrom('Calvin')).toBe('C');
    expect(initialsFrom('Dr.')).toBe('D');
    expect(initialsFrom('')).toBe('?');
    expect(initialsFrom(null)).toBe('?');
    expect(initialsFrom('élodie  önal')).toBe('ÉÖ');
  });
});

describe('profileStatusLabel', () => {
  it.each([
    ['draft', 'Draft'],
    ['submitted', 'Under review'],
    ['approved', 'Published'],
    ['hidden', 'Hidden'],
    ['rejected', 'Not approved'],
  ] as const)('labels %s as %s', (status, label) => {
    expect(profileStatusLabel(status).label).toBe(label);
  });
  it('never claims a state for unknown input', () => {
    expect(profileStatusLabel(null).label).toBe('Unknown');
    expect(profileStatusLabel(undefined).label).toBe('Unknown');
  });
  it('marks published as success and hidden as warning', () => {
    expect(profileStatusLabel('approved').tone).toBe('success');
    expect(profileStatusLabel('hidden').tone).toBe('warning');
  });
});

describe('revisionStatusText', () => {
  it('describes a published profile with an open draft', () => {
    expect(
      revisionStatusText({
        hasPublished: true,
        publishedRevisionNumber: 1,
        revisions: [
          { revision_number: 1, status: 'approved' },
          { revision_number: 2, status: 'draft' },
        ],
      })
    ).toBe('Live revision #1 • Draft revision #2 not yet submitted');
  });
  it('covers every open status', () => {
    const text = (status: 'draft' | 'submitted' | 'changes_requested') =>
      revisionStatusText({ hasPublished: false, publishedRevisionNumber: null, revisions: [{ revision_number: 3, status }] });
    expect(text('draft')).toBe('Not published yet • Draft revision #3 not yet submitted');
    expect(text('submitted')).toBe('Not published yet • Revision #3 awaiting review');
    expect(text('changes_requested')).toBe('Not published yet • Revision #3: changes requested');
  });
  it('mentions a rejection only while it is newer than the published revision', () => {
    const newer = revisionStatusText({
      hasPublished: true,
      publishedRevisionNumber: 2,
      revisions: [
        { revision_number: 2, status: 'approved' },
        { revision_number: 3, status: 'rejected' },
      ],
    });
    expect(newer).toBe('Live revision #2 • Revision #3 was not approved');

    const older = revisionStatusText({
      hasPublished: true,
      publishedRevisionNumber: 4,
      revisions: [
        { revision_number: 2, status: 'rejected' },
        { revision_number: 3, status: 'superseded' },
        { revision_number: 4, status: 'approved' },
      ],
    });
    expect(older).toBe('Live revision #4 • No draft in progress');
  });
  it('an open revision wins over a rejection', () => {
    const text = revisionStatusText({
      hasPublished: false,
      publishedRevisionNumber: null,
      revisions: [
        { revision_number: 1, status: 'rejected' },
        { revision_number: 2, status: 'draft' },
      ],
    });
    expect(text).toContain('Draft revision #2');
    expect(text).not.toContain('not approved');
  });
  it('is honest about a live profile whose number is unknown and about no revisions', () => {
    expect(revisionStatusText({ hasPublished: true, publishedRevisionNumber: null, revisions: [] })).toBe(
      'Live revision • No draft in progress'
    );
    expect(revisionStatusText({ hasPublished: false, publishedRevisionNumber: null, revisions: [] })).toBe(
      'Not published yet • No draft in progress'
    );
  });
});

describe('inquiryTrend (rolling 30 days vs the previous 30)', () => {
  it('counts each window with an injected now', () => {
    const trend = inquiryTrend([ago(1), ago(10), ago(29), ago(31), ago(45)], NOW);
    expect(trend).toMatchObject({ last30: 3, previous30: 2, delta: 1, direction: 'up' });
    expect(trend.label).toBe('+1 vs previous 30 days');
  });
  it('window boundaries: (start, end]', () => {
    // exactly 30 days ago belongs to the previous window; exactly 60 days ago is out
    const trend = inquiryTrend([ago(30), ago(30, 1), ago(60), ago(60, 1), NOW.toISOString()], NOW);
    expect(trend.last30).toBe(2); // 30d+1ms ago and "now"
    expect(trend.previous30).toBe(2); // exactly 30d and 60d+1ms ago
  });
  it('ignores future and unparseable timestamps', () => {
    const trend = inquiryTrend([new Date(NOW.getTime() + 1).toISOString(), 'not-a-date'], NOW);
    expect(trend.last30).toBe(0);
    expect(trend.previous30).toBe(0);
  });
  it('labels down, flat and empty without percentages', () => {
    expect(inquiryTrend([ago(40), ago(41)], NOW).label).toBe('-2 vs previous 30 days');
    expect(inquiryTrend([ago(1), ago(40)], NOW).label).toBe('Same as previous 30 days');
    expect(inquiryTrend([], NOW).label).toBe('No inquiries in the last 30 days');
    for (const t of [inquiryTrend([ago(1)], NOW), inquiryTrend([ago(40)], NOW)]) {
      expect(t.label).not.toContain('%');
    }
  });
});

describe('summarizeAvailability', () => {
  it('has an honest unset state', () => {
    expect(summarizeAvailability(null)).toMatchObject({ state: 'unset', badge: 'Not set' });
  });
  it('maps opportunity labels and caps the list', () => {
    expect(
      summarizeAvailability({ is_available_for_hire: true, opportunity_types: ['adjunct_teaching', 'guest_lecturing'] })
    ).toEqual({ state: 'available', badge: 'Available', detail: 'Adjunct Teaching, Guest Lecture' });
    const many = summarizeAvailability({
      is_available_for_hire: false,
      opportunity_types: ['adjunct_teaching', 'guest_lecturing', 'online_instruction', 'doctoral_supervision', 'x_custom'],
    });
    expect(many.state).toBe('unavailable');
    expect(many.badge).toBe('Not available');
    expect(many.detail).toBe('Adjunct Teaching, Guest Lecture, Online Course +2 more');
  });
  it('says so when nothing is selected', () => {
    expect(summarizeAvailability({ is_available_for_hire: true, opportunity_types: [] }).detail).toBe(
      'No opportunity types selected'
    );
    expect(summarizeAvailability({ is_available_for_hire: true, opportunity_types: null }).detail).toBe(
      'No opportunity types selected'
    );
  });
});

describe('labels', () => {
  it('labels every opportunity type, falling back to the raw value', () => {
    for (const [key, label] of Object.entries(OPPORTUNITY_LABELS)) expect(opportunityLabel(key)).toBe(label);
    expect(Object.keys(OPPORTUNITY_LABELS)).toHaveLength(7);
    expect(opportunityLabel('something_new')).toBe('something_new');
  });
  it('awaiting = pending + read', () => {
    expect(isAwaiting('pending')).toBe(true);
    expect(isAwaiting('read')).toBe(true);
    expect(isAwaiting('accepted')).toBe(false);
    expect(isAwaiting('declined')).toBe(false);
    expect(isAwaiting('archived')).toBe(false);
  });
  it('shows accreditation only when verified data exists', () => {
    expect(accreditationLabel('ATS', 'accredited')).toBe('ATS Accredited');
    expect(accreditationLabel('ABHE', 'candidate')).toBe('ABHE Candidate');
    expect(accreditationLabel('TRACS', 'associate')).toBe('TRACS Associate');
    expect(accreditationLabel('other', 'accredited')).toBe('Accredited');
    expect(accreditationLabel('none', 'accredited')).toBeNull();
    expect(accreditationLabel('ATS', 'none')).toBeNull();
    expect(accreditationLabel(null, null)).toBeNull();
    expect(accreditationLabel('ATS', 'weird')).toBeNull();
  });
  it('claims verification only for approved institutions', () => {
    expect(verificationLabel('approved')).toBe('Verified Academic Partner');
    for (const s of ['pending', 'rejected', 'suspended', null, undefined]) {
      expect(verificationLabel(s)).toBe('Pending verification');
    }
  });
});

describe('row mappers', () => {
  const base = {
    id: 'i1',
    institution_id: 'inst1',
    scholar_id: 's1',
    sender_account_id: 'a1',
    opportunity_type: 'adjunct_teaching' as const,
    proposed_term: null,
    delivery_mode: null,
    message: 'hello there',
    contact_email: 'dean@example.edu',
    status: 'pending' as const,
    created_at: ago(1),
    updated_at: ago(1),
  };

  it('toInboxItems flattens institution and course', () => {
    const [item] = toInboxItems([
      {
        ...base,
        institution: { id: 'inst1', name: 'Test Seminary', slug: 't', location: 'Here', institution_type: 'seminary', status: 'approved' },
        course: { id: 'c1', title: 'Romans', slug: 'romans' },
      },
    ]);
    expect(item).toMatchObject({
      id: 'i1',
      institution_name: 'Test Seminary',
      institution_location: 'Here',
      institution_type: 'seminary',
      course_title: 'Romans',
      status: 'pending',
    });
    expect(toInboxItems([])).toEqual([]);
  });

  it('toOutboxItems flattens scholar and course', () => {
    const [item] = toOutboxItems([
      { ...base, scholar: { id: 's1', full_name: 'Dr. S', slug: 'dr-s' }, course: null },
    ]);
    expect(item).toMatchObject({ scholar_name: 'Dr. S', scholar_slug: 'dr-s', course_title: null });
  });

  it('shortlist mappers keep unavailable entries removable', () => {
    const [gone] = toShortlistedScholarItems([
      { id: 'x', institution_id: 'i', scholar_id: 's9', created_at: ago(1), scholar: null },
    ]);
    expect(gone).toMatchObject({ id: 'x', scholar_id: 's9', full_name: null, slug: null });

    const [ok] = toShortlistedScholarItems([
      {
        id: 'y',
        institution_id: 'i',
        scholar_id: 's1',
        notes: 'n',
        created_at: ago(1),
        scholar: { id: 's1', slug: 'dr-s', full_name: 'Dr. S', primary_institution: 'Sem' },
      },
    ]);
    expect(ok).toMatchObject({ full_name: 'Dr. S', slug: 'dr-s', primary_institution: 'Sem', notes: 'n' });

    const [course, hidden] = toBookmarkedCourseItems([
      {
        id: 'c',
        institution_id: 'i',
        course_id: 'c1',
        created_at: ago(1),
        course: { id: 'c1', slug: 'romans', title: 'Romans', delivery_mode: 'online_sync', scholar_name: 'Dr. S' },
      },
      { id: 'd', institution_id: 'i', course_id: 'c2', created_at: ago(1), course: null },
    ]);
    expect(course).toMatchObject({ title: 'Romans', scholar_name: 'Dr. S', delivery_mode: 'online_sync' });
    expect(hidden).toMatchObject({ course_id: 'c2', title: null, slug: null });
  });
});

/** Minimal chainable fake: every builder method returns itself; awaiting resolves `resolve(table, calls)`. */
type Call = { method: string; args: unknown[] };
function fakeClient(resolve: (table: string, calls: Call[]) => { data?: unknown; count?: number | null; error?: { code?: string } | null }) {
  const seen: { table: string; calls: Call[] }[] = [];
  const client = {
    from(table: string) {
      const calls: Call[] = [];
      const entry = { table, calls };
      seen.push(entry);
      const builder: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'in', 'gte', 'order', 'limit', 'delete']) {
        builder[m] = (...args: unknown[]) => {
          calls.push({ method: m, args });
          return builder;
        };
      }
      builder.maybeSingle = async () => ({ error: null, data: null, ...resolve(table, calls) });
      builder.then = (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) =>
        Promise.resolve({ error: null, data: [], count: null, ...resolve(table, calls) }).then(ok, bad);
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, seen };
}

describe('fetchInstitutionStats', () => {
  it('runs head counts, all scoped to the institution, and exposes awaiting = pending + read', async () => {
    const { client, seen } = fakeClient((table, calls) => {
      const statuses = calls.find((c) => c.method === 'in')?.args[1] as string[] | undefined;
      if (table === 'inquiries') {
        if (!statuses) return { count: 7 };
        if (statuses.join() === 'pending') return { count: 2 };
        if (statuses.join() === 'pending,read') return { count: 4 };
        if (statuses.join() === 'accepted') return { count: 1 };
      }
      if (table === 'saved_scholars') return { count: 5 };
      if (table === 'saved_courses') return { count: 3 };
      return { count: null };
    });
    const stats = await fetchInstitutionStats(client, 'inst-1');
    expect(stats).toEqual({
      totalInquiries: 7,
      pendingInquiries: 2,
      awaitingInquiries: 4,
      acceptedInquiries: 1,
      savedScholarsCount: 5,
      savedCoursesCount: 3,
    });
    for (const { calls } of seen) {
      expect(calls.some((c) => c.method === 'eq' && c.args[0] === 'institution_id' && c.args[1] === 'inst-1')).toBe(true);
      const select = calls.find((c) => c.method === 'select');
      expect(select?.args[1]).toMatchObject({ count: 'exact', head: true });
    }
  });

  it('throws instead of returning zeros when any count fails', async () => {
    const { client } = fakeClient((table) =>
      table === 'saved_courses' ? { count: null, error: { code: '42501' } } : { count: 1 }
    );
    await expect(fetchInstitutionStats(client, 'inst-1')).rejects.toMatchObject({
      name: 'PortalQueryError',
      code: '42501',
    });
  });
});

describe('throwing vs non-throwing fetchers', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('the OrThrow variant throws a code-only error; the plain one degrades and logs only the code', async () => {
    const failing = fakeClient(() => ({ data: null, error: { code: 'PGRST301' } })).client;
    await expect(fetchSavedScholarsOrThrow(failing, 'inst-1')).rejects.toBeInstanceOf(PortalQueryError);

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(fetchSavedScholars(failing, 'inst-1')).resolves.toEqual([]);
    expect(spy).toHaveBeenCalled();
    expect(JSON.stringify(spy.mock.calls)).toContain('PGRST301');
  });

  it('profile read throws on error and returns null when not visible', async () => {
    await expect(
      fetchInstitutionProfileOrThrow(fakeClient(() => ({ data: null, error: { code: 'X1' } })).client, 'i')
    ).rejects.toBeInstanceOf(PortalQueryError);
    await expect(
      fetchInstitutionProfileOrThrow(fakeClient(() => ({ data: null, error: null })).client, 'i')
    ).resolves.toBeNull();
  });
});

describe('fetchScholarDashboardSummary', () => {
  const scholarRow = { id: 's1', full_name: 'Dr. Sarah Edwards', profile_status: 'approved', published_revision_id: 'rev-1' };

  it('assembles the summary from scholar-scoped reads', async () => {
    const { client, seen } = fakeClient((table, calls) => {
      const head = calls.find((c) => c.method === 'select')?.args[1] as { head?: boolean } | undefined;
      switch (table) {
        case 'scholars':
          return { data: scholarRow };
        case 'scholar_profile_revisions':
          return {
            data: [
              { id: 'rev-2', revision_number: 2, status: 'submitted' },
              { id: 'rev-1', revision_number: 1, status: 'approved' },
            ],
          };
        case 'inquiries':
          return head?.head ? { count: 9 } : { data: [{ created_at: ago(2) }, { created_at: ago(40) }] };
        case 'availability_profiles':
          return { data: { is_available_for_hire: true, opportunity_types: ['adjunct_teaching'] } };
        case 'courses':
          return { count: 3 };
      }
      return {};
    });
    const summary = await fetchScholarDashboardSummary(client, 's1', NOW);
    expect(summary).toMatchObject({
      fullName: 'Dr. Sarah Edwards',
      initials: 'SE',
      profile: { label: 'Published' },
      revisionText: 'Live revision #1 • Revision #2 awaiting review',
      totalInquiries: 9,
      publicCourseCount: 3,
      availability: { badge: 'Available', detail: 'Adjunct Teaching' },
    });
    expect(summary?.trend).toMatchObject({ last30: 1, previous30: 1 });
    // every read is explicitly scoped to the session scholar
    for (const { table, calls } of seen) {
      const key = table === 'scholars' ? 'id' : 'scholar_id';
      expect(calls.some((c) => c.method === 'eq' && c.args[0] === key && c.args[1] === 's1'), table).toBe(true);
    }
    // only public courses are counted
    const courses = seen.find((s) => s.table === 'courses')!;
    expect(courses.calls.some((c) => c.method === 'eq' && c.args[0] === 'visibility' && c.args[1] === 'public')).toBe(true);
  });

  it('returns null when the scholar row is not visible', async () => {
    const { client } = fakeClient((table) => (table === 'scholars' ? { data: null } : { count: 0 }));
    await expect(fetchScholarDashboardSummary(client, 's1', NOW)).resolves.toBeNull();
  });

  it('throws on any failed read rather than showing zeros', async () => {
    const { client } = fakeClient((table) =>
      table === 'inquiries' ? { error: { code: '57014' } } : table === 'scholars' ? { data: scholarRow } : { count: 0 }
    );
    await expect(fetchScholarDashboardSummary(client, 's1', NOW)).rejects.toMatchObject({ code: '57014' });
  });
});
