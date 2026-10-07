/**
 * Cloudflare Turnstile CAPTCHA Server Verification
 * Validates challenge tokens against Cloudflare's siteverify API.
 */

export async function verifyCaptchaToken(
  token?: string,
  remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // Without a configured secret, CAPTCHA is not enforced (local dev, CI, or a
  // deployment that has not enabled Turnstile; `verify:deploy` warns about it).
  // The unit-test runner never calls Cloudflare.
  if (!secretKey || process.env.NODE_ENV === 'test') {
    return { success: true };
  }

  // With a secret configured, every token is verified by Cloudflare, including
  // the client's 'mock-turnstile-token' placeholder, which must never bypass it.
  if (!token) {
    return { success: false, error: 'CAPTCHA challenge is required.' };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const data = (await response.json()) as {
      success: boolean;
      'error-codes'?: string[];
    };

    if (!data.success) {
      return {
        success: false,
        error: 'CAPTCHA verification failed. Please try again.',
      };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('Error verifying Turnstile CAPTCHA:', { name: err instanceof Error ? err.name : 'unknown' });
    return {
      success: false,
      error: 'Unable to verify CAPTCHA challenge at this time.',
    };
  }
}
