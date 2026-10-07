import { describe, it, expect, vi, afterEach } from 'vitest';
import { verifyCaptchaToken } from '@/lib/auth/captcha';

const fetchMock = vi.fn();

afterEach(() => {
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

const cloudflare = (body: unknown) => ({ json: async () => body });

describe('Cloudflare Turnstile CAPTCHA verification', () => {
  it('is not enforced in the unit-test runner or without a configured secret', async () => {
    expect((await verifyCaptchaToken('mock-turnstile-token')).success).toBe(true);
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('TURNSTILE_SECRET_KEY', '');
    expect((await verifyCaptchaToken(undefined)).success).toBe(true);
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

  it('fails closed when Cloudflare cannot be reached', async () => {
    enforce();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockRejectedValue(new Error('network down'));
    expect((await verifyCaptchaToken('real-token')).success).toBe(false);
  });
});
