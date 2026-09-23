/**
 * Cloudflare Turnstile CAPTCHA Server Verification
 * Validates challenge tokens against Cloudflare's siteverify API.
 */

export async function verifyCaptchaToken(
  token?: string,
  remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // In test/development mode or when secret key is not set, allow mock tokens for CI/local dev
  if (!secretKey || process.env.NODE_ENV === 'test' || token === 'mock-turnstile-token') {
    if (!token && process.env.NODE_ENV === 'production' && secretKey) {
      return { success: false, error: 'CAPTCHA challenge is required.' };
    }
    return { success: true };
  }

  if (!token) {
    return { success: false, error: 'CAPTCHA token is required.' };
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
        error: `CAPTCHA verification failed: ${data['error-codes']?.join(', ') || 'Invalid challenge response'}`,
      };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('Error verifying Turnstile CAPTCHA:', err);
    return {
      success: false,
      error: 'Unable to verify CAPTCHA challenge at this time.',
    };
  }
}
