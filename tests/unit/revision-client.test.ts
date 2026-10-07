import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  describeFailure,
  fetchRevisionState,
  saveRevision,
  submitRevision,
  withdrawRevision
} from '@/components/dashboard/revision-client';

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('revision-client', () => {
  it('returns data on success and sends revisionId only when present', async () => {
    const fn = mockFetch(200, { revision: { id: 'r1' } });
    const res = await saveRevision({ full_name: 'A B' }, 'r1');
    expect(res.ok).toBe(true);
    expect(JSON.parse(fn.mock.calls[0][1].body)).toEqual({ snapshot: { full_name: 'A B' }, revisionId: 'r1' });
    await saveRevision({ full_name: 'A B' });
    expect(JSON.parse(fn.mock.calls[1][1].body)).toEqual({ snapshot: { full_name: 'A B' } });
    expect(fn.mock.calls[0][1].method).toBe('PUT');
  });

  it('surfaces 400 validation errors', async () => {
    mockFetch(400, { error: 'Invalid', errors: ['Full name is required.'] });
    const res = await saveRevision({ full_name: '' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(400);
      expect(describeFailure(res)).toBe('Invalid Full name is required.');
    }
  });

  it('reports status for 401 and 409', async () => {
    mockFetch(401, { error: 'Authentication required' });
    const a = await fetchRevisionState();
    expect(!a.ok && a.status).toBe(401);
    mockFetch(409, { error: 'Awaiting review' });
    const b = await submitRevision('r1');
    expect(!b.ok && b.status).toBe(409);
  });

  it('handles network failure and non-JSON bodies', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));
    const a = await withdrawRevision();
    expect(!a.ok && a.status).toBe(0);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error('x'); } }));
    const b = await fetchRevisionState();
    expect(!b.ok && b.error).toMatch(/try again/i);
  });
});
