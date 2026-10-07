import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * POST /api/admin/reviews/[id] (ADR 0024): staff-only, input validated before
 * any write, reviewer identity from the session, review-function failure codes
 * mapped to 404/409/400, and feedback notes required whenever the scholar is
 * asked to change something or is rejected.
 */

type StaffAuth = { authorized: boolean; status: number; error?: string; user?: { id: string } };
let auth: StaffAuth = { authorized: true, status: 200, user: { id: 'staff-1' } };
const processRevisionReview = vi.fn();

vi.mock('@/lib/feedback/auth', () => ({ verifyStaffUser: async () => auth }));
vi.mock('@/lib/admin/queries', () => ({ fetchRevisionWithBaseline: vi.fn() }));
vi.mock('@/lib/admin/actions', () => ({
  processRevisionReview: (...args: unknown[]) => processRevisionReview(...args),
}));

import { POST } from '@/app/api/admin/reviews/[id]/route';
import { covers } from '../support/covers';

covers('api:POST /api/admin/reviews/[id]');

const ctx = { params: Promise.resolve({ id: 'rev-1' }) };
const post = (body: unknown, raw?: string) =>
  POST(
    new NextRequest('http://localhost:3845/api/admin/reviews/rev-1', {
      method: 'POST',
      body: raw ?? JSON.stringify(body),
    }),
    ctx
  );

const ok = (action: string) => ({ success: true, action, revisionId: 'rev-1', scholarId: 's-1' });

beforeEach(() => {
  auth = { authorized: true, status: 200, user: { id: 'staff-1' } };
  processRevisionReview.mockReset();
});

describe('POST /api/admin/reviews/[id]', () => {
  it('refuses non-staff callers before reading the body', async () => {
    auth = { authorized: false, status: 403, error: 'Forbidden' };
    const res = await post({ action: 'approve' });
    expect(res.status).toBe(403);
    expect(processRevisionReview).not.toHaveBeenCalled();
  });

  it('400 for a malformed body or an unknown action', async () => {
    expect((await post(null, '{not json')).status).toBe(400);
    expect((await post({ action: 'publish' })).status).toBe(400);
    expect(processRevisionReview).not.toHaveBeenCalled();
  });

  it('requires feedback notes to request changes or reject, and bounds their length', async () => {
    for (const action of ['request_changes', 'reject']) {
      expect((await post({ action })).status).toBe(400);
      expect((await post({ action, feedbackNotes: '   ' })).status).toBe(400);
    }
    expect((await post({ action: 'approve', feedbackNotes: 'x'.repeat(2001) })).status).toBe(400);
    expect(processRevisionReview).not.toHaveBeenCalled();
  });

  it('approves without notes, using the session reviewer and never a client-supplied one', async () => {
    processRevisionReview.mockResolvedValue(ok('approve'));
    const res = await post({ action: 'approve', reviewerAccountId: 'attacker' });
    expect(res.status).toBe(200);
    expect(processRevisionReview).toHaveBeenCalledWith({
      revisionId: 'rev-1',
      action: 'approve',
      feedbackNotes: undefined,
      reviewerAccountId: 'staff-1',
    });
  });

  it('passes trimmed notes through for a change request', async () => {
    processRevisionReview.mockResolvedValue(ok('request_changes'));
    const res = await post({ action: 'request_changes', feedbackNotes: '  Add your ordination  ' });
    expect(res.status).toBe(200);
    expect(processRevisionReview.mock.calls[0][0].feedbackNotes).toBe('Add your ordination');
  });

  it('maps failure codes to 404, 409, 400 and a generic 500', async () => {
    const fail = (code?: string) => ({ success: false, action: 'approve', revisionId: 'rev-1', scholarId: '', code, error: 'x' });
    processRevisionReview.mockResolvedValueOnce(fail('not_found'));
    expect((await post({ action: 'approve' })).status).toBe(404);
    processRevisionReview.mockResolvedValueOnce(fail('not_reviewable'));
    expect((await post({ action: 'approve' })).status).toBe(409);
    processRevisionReview.mockResolvedValueOnce(fail('invalid_action'));
    expect((await post({ action: 'approve' })).status).toBe(400);
    processRevisionReview.mockResolvedValueOnce(fail('audit_failed'));
    expect((await post({ action: 'hide' })).status).toBe(500);
  });

  it('maps FS001 and FS002 outcomes to 422 with the unmatched list, without echoing anything else', async () => {
    processRevisionReview.mockResolvedValueOnce({
      success: false,
      action: 'approve',
      revisionId: 'rev-1',
      scholarId: 's-1',
      code: 'taxonomy_unmatched',
      error: 'Approval blocked: x',
      unmatched: [{ kind: 'discipline', value: 'Nope' }],
    });
    const a = await post({ action: 'approve' });
    expect(a.status).toBe(422);
    expect(await a.json()).toEqual({
      error: 'Approval blocked: x',
      code: 'taxonomy_unmatched',
      unmatched: [{ kind: 'discipline', value: 'Nope' }],
    });

    processRevisionReview.mockResolvedValueOnce({
      success: false,
      action: 'approve',
      revisionId: 'rev-1',
      scholarId: 's-1',
      code: 'snapshot_invalid',
      error: 'The submitted profile is invalid.',
    });
    const b = await post({ action: 'approve' });
    expect(b.status).toBe(422);
    expect((await b.json()).code).toBe('snapshot_invalid');
  });
});
