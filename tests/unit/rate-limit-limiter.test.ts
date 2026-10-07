import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpc = vi.fn();
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ rpc }) }));

import { checkLimit, LIMITER_TIMEOUT_MS } from '@/lib/rate-limit/limiter';
import { checkSearchRateLimit, SEARCH_LIMITS } from '@/lib/search/rate-limiter';

describe('checkLimit (ADR 0026)', () => {
  beforeEach(() => {
    rpc.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('calls the RPC with server-derived arguments and maps the row', async () => {
    const reset = new Date(Date.now() + 30_000).toISOString();
    rpc.mockResolvedValue({ data: [{ allowed: true, remaining: 4, reset_at: reset }], error: null });
    const res = await checkLimit('search:ip:abc', 60, 5);
    expect(rpc).toHaveBeenCalledWith('check_rate_limit', { p_key: 'search:ip:abc', p_window_seconds: 60, p_max: 5 });
    expect(res).toEqual({ allowed: true, remaining: 4, resetAt: new Date(reset).getTime(), failed: false });
  });

  it('reports a refusal', async () => {
    rpc.mockResolvedValue({ data: [{ allowed: false, remaining: 0, reset_at: new Date().toISOString() }], error: null });
    expect((await checkLimit('k', 60, 5)).allowed).toBe(false);
  });

  it('fails open for reads and logs the SQLSTATE only', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '57014', message: 'secret internal detail' } });
    const res = await checkLimit('k', 60, 5);
    expect(res.allowed).toBe(true);
    expect(res.failed).toBe(true);
    const logged = JSON.stringify((console.error as ReturnType<typeof vi.fn>).mock.calls);
    expect(logged).toContain('57014');
    expect(logged).not.toContain('secret internal detail');
  });

  it('fails open on a timeout and logs the cause', async () => {
    vi.useFakeTimers();
    try {
      rpc.mockReturnValue(new Promise(() => {}));
      const pending = checkLimit('k', 60, 5);
      await vi.advanceTimersByTimeAsync(LIMITER_TIMEOUT_MS + 1);
      const res = await pending;
      expect(res.allowed).toBe(true);
      expect(res.failed).toBe(true);
      expect(JSON.stringify((console.error as ReturnType<typeof vi.fn>).mock.calls)).toContain('timeout');
    } finally {
      vi.useRealTimers();
    }
  });

  it('treats a thrown error like a failure (fail open) and does not leak it', async () => {
    rpc.mockRejectedValue(new Error('connection string postgres://user:pw@host'));
    const res = await checkLimit('k', 60, 5);
    expect(res.allowed).toBe(true);
    expect(res.failed).toBe(true);
    expect(JSON.stringify((console.error as ReturnType<typeof vi.fn>).mock.calls)).not.toContain('postgres://');
  });
});

describe('checkSearchRateLimit (ADR 0008)', () => {
  beforeEach(() => {
    rpc.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('applies 15/min to anonymous and 120/min to signed-in users', async () => {
    rpc.mockResolvedValue({ data: [{ allowed: true, remaining: 14, reset_at: new Date(Date.now() + 60_000).toISOString() }], error: null });
    const anon = await checkSearchRateLimit('search:ip:x', false);
    expect(rpc).toHaveBeenLastCalledWith('check_rate_limit', { p_key: 'search:ip:x', p_window_seconds: 60, p_max: SEARCH_LIMITS.ANONYMOUS });
    expect(anon.limit).toBe(15);
    await checkSearchRateLimit('search:user:u', true);
    expect(rpc).toHaveBeenLastCalledWith('check_rate_limit', { p_key: 'search:user:u', p_window_seconds: 60, p_max: SEARCH_LIMITS.AUTHENTICATED });
  });

  it('stays available when the limiter errors', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '08006', message: 'down' } });
    const res = await checkSearchRateLimit('search:ip:x', false);
    expect(res.allowed).toBe(true);
  });
});

describe('checkSearchRequest unknown-client bucket', () => {
  beforeEach(() => {
    rpc.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    rpc.mockResolvedValue({ data: [{ allowed: true, remaining: 59, reset_at: new Date(Date.now() + 60_000).toISOString() }], error: null });
  });

  it('gives requests with no client IP their own 60/min limit and logs it', async () => {
    const { checkSearchRequest, UNKNOWN_CLIENT_LIMIT } = await import('@/lib/search/rate-limiter');
    await checkSearchRequest(new Headers({ 'x-real-ip': '198.51.100.7' }));
    expect(rpc.mock.calls[0][1].p_max).toBe(UNKNOWN_CLIENT_LIMIT);
    expect(UNKNOWN_CLIENT_LIMIT).toBe(60);
    expect(console.warn).toHaveBeenCalled();
  });

  it('keeps the 15/min anonymous limit when an IP header is present', async () => {
    const { checkSearchRequest } = await import('@/lib/search/rate-limiter');
    await checkSearchRequest(new Headers({ 'x-forwarded-for': '203.0.113.9' }));
    expect(rpc.mock.calls[0][1].p_max).toBe(15);
  });
});
