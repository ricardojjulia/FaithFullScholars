import { createHash } from 'node:crypto';

/**
 * Derives the rate-limit key for a request (ADR 0026). The raw IP is hashed
 * before it leaves this module and is never stored or logged.
 *
 * Signed-in users are keyed by account; everyone else by a salted SHA-256 of the
 * first `x-forwarded-for` hop (Vercel sets it), then `x-real-ip`, then 'unknown'.
 */
export function clientIp(headers: Pick<Headers, 'get'>): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;
  const real = headers.get('x-real-ip')?.trim();
  return real || 'unknown';
}

export function hashIp(ip: string): string {
  const salt = process.env.RATE_LIMIT_SALT ?? '';
  return createHash('sha256').update(`${salt}${ip}`).digest('hex').slice(0, 16);
}

export function searchKey(headers: Pick<Headers, 'get'>, userId?: string | null): string {
  if (userId) return `search:user:${userId}`;
  return `search:ip:${hashIp(clientIp(headers))}`;
}
