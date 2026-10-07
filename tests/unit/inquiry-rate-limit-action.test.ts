import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { covers } from '../support/covers';

covers('api:POST /api/inquiries');

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => {
    throw new Error('admin client must not be used when the insert is refused');
  },
}));

import { sendInquiry, INQUIRY_RATE_LIMIT_SQLSTATE } from '@/lib/inquiries/actions';

function client(insertError: { code: string; message: string } | null) {
  const row = (table: string) => {
    const data =
      table === 'institutions'
        ? { id: 'i1', name: 'Seminary', status: 'approved', contact_email: 'a@b.edu' }
        : table === 'scholars'
          ? { id: 's1', full_name: 'Dr S', profile_status: 'approved', account_id: 'acc' }
          : { id: 'inq1' };
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.eq = () => b;
    b.insert = () => b;
    b.single = async () =>
      table === 'inquiries' && insertError ? { data: null, error: insertError } : { data, error: null };
    return b;
  };
  return { from: row } as unknown as SupabaseClient;
}

const input = {
  institution_id: 'i1',
  scholar_id: 's1',
  opportunity_type: 'adjunct_teaching',
  message: 'We would like to discuss a teaching opportunity with you.',
  contact_email: 'dean@seminary.edu',
} as unknown as Parameters<typeof sendInquiry>[1];

describe('sendInquiry rate-limit mapping (ADR 0026)', () => {
  it('maps the database FS429 refusal to a friendly 429', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await sendInquiry(
      client({ code: INQUIRY_RATE_LIMIT_SQLSTATE, message: 'Unauthorized: inquiry rate limit reached' }),
      input,
      'u1'
    );
    expect(res.success).toBe(false);
    expect(res.status).toBe(429);
    expect(res.error).toMatch(/hourly inquiry limit/);
    expect(res.error).not.toMatch(/Unauthorized/);
  });

  it('keeps other insert failures generic (400, no database detail)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await sendInquiry(client({ code: '23505', message: 'duplicate key secret' }), input, 'u1');
    expect(res.success).toBe(false);
    expect(res.status).toBeUndefined();
    expect(res.error).not.toMatch(/duplicate|secret/);
  });
});
