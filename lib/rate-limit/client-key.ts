import { createHmac, randomBytes } from 'node:crypto';

/**
 * Derives the rate-limit key for a request (ADR 0026). The raw IP is hashed
 * before it leaves this module and is never stored or logged.
 *
 * Signed-in users are keyed by account; everyone else by HMAC-SHA256(secret, ip).
 * The IP comes from `x-vercel-forwarded-for` (set by Vercel's edge, not
 * client-controllable), then the first `x-forwarded-for` hop. `x-real-ip` is
 * deliberately NOT used: a client can set it. With no usable header the request
 * falls into the 'unknown' bucket, which has its own, more generous limit.
 */
export const UNKNOWN_IP = 'unknown';

export function clientIp(headers: Pick<Headers, 'get'>): string {
  const vercel = headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  if (vercel) return vercel;
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || UNKNOWN_IP;
}

let fallbackSecret: string | null = null;
let warned = false;

/** Test hook: forget the per-process fallback and the one-time warning. */
export function resetRateLimitSecretForTests() {
  fallbackSecret = null;
  warned = false;
}

function hmacSecret(): string {
  const configured = process.env.RATE_LIMIT_SALT;
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production' && !warned) {
    warned = true;
    console.warn('RATE_LIMIT_SALT is not set in production; using a per-process random secret (set it).');
  }
  // Never hash unsalted: a per-process random secret keeps hashes unguessable
  // (limits still hold per instance for the process lifetime).
  fallbackSecret ??= randomBytes(32).toString('hex');
  return fallbackSecret;
}

export function hashIp(ip: string): string {
  return createHmac('sha256', hmacSecret()).update(ip).digest('hex').slice(0, 16);
}

export function searchKey(headers: Pick<Headers, 'get'>, userId?: string | null): string {
  if (userId) return `search:user:${userId}`;
  return `search:ip:${hashIp(clientIp(headers))}`;
}
