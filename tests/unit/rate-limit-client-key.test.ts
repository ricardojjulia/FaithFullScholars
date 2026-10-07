import { describe, it, expect, afterEach } from 'vitest';
import { clientIp, hashIp, searchKey } from '@/lib/rate-limit/client-key';

const h = (init: Record<string, string>) => new Headers(init);

describe('rate-limit client key (ADR 0026)', () => {
  const original = process.env.RATE_LIMIT_SALT;
  afterEach(() => {
    if (original === undefined) delete process.env.RATE_LIMIT_SALT;
    else process.env.RATE_LIMIT_SALT = original;
  });

  it('uses the first x-forwarded-for hop, then x-real-ip, then unknown', () => {
    expect(clientIp(h({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }))).toBe('203.0.113.9');
    expect(clientIp(h({ 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7');
    expect(clientIp(h({}))).toBe('unknown');
  });

  it('never puts the raw IP in the key', () => {
    const key = searchKey(h({ 'x-forwarded-for': '203.0.113.9' }));
    expect(key).toMatch(/^search:ip:[0-9a-f]{16}$/);
    expect(key).not.toContain('203.0.113.9');
    expect(key).not.toContain('203');
  });

  it('is stable per IP and differs between IPs', () => {
    expect(hashIp('203.0.113.9')).toBe(hashIp('203.0.113.9'));
    expect(hashIp('203.0.113.9')).not.toBe(hashIp('203.0.113.10'));
  });

  it('changes with the optional salt', () => {
    delete process.env.RATE_LIMIT_SALT;
    const unsalted = hashIp('203.0.113.9');
    process.env.RATE_LIMIT_SALT = 'pepper';
    expect(hashIp('203.0.113.9')).not.toBe(unsalted);
  });

  it('keys signed-in users by account, ignoring the IP', () => {
    expect(searchKey(h({ 'x-forwarded-for': '203.0.113.9' }), 'user-uuid-1')).toBe('search:user:user-uuid-1');
  });
});
