import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { clientIp, hashIp, searchKey, resetRateLimitSecretForTests } from '@/lib/rate-limit/client-key';

const h = (init: Record<string, string>) => new Headers(init);
const env = process.env as Record<string, string | undefined>;

describe('rate-limit client key (ADR 0026)', () => {
  const originalSalt = env.RATE_LIMIT_SALT;
  const originalNodeEnv = env.NODE_ENV;
  beforeEach(() => resetRateLimitSecretForTests());
  afterEach(() => {
    if (originalSalt === undefined) delete env.RATE_LIMIT_SALT;
    else env.RATE_LIMIT_SALT = originalSalt;
    env.NODE_ENV = originalNodeEnv;
    vi.restoreAllMocks();
  });

  it('prefers x-vercel-forwarded-for, then the first x-forwarded-for hop, and ignores x-real-ip', () => {
    expect(
      clientIp(h({ 'x-vercel-forwarded-for': '192.0.2.1', 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }))
    ).toBe('192.0.2.1');
    expect(clientIp(h({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }))).toBe('203.0.113.9');
    // x-real-ip is client-settable, so it is never trusted.
    expect(clientIp(h({ 'x-real-ip': '198.51.100.7' }))).toBe('unknown');
    expect(clientIp(h({}))).toBe('unknown');
  });

  it('never puts the raw IP in the key', () => {
    const key = searchKey(h({ 'x-forwarded-for': '203.0.113.9' }));
    expect(key).toMatch(/^search:ip:[0-9a-f]{16}$/);
    expect(key).not.toContain('203.0.113.9');
  });

  it('is stable per IP and differs between IPs', () => {
    expect(hashIp('203.0.113.9')).toBe(hashIp('203.0.113.9'));
    expect(hashIp('203.0.113.9')).not.toBe(hashIp('203.0.113.10'));
  });

  it('is an HMAC keyed by the salt, not a bare SHA-256', () => {
    env.RATE_LIMIT_SALT = 'pepper';
    const withSalt = hashIp('203.0.113.9');
    expect(withSalt).not.toBe(createHash('sha256').update('pepper203.0.113.9').digest('hex').slice(0, 16));
    expect(withSalt).not.toBe(createHash('sha256').update('203.0.113.9').digest('hex').slice(0, 16));
    env.RATE_LIMIT_SALT = 'other';
    expect(hashIp('203.0.113.9')).not.toBe(withSalt);
  });

  it('never hashes unsalted: a missing salt uses a per-process random secret', () => {
    delete env.RATE_LIMIT_SALT;
    env.NODE_ENV = 'test';
    const first = hashIp('203.0.113.9');
    expect(first).not.toBe(createHash('sha256').update('203.0.113.9').digest('hex').slice(0, 16));
    expect(hashIp('203.0.113.9')).toBe(first);
    resetRateLimitSecretForTests();
    expect(hashIp('203.0.113.9')).not.toBe(first);
  });

  it('warns exactly once per process in production when the salt is unset', () => {
    delete env.RATE_LIMIT_SALT;
    env.NODE_ENV = 'production';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    hashIp('a');
    hashIp('b');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('RATE_LIMIT_SALT');
  });

  it('does not warn when the salt is set', () => {
    env.RATE_LIMIT_SALT = 'pepper';
    env.NODE_ENV = 'production';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    hashIp('a');
    expect(warn).not.toHaveBeenCalled();
  });

  it('keys signed-in users by account, ignoring the IP', () => {
    expect(searchKey(h({ 'x-forwarded-for': '203.0.113.9' }), 'user-uuid-1')).toBe('search:user:user-uuid-1');
  });
});
