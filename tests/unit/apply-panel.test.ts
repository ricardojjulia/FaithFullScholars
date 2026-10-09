import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
  usePathname: () => '/',
}));

interface Identity {
  user: { id: string } | null;
  role?: string | null;
  scholarId?: string | null;
  institutionIds?: string[];
  failTable?: string;
}
let identity: Identity = { user: null };
let application: { data: unknown; error: { code: string } | null } = { data: null, error: null };
let scholarProfile: { data: unknown; error: { code: string } | null } = { data: { profile_status: 'approved' }, error: null };
const queried: string[] = [];

function client() {
  return {
    auth: { getUser: async () => ({ data: { user: identity.user }, error: null }) },
    from(table: string) {
      queried.push(table);
      const failed = identity.failTable === table;
      let result: { data: unknown; error: unknown };
      if (failed) result = { data: null, error: { code: '57014' } };
      else if (table === 'accounts') result = { data: identity.role ? { role: identity.role } : null, error: null };
      else if (table === 'institution_users')
        result = { data: (identity.institutionIds ?? []).map((institution_id) => ({ institution_id })), error: null };
      else if (table === 'posting_applications') result = application;
      else result = { data: identity.scholarId ? (queried.filter((q) => q === 'scholars').length > 1 ? scholarProfile.data : { id: identity.scholarId }) : null, error: scholarProfile.error };
      const b: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'order']) b[m] = () => b;
      b.maybeSingle = async () => result;
      b.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
      return b;
    },
  } as never;
}

import { loadApplyState } from '@/lib/postings/apply-state';
import { ApplyPanel } from '@/components/opportunities/apply-panel';
import { ExpressInterestModal } from '@/components/opportunities/express-interest-modal';
import { I18nProvider } from '@/lib/i18n/i18n-context';
import { covers } from '../support/covers';

covers('page:/opportunities/[slug]');

const POSTING = { id: 'p-1', status: 'published' };
const html = (node: React.ReactElement) => renderToStaticMarkup(createElement(I18nProvider, null, node));

describe('what the posting page offers (loadApplyState)', () => {
  const reset = (over: Partial<Identity> = {}) => {
    identity = { user: { id: 'u1' }, role: 'scholar', scholarId: 'sch-1', ...over };
    application = { data: null, error: null };
    scholarProfile = { data: { profile_status: 'approved' }, error: null };
    queried.length = 0;
  };

  it('asks a signed-out visitor to sign in, without reading any application', async () => {
    identity = { user: null };
    queried.length = 0;
    expect(await loadApplyState(client(), POSTING)).toEqual({ kind: 'signed_out' });
    expect(queried).not.toContain('posting_applications');
  });

  it('is "unavailable" (not "sign in", not "apply") when the session lookup failed', async () => {
    reset({ failTable: 'accounts' });
    expect(await loadApplyState(client(), POSTING)).toEqual({ kind: 'unavailable' });
  });

  it('offers institution members nothing and reads nothing about applications', async () => {
    reset({ role: 'institution_user', scholarId: null, institutionIds: ['inst-1'] });
    expect(await loadApplyState(client(), POSTING)).toEqual({ kind: 'institution' });
    expect(queried).not.toContain('posting_applications');
  });

  it('sends a signed-in user without a profile to onboarding, and an unapproved scholar to their profile', async () => {
    reset({ scholarId: null });
    expect(await loadApplyState(client(), POSTING)).toEqual({ kind: 'not_eligible', hasProfile: false });
    reset();
    scholarProfile = { data: { profile_status: 'draft' }, error: null };
    expect(await loadApplyState(client(), POSTING)).toEqual({ kind: 'not_eligible', hasProfile: true });
  });

  it('offers an approved scholar who has not applied the apply button', async () => {
    reset();
    expect(await loadApplyState(client(), POSTING)).toEqual({ kind: 'apply' });
  });

  it('shows the real status once applied, even after the posting closed', async () => {
    reset();
    application = { data: { id: 'app-1', status: 'under_review', created_at: '2026-10-01T10:00:00Z' }, error: null };
    expect(await loadApplyState(client(), { id: 'p-1', status: 'filled' })).toEqual({
      kind: 'applied',
      applicationId: 'app-1',
      status: 'under_review',
      appliedAt: '2026-10-01T10:00:00Z',
    });
  });

  it('says "closed" for a posting that is no longer published when the scholar has not applied', async () => {
    reset();
    expect(await loadApplyState(client(), { id: 'p-1', status: 'archived' })).toEqual({ kind: 'closed' });
  });

  it('is "unavailable" when a lookup fails, never a fake "apply"', async () => {
    reset();
    application = { data: null, error: { code: '57014' } };
    expect(await loadApplyState(client(), POSTING)).toEqual({ kind: 'unavailable' });
  });
});

describe('ApplyPanel states', () => {
  const props = { postingId: 'p-1', postingTitle: 'Adjunct NT', institutionName: 'Real Seminary', nextPath: '/opportunities/adjunct-nt' };

  it('links a signed-out visitor to sign in', () => {
    const markup = html(createElement(ApplyPanel, { ...props, state: { kind: 'signed_out' } }));
    expect(markup).toContain('href="/login?next=%2Fopportunities%2Fadjunct-nt"');
    expect(markup).toContain('Sign in to apply');
  });

  it('links a user who is not eligible to their profile (or onboarding)', () => {
    expect(html(createElement(ApplyPanel, { ...props, state: { kind: 'not_eligible', hasProfile: true } }))).toContain('href="/dashboard/profile"');
    expect(html(createElement(ApplyPanel, { ...props, state: { kind: 'not_eligible', hasProfile: false } }))).toContain('href="/dashboard/onboarding"');
  });

  it('shows institution users no apply control, only a neutral note', () => {
    const markup = html(createElement(ApplyPanel, { ...props, state: { kind: 'institution' } }));
    expect(markup).toContain('Institution accounts do not apply to positions.');
    expect(markup).not.toContain('<button');
    expect(markup).not.toContain('href=');
  });

  it('renders the apply button, and no modal until it is opened', () => {
    const markup = html(createElement(ApplyPanel, { ...props, state: { kind: 'apply' } }));
    expect(markup).toContain('Express Interest');
    expect(markup).not.toContain('role="dialog"');
  });

  it('shows the real status and a withdraw button while the application is open', () => {
    const applied = { kind: 'applied' as const, applicationId: 'app-1', status: 'under_review' as const, appliedAt: '2026-10-01T10:00:00Z' };
    const markup = html(createElement(ApplyPanel, { ...props, state: applied }));
    expect(markup).toContain('data-status="under_review"');
    expect(markup).toContain('Under review');
    expect(markup).toContain('Withdraw application');
  });

  it.each(['declined', 'withdrawn'] as const)('offers no withdraw once the application is %s', (status) => {
    const markup = html(
      createElement(ApplyPanel, { ...props, state: { kind: 'applied', applicationId: 'app-1', status, appliedAt: '2026-10-01T10:00:00Z' } })
    );
    expect(markup).toContain(`data-status="${status}"`);
    expect(markup).not.toContain('Withdraw application');
    if (status === 'withdrawn') expect(markup).toContain('You cannot apply to this position again.');
  });
});

describe('ExpressInterestModal', () => {
  const markup = () =>
    html(
      createElement(ExpressInterestModal, {
        isOpen: true,
        onClose: () => {},
        onApplied: () => {},
        postingId: 'p-1',
        postingTitle: 'Adjunct NT',
        institutionName: 'Real Seminary',
      })
    );

  it('caps the note at 4000 characters with a visible counter', () => {
    expect(markup()).toContain('maxLength="4000"');
    expect(markup()).toContain('0 / 4000');
  });

  it('discloses who sees the login email, when, and what the institution keeps after withdrawal', () => {
    const text = markup();
    expect(text).toContain('Your account login email is shared with the institution');
    expect(text).toContain('any member of that institution can view it');
    expect(text).toContain('only once an interview is scheduled');
    expect(text).toContain('the institution keeps the dossier and cover note you sent');
  });

  it('labels the note field for assistive technology', () => {
    expect(markup()).toMatch(/<label[^>]*for="express-interest-note"/);
  });
});
