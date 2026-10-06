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

import { processRevisionReview } from '@/lib/admin/actions';
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
});
