import { describe, it, expect, vi, afterEach } from 'vitest';
import { verifyCaptchaToken } from '@/lib/auth/captcha';

const fetchMock = vi.fn();

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

/** Simulates a deployment with Turnstile configured (outside the unit-test runner). */
function enforce() {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret');
  vi.stubGlobal('fetch', fetchMock);
}

const cloudflare = (body: unknown, ok = true) => ({ ok, json: async () => body });

describe('Cloudflare Turnstile CAPTCHA verification', () => {
  it('is not enforced without a configured secret', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '');
    vi.stubGlobal('fetch', fetchMock);
    expect((await verifyCaptchaToken('mock-turnstile-token')).success).toBe(true);
    vi.stubEnv('NODE_ENV', 'production');
    expect((await verifyCaptchaToken(undefined)).success).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still verifies when NODE_ENV is "test" but a secret is configured', async () => {
    enforce();
    vi.stubEnv('NODE_ENV', 'test');
    fetchMock.mockResolvedValue(cloudflare({ success: false }));
    expect((await verifyCaptchaToken('mock-turnstile-token')).success).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('never accepts the mock token when a secret is configured; Cloudflare decides', async () => {
    enforce();
    fetchMock.mockResolvedValue(cloudflare({ success: false, 'error-codes': ['invalid-input-response'] }));
    const result = await verifyCaptchaToken('mock-turnstile-token');
    expect(result.success).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Provider error codes are not echoed to the client.
    expect(result.error).not.toContain('invalid-input-response');
  });

  it('requires a token when a secret is configured', async () => {
    enforce();
    expect((await verifyCaptchaToken(undefined)).success).toBe(false);
    expect((await verifyCaptchaToken('')).success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts a token Cloudflare verifies, sending the secret and client IP', async () => {
    enforce();
    fetchMock.mockResolvedValue(cloudflare({ success: true }));
    expect((await verifyCaptchaToken('real-token', '203.0.113.7')).success).toBe(true);
    const body = String(fetchMock.mock.calls[0][1].body);
    expect(body).toContain('secret=test-secret');
    expect(body).toContain('response=real-token');
    expect(body).toContain('remoteip=203.0.113.7');
  });

  it('fails closed on a non-OK provider response', async () => {
    enforce();
    fetchMock.mockResolvedValue(cloudflare({ success: true }, false));
    expect((await verifyCaptchaToken('real-token')).success).toBe(false);
  });

  it('fails closed when Cloudflare cannot be reached', async () => {
    enforce();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockRejectedValue(new Error('network down'));
    expect((await verifyCaptchaToken('real-token')).success).toBe(false);
  });
});
