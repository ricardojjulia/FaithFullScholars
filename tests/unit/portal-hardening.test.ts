import { describe, it, expect, vi, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { canEditInstitutionProfile, getSessionContext, resolveInstitutionAccess, SessionLookupError } from '@/lib/auth/session';
import {
  INQUIRY_TABS,
  countForTab,
  inquiryStatusLabel,
  institutionStatusBadge,
  matchesInquiryTab,
} from '@/lib/inquiries/labels';
import { INSTITUTION_UNAVAILABLE, SCHOLAR_UNAVAILABLE, toInboxItems, toOutboxItems } from '@/lib/inquiries/mappers';
import {
  applyOptimisticStatus,
  sendInquiryDecision,
  settleDecision,
  snapshotOf,
  type DecidableInquiry,
} from '@/lib/inquiries/inbox-state';
import { validateInstitutionProfile } from '@/lib/inquiries/profile-validation';
import { nextTabIndex } from '@/components/portal/tabs';
import type { InquiryStatus } from '@/lib/domain/types';

afterEach(() => vi.restoreAllMocks());

// --- session lookup failures -----------------------------------------------

interface Lookup {
  accounts?: { data?: unknown; error?: { code?: string; message?: string } | null };
  scholars?: { data?: unknown; error?: { code?: string; message?: string } | null };
  institution_users?: { data?: unknown; error?: { code?: string; message?: string } | null };
}

function sessionClient(lookup: Lookup): SupabaseClient {
  return {
    auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'u@example.org' } }, error: null }) },
    from(table: keyof Lookup) {
      const result = { data: null, error: null, ...(lookup[table] ?? {}) };
      const builder: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'order']) builder[m] = () => builder;
      builder.maybeSingle = async () => result;
      builder.then = (ok: (v: unknown) => unknown) => Promise.resolve(result).then(ok);
      return builder;
    },
  } as unknown as SupabaseClient;
}

describe('getSessionContext lookup failures', () => {
  it('reports a clean lookup as not failed', async () => {
    const session = await getSessionContext(
      sessionClient({
        accounts: { data: { role: 'scholar' } },
        scholars: { data: { id: 'sch-1' } },
        institution_users: { data: [] },
      })
    );
    expect(session).toMatchObject({ role: 'scholar', scholarId: 'sch-1', institutionIds: [], lookupFailed: false });
  });

  it('carries the per-institution role and gates profile edits to owner/admin (fail closed)', async () => {
    const session = await getSessionContext(
      sessionClient({
        accounts: { data: { role: 'institution_user' } },
        institution_users: {
          data: [
            { institution_id: 'i-owner', role: 'owner' },
            { institution_id: 'i-admin', role: 'admin' },
            { institution_id: 'i-rec', role: 'recruiter' },
            { institution_id: 'i-mem', role: 'member' },
            { institution_id: 'i-norole' },
          ],
        },
      })
    );
    expect(session?.institutionRoles).toMatchObject({ 'i-owner': 'owner', 'i-rec': 'recruiter' });
    expect(canEditInstitutionProfile(session, 'i-owner')).toBe(true);
    expect(canEditInstitutionProfile(session, 'i-admin')).toBe(true);
    for (const id of ['i-rec', 'i-mem', 'i-norole', 'i-unknown']) {
      expect(canEditInstitutionProfile(session, id), id).toBe(false);
    }
    expect(canEditInstitutionProfile(null, 'i-owner')).toBe(false);
  });

  it.each(['accounts', 'scholars', 'institution_users'] as const)(
    'flags a failed %s lookup instead of looking like "no profile / no membership"',
    async (table) => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const session = await getSessionContext(
        sessionClient({ [table]: { error: { code: '57014', message: 'relation "scholars" secret detail' } } })
      );
      expect(session?.lookupFailed).toBe(true);
      // logs carry the code only, never the message or the error object
      const logged = JSON.stringify(spy.mock.calls);
      expect(logged).toContain('57014');
      expect(logged).not.toContain('secret detail');
    }
  );

  it('resolveInstitutionAccess answers 503, not 403, when the lookup failed', () => {
    const session = {
      userId: 'u1',
      role: null,
      scholarId: null,
      institutionIds: [],
      institutionRoles: {},
      lookupFailed: true,
    };
    expect(resolveInstitutionAccess(session)).toMatchObject({ ok: false, status: 503 });
    expect(resolveInstitutionAccess(session, 'inst-x')).toMatchObject({ ok: false, status: 503 });
  });

  it('SessionLookupError is a distinct, named error for the portal error boundaries', () => {
    const err = new SessionLookupError();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('SessionLookupError');
  });
});

// --- consistent "awaiting" --------------------------------------------------

describe('inquiry tabs: awaiting = pending + read everywhere', () => {
  const statuses: InquiryStatus[] = ['pending', 'read', 'accepted', 'declined', 'archived'];

  it('puts pending and read under Awaiting and every status under exactly one specific tab', () => {
    expect(statuses.filter((s) => matchesInquiryTab(s, 'awaiting'))).toEqual(['pending', 'read']);
    for (const status of statuses) {
      const specific = INQUIRY_TABS.filter((t) => t.id !== 'all' && matchesInquiryTab(status, t.id));
      expect(specific, status).toHaveLength(1);
      expect(matchesInquiryTab(status, 'all')).toBe(true);
    }
  });

  it('counts per tab, so read and archived items are reachable', () => {
    const items = statuses.map((status) => ({ status }));
    expect(countForTab(items, 'awaiting')).toBe(2);
    expect(countForTab(items, 'archived')).toBe(1);
  });

  it('labels pending and read as awaiting', () => {
    expect(inquiryStatusLabel('pending')).toBe('Awaiting response');
    expect(inquiryStatusLabel('read')).toMatch(/awaiting response/i);
  });
});

describe('institutionStatusBadge', () => {
  it('shows "Verified" only for approved', () => {
    expect(institutionStatusBadge('approved')).toEqual({ label: 'Verified', tone: 'verified' });
    for (const status of ['pending', 'rejected', 'suspended', null, undefined, 'weird']) {
      const badge = institutionStatusBadge(status);
      expect(badge.tone).toBe('neutral');
      expect(badge.label).not.toBe('Verified');
    }
    expect(institutionStatusBadge('pending').label).toBe('Pending verification');
  });
});

// --- data minimisation and no fabricated entities ----------------------------

describe('inquiry mappers: minimisation and unavailable parties', () => {
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
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  };
  const institution = { id: 'inst1', name: 'Test Seminary', slug: 't', institution_type: 'seminary', status: 'approved' };

  it('strips the institution contact email server-side unless accepted', () => {
    for (const status of ['pending', 'read', 'declined', 'archived'] as const) {
      const [item] = toInboxItems([{ ...base, status, institution, course: null }]);
      expect(item.contact_email, status).toBeNull();
      expect(JSON.stringify(item)).not.toContain('dean@example.edu');
    }
    const [accepted] = toInboxItems([{ ...base, status: 'accepted', institution, course: null }]);
    expect(accepted.contact_email).toBe('dean@example.edu');
  });

  it('never carries contact_email into the outreach log props', () => {
    const [item] = toOutboxItems([
      { ...base, status: 'accepted', scholar: { id: 's1', full_name: 'Dr. S', slug: 'dr-s' }, course: null },
    ]);
    expect('contact_email' in item).toBe(false);
    expect(JSON.stringify(item)).not.toContain('dean@example.edu');
  });

  it('shows a neutral "Institution unavailable" with no invented type or status', () => {
    const [item] = toInboxItems([{ ...base, status: 'pending', institution: null, course: null }]);
    expect(item).toMatchObject({
      institution_name: INSTITUTION_UNAVAILABLE,
      institution_type: null,
      institution_location: null,
      institution_available: false,
    });
    expect(JSON.stringify(item)).not.toMatch(/Unknown Seminary|approved|seminary/i);
  });

  it('does not invent a scholar profile link for an unavailable scholar', () => {
    const [item] = toOutboxItems([{ ...base, status: 'pending', scholar: null, course: null }]);
    expect(item).toMatchObject({ scholar_name: SCHOLAR_UNAVAILABLE, scholar_slug: null });
  });
});

// --- inbox optimistic update and rollback -----------------------------------

describe('inbox decision state', () => {
  const items: DecidableInquiry[] = [
    { id: 'a', status: 'pending', contact_email: null },
    { id: 'b', status: 'read', contact_email: null },
  ];

  it('applies the optimistic status to one item only', () => {
    const next = applyOptimisticStatus(items, 'a', 'accepted');
    expect(next.map((i) => i.status)).toEqual(['accepted', 'read']);
    expect(items[0].status).toBe('pending'); // input untouched
  });

  it('keeps the new status and adopts the released contact email on success', () => {
    const optimistic = applyOptimisticStatus(items, 'a', 'accepted');
    const settled = settleDecision(optimistic, 'a', 'accepted', snapshotOf(items[0]), {
      ok: true,
      contactEmail: 'dean@example.edu',
    });
    expect(settled[0]).toMatchObject({ status: 'accepted', contact_email: 'dean@example.edu' });
  });

  it('rolls back to exactly the previous state on failure', () => {
    const optimistic = applyOptimisticStatus(items, 'b', 'declined');
    expect(optimistic[1].status).toBe('declined');
    const settled = settleDecision(optimistic, 'b', 'declined', snapshotOf(items[1]), { ok: false });
    expect(settled).toEqual(items);
  });

  it('treats a non-2xx response as failure and a network error as failure', async () => {
    const reject = vi.fn(async () => new Response('{}', { status: 500 })) as unknown as typeof fetch;
    await expect(sendInquiryDecision(reject, 'a', 'accepted', null)).resolves.toEqual({ ok: false });
    const offline = vi.fn(async () => {
      throw new TypeError('network down');
    }) as unknown as typeof fetch;
    await expect(sendInquiryDecision(offline, 'a', 'accepted', null)).resolves.toEqual({ ok: false });
  });

  it('PATCHes the encoded id and returns the released contact email on success', async () => {
    const ok = vi.fn(
      async () => new Response(JSON.stringify({ success: true, contactEmail: 'dean@example.edu' }), { status: 200 })
    );
    const result = await sendInquiryDecision(ok as unknown as typeof fetch, 'a/b', 'accepted', 'thanks');
    expect(result).toEqual({ ok: true, contactEmail: 'dean@example.edu' });
    const [url, init] = ok.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/inquiries/a%2Fb');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ status: 'accepted', response_notes: 'thanks' });
  });
});

// --- institution profile validation ------------------------------------------

describe('validateInstitutionProfile', () => {
  it('accepts and trims valid identity fields', () => {
    const result = validateInstitutionProfile({
      name: '  Test Seminary ',
      website: ' https://example.edu ',
      location: ' Springfield ',
      contact_email: ' dean@example.edu ',
      institution_type: 'seminary',
    });
    expect(result).toEqual({
      ok: true,
      value: {
        name: 'Test Seminary',
        website: 'https://example.edu',
        location: 'Springfield',
        contact_email: 'dean@example.edu',
        institution_type: 'seminary',
      },
    });
  });

  it('clears optional fields when empty', () => {
    expect(validateInstitutionProfile({ website: '', location: '  ' })).toEqual({
      ok: true,
      value: { website: null, location: null },
    });
  });

  it('drops trust columns and unknown keys (allow-list)', () => {
    const result = validateInstitutionProfile({
      name: 'X',
      status: 'approved',
      slug: 'hijack',
      accreditation_body: 'ATS',
      accreditation_status: 'accredited',
      accreditation_verified_at: '2026-01-01',
      id: 'other-institution',
      institution_id: 'other-institution',
    });
    expect(result).toEqual({ ok: true, value: { name: 'X' } });
  });

  it.each([
    [{ name: '' }, 'name'],
    [{ name: 'x'.repeat(201) }, 'name'],
    [{ website: 'javascript:alert(1)' }, 'website'],
    [{ website: 'not a url' }, 'website'],
    [{ contact_email: 'nope' }, 'contact_email'],
    [{ contact_email: '' }, 'contact_email'],
    [{ institution_type: 'megachurch' }, 'institution_type'],
    [{ location: 'y'.repeat(201) }, 'location'],
  ])('rejects %j', (input, field) => {
    const result = validateInstitutionProfile(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors)).toContain(field);
  });

  it('rejects non-object bodies', () => {
    for (const body of [null, 'x', 5, []]) expect(validateInstitutionProfile(body).ok).toBe(false);
  });
});

// --- tab keyboard navigation --------------------------------------------------

describe('nextTabIndex', () => {
  it('wraps with arrow keys and supports Home / End', () => {
    expect(nextTabIndex('ArrowRight', 0, 3)).toBe(1);
    expect(nextTabIndex('ArrowRight', 2, 3)).toBe(0);
    expect(nextTabIndex('ArrowLeft', 0, 3)).toBe(2);
    expect(nextTabIndex('Home', 2, 3)).toBe(0);
    expect(nextTabIndex('End', 0, 3)).toBe(2);
  });
  it('ignores other keys', () => {
    expect(nextTabIndex('a', 0, 3)).toBeNull();
    expect(nextTabIndex('Enter', 0, 3)).toBeNull();
    expect(nextTabIndex('ArrowRight', 0, 0)).toBeNull();
  });
});
