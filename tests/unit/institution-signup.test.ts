import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Institution self-signup must never attach the new account to an existing
 * institution. Previously, signing up with an existing institution's name and
 * role title "owner" made the caller an owner of that (approved) institution.
 */

const state = vi.hoisted(() => ({
  existingSlugs: new Set<string>(),
  signUp: vi.fn(async () => ({ data: { user: { id: 'new-user' } }, error: null })),
  inserts: [] as Array<{ table: string; row: Record<string, unknown> }>,
}));

vi.mock('@/lib/auth/captcha', () => ({
  verifyCaptchaToken: async () => ({ success: true }),
}));

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

function adminQuery(table: string) {
  let slug: string | undefined;
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: (column: string, value: string) => {
      if (column === 'slug') slug = value;
      return builder;
    },
    maybeSingle: async () => ({
      data: table === 'institutions' && slug && state.existingSlugs.has(slug) ? { id: 'existing-inst' } : null,
      error: null,
    }),
    upsert: async (row: Record<string, unknown>) => {
      state.inserts.push({ table, row });
      return { error: null };
    },
    insert: (row: Record<string, unknown>) => {
      state.inserts.push({ table, row });
      const result = { data: { id: table === 'institutions' ? 'new-inst' : 'row' }, error: null };
      return Object.assign(Promise.resolve({ error: null }), {
        select: () => ({ single: async () => result }),
      });
    },
  };
  return builder;
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { signUp: state.signUp } }),
  createAdminClient: () => ({ from: (table: string) => adminQuery(table) }),
}));

import { signupInstitution } from '@/lib/auth/auth-actions';

const base = {
  email: 'attacker@example.org',
  password: 'correct-horse-battery',
  fullName: 'A. Person',
  captchaToken: 'ok',
};

describe('signupInstitution', () => {
  beforeEach(() => {
    state.existingSlugs = new Set(['westminster-theological-seminary']);
    state.signUp.mockClear();
    state.inserts = [];
  });

  it('refuses to join an existing institution, even with role title "owner", before creating a login', async () => {
    const res = await signupInstitution({
      ...base,
      institutionName: 'Westminster Theological Seminary',
      roleTitle: 'owner',
    });

    expect(res.success).toBe(false);
    expect(state.signUp).not.toHaveBeenCalled();
    expect(state.inserts.filter((i) => i.table === 'institution_users')).toHaveLength(0);
  });

  it('creates a new pending institution owned by the registrant, ignoring the free-text role title', async () => {
    const res = await signupInstitution({
      ...base,
      institutionName: 'New Covenant Bible Institute',
      roleTitle: 'Academic Dean',
    });

    expect(res.success).toBe(true);
    const institution = state.inserts.find((i) => i.table === 'institutions')!.row;
    expect(institution).toMatchObject({ status: 'pending', contact_email: base.email });

    const membership = state.inserts.find((i) => i.table === 'institution_users')!.row;
    expect(membership).toEqual({ institution_id: 'new-inst', account_id: 'new-user', role: 'owner' });
  });
});
