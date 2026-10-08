import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * respondToInquiry: only the recipient scholar may accept or decline, nothing is
 * written for anyone else, and the institution's contact email is returned only
 * when the inquiry is accepted.
 */

vi.mock('@/lib/supabase/server', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/notifications/email-service', () => ({
  notifyScholarOfNewInquiry: vi.fn(async () => undefined),
  notifyInstitutionOfInquiryResponse: vi.fn(async () => undefined),
}));

import { respondToInquiry } from '@/lib/inquiries/actions';

const RECIPIENT = 'scholar-recipient';
let updates: Array<Record<string, unknown>> = [];

function client(): SupabaseClient {
  const row = {
    id: 'inq-1',
    status: 'pending',
    contact_email: 'dean@example.edu',
    institution_id: 'inst-1',
    scholar_id: RECIPIENT,
    institutions: { name: 'Example Seminary' },
    scholars: { full_name: 'Dr. Example' },
  };
  return {
    from: () => {
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.eq = () => b;
      b.single = async () => ({ data: row, error: null });
      b.update = (payload: Record<string, unknown>) => {
        updates.push(payload);
        return { eq: async () => ({ error: null }) };
      };
      return b;
    },
  } as unknown as SupabaseClient;
}

beforeEach(() => {
  updates = [];
});

describe('respondToInquiry', () => {
  it('refuses accept or decline from anyone but the recipient scholar, without writing', async () => {
    for (const status of ['accepted', 'declined'] as const) {
      for (const actor of ['another-scholar', null]) {
        const result = await respondToInquiry(client(), 'inq-1', status, null, actor);
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/Only the recipient scholar/);
      }
    }
    expect(updates).toHaveLength(0);
  });

  it('releases the institution contact email only on acceptance', async () => {
    const accepted = await respondToInquiry(client(), 'inq-1', 'accepted', null, RECIPIENT);
    expect(accepted).toMatchObject({ success: true, data: { contactEmail: 'dean@example.edu' } });

    for (const status of ['declined', 'read', 'archived'] as const) {
      const result = await respondToInquiry(client(), 'inq-1', status, null, RECIPIENT);
      expect(result.success).toBe(true);
      expect(result.data?.contactEmail).toBeNull();
    }
  });
});
