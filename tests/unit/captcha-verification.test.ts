import { describe, it, expect } from 'vitest';
import { verifyCaptchaToken } from '@/lib/auth/captcha';

describe('Cloudflare Turnstile CAPTCHA Verification', () => {
  it('allows mock-turnstile-token in development / test environments', async () => {
    const result = await verifyCaptchaToken('mock-turnstile-token');
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('handles verification gracefully when secret key is unset in test runner', async () => {
    const result = await verifyCaptchaToken('any-token-under-test');
    expect(result.success).toBe(true);
  });
});
