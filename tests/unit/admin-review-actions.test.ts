import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * processRevisionReview (ADR 0024) outside the database function: an unknown
 * action never falls through to the destructive hide path, and hide does not
 * report success when its audit row could not be written. The review function
 * itself is covered by tests/integration/admin-review.test.ts.
 */

let auditError: unknown = null;
let writes: Array<{ table: string; op: string }> = [];
const rpc = vi.fn();

function fakeQuery(table: string) {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.single = async () => ({ data: { id: 'rev-1', scholar_id: 's-1' }, error: null });
  builder.update = () => {
    writes.push({ table, op: 'update' });
    return builder;
  };
  builder.insert = async () => {
    writes.push({ table, op: 'insert' });
    return { error: table === 'profile_reviews' ? auditError : null };
  };
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve);
  return builder;
}

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ from: (table: string) => fakeQuery(table), rpc }),
}));

import { parseUnmatchedDetail, processRevisionReview } from '@/lib/admin/actions';
import type { ReviewAction } from '@/lib/domain/types';

const run = (action: string) =>
  processRevisionReview({ revisionId: 'rev-1', action: action as ReviewAction, reviewerAccountId: 'staff-1' });

beforeEach(() => {
  auditError = null;
  writes = [];
  rpc.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('processRevisionReview', () => {
  it('refuses an unknown action without hiding the scholar', async () => {
    const result = await run('publish');
    expect(result).toMatchObject({ success: false, code: 'invalid_action' });
    expect(writes).toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('hides the scholar and records the decision', async () => {
    const result = await run('hide');
    expect(result.success).toBe(true);
    expect(writes).toEqual([
      { table: 'scholars', op: 'update' },
      { table: 'profile_reviews', op: 'insert' },
    ]);
  });

  it('reports a failure when the hide audit row could not be written', async () => {
    auditError = { code: 'XX000', message: 'secret detail' };
    const result = await run('hide');
    expect(result).toMatchObject({ success: false, code: 'audit_failed' });
    expect(JSON.stringify(result)).not.toContain('secret detail');
  });

  it('routes approve through the atomic database function', async () => {
    rpc.mockResolvedValue({ error: null });
    const result = await run('approve');
    expect(result.success).toBe(true);
    expect(rpc).toHaveBeenCalledWith('review_profile_revision', expect.objectContaining({ p_action: 'approve', p_reviewer: 'staff-1' }));
    expect(writes).toEqual([]);
  });

  it('maps FS001 to taxonomy_unmatched with a validated, capped list and never logs values', async () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ kind: 'discipline', value: `Unknown ${i}` }));
    const detail = JSON.stringify([
      { kind: 'tradition', value: 'x'.repeat(500) },
      { kind: 'bogus', value: 'dropped' },
      { kind: 'confession', value: 42 },
      ...many,
    ]);
    rpc.mockResolvedValue({ error: { code: 'FS001', message: 'taxonomy_unmatched: 3 entries', details: detail } });
    const result = await run('approve');
    expect(result).toMatchObject({ success: false, code: 'taxonomy_unmatched' });
    expect(result.unmatched).toHaveLength(25);
    expect(result.unmatched![0]).toEqual({ kind: 'tradition', value: 'x'.repeat(200) });
    expect(result.error).toContain('do not match the taxonomy');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('still blocks approval with a generic message when the FS001 detail is unusable', async () => {
    rpc.mockResolvedValue({ error: { code: 'FS001', message: 'm', details: 'not json' } });
    const result = await run('approve');
    expect(result).toMatchObject({ success: false, code: 'taxonomy_unmatched', unmatched: [] });
  });

  it('maps FS002 to snapshot_invalid, naming the list and item but never anything else from the database', async () => {
    rpc.mockResolvedValue({ error: { code: 'FS002', message: 'snapshot_invalid: credentials[2] degree is required' } });
    const result = await run('approve');
    expect(result).toMatchObject({ success: false, code: 'snapshot_invalid' });
    expect(result.error).toContain('credentials, item 3: degree is required');

    for (const [message, expected] of [
      ['snapshot_invalid: orcid_id is not a valid ORCID iD', 'orcid_id: is not a valid ORCID iD'],
      ['snapshot_invalid: google_scholar_url must be a Google Scholar citations https link', 'google_scholar_url: must be a Google Scholar citations https link'],
      ['snapshot_invalid: doctrinal_statement_text is too long', 'doctrinal_statement_text: is too long'],
      ['snapshot_invalid: lists violate a database constraint', 'lists: violate a database constraint'],
    ] as const) {
      rpc.mockResolvedValue({ error: { code: 'FS002', message } });
      const scalar = await run('approve');
      expect(scalar.code).toBe('snapshot_invalid');
      expect(scalar.error).toContain(expected);
    }

    rpc.mockResolvedValue({ error: { code: 'FS002', message: 'snapshot_invalid: x\nsecret <script>' } });
    const odd = await run('approve');
    expect(odd.code).toBe('snapshot_invalid');
    expect(odd.error).not.toContain('secret');
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe('parseUnmatchedDetail', () => {
  it('returns [] for anything that is not a JSON array string', () => {
    expect(parseUnmatchedDetail(undefined)).toEqual([]);
    expect(parseUnmatchedDetail('{"kind":"discipline"}')).toEqual([]);
    expect(parseUnmatchedDetail(42)).toEqual([]);
  });
});
