import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { covers } from '../support/covers';

covers('api:GET /api/postings');

const checkSearchRequest = vi.fn();
const getAll = vi.fn();
let userId: string | null = null;

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }) } }),
}));
vi.mock('@/lib/search/rate-limiter', async (orig) => ({
  ...(await orig<typeof import('@/lib/search/rate-limiter')>()),
  checkSearchRequest: (...a: unknown[]) => checkSearchRequest(...a),
}));
vi.mock('@/lib/postings/postings-service', async (orig) => ({
  ...(await orig<typeof import('@/lib/postings/postings-service')>()),
  getAllPublishedPostings: (...a: unknown[]) => getAll(...a),
}));

import { GET } from '@/app/api/postings/route';

const req = () =>
  new NextRequest('http://localhost:3845/api/postings', { headers: { 'x-forwarded-for': '203.0.113.9' } });

describe('GET /api/postings rate limit (ADR 0026)', () => {
  beforeEach(() => {
    userId = null;
    checkSearchRequest.mockReset();
    getAll.mockReset().mockResolvedValue([{ id: 'p1' }]);
  });

  it('returns 429 with Retry-After and rate-limit headers, without querying postings', async () => {
    const resetEpoch = Math.floor(Date.now() / 1000) + 30;
    checkSearchRequest.mockResolvedValue({ allowed: false, currentCount: 16, remaining: 0, resetEpoch, limit: 15 });
    const res = await GET(req());
    expect(res.status).toBe(429);
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThanOrEqual(25);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('15');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(getAll).not.toHaveBeenCalled();
    expect(JSON.stringify(await res.json())).not.toMatch(/203\.0\.113\.9/);
  });

  it('serves postings with rate-limit headers when allowed, passing request headers and no user', async () => {
    checkSearchRequest.mockResolvedValue({ allowed: true, currentCount: 1, remaining: 14, resetEpoch: Math.floor(Date.now() / 1000) + 60, limit: 15 });
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(res.headers.get('Retry-After')).toBeNull();
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('14');
    expect((await res.json()).postings).toEqual([{ id: 'p1' }]);
    expect(checkSearchRequest.mock.calls[0][1]).toBeUndefined();
  });

  it('keys a signed-in caller by account (second argument is the user id)', async () => {
    userId = 'user-42';
    checkSearchRequest.mockResolvedValue({ allowed: true, currentCount: 1, remaining: 119, resetEpoch: Math.floor(Date.now() / 1000) + 60, limit: 120 });
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(checkSearchRequest.mock.calls[0][1]).toBe('user-42');
    expect(res.headers.get('X-RateLimit-Limit')).toBe('120');
  });
});
