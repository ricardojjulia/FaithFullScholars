/**
 * Directory search rate limits (ADR 0008, enforced since ADR 0026).
 * Built on the persistent primitive in lib/rate-limit/limiter.ts.
 */

import { checkLimit } from '@/lib/rate-limit/limiter';
import { clientIp, searchKey, UNKNOWN_IP } from '@/lib/rate-limit/client-key';

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  remaining: number;
  resetEpoch: number;
  limit: number;
}

export const SEARCH_LIMITS = {
  ANONYMOUS: 15,
  AUTHENTICATED: 120,
} as const;

/** Requests with no usable client IP share one bucket, so it is more generous. */
export const UNKNOWN_CLIENT_LIMIT = 60;

export const SEARCH_WINDOW_SECONDS = 60;

/**
 * Counts one search against `key` (from lib/rate-limit/client-key.ts searchKey).
 * Reads fail open: if the limiter cannot run (or times out), the search is
 * allowed and the cause is logged by the limiter (code only).
 */
export async function checkSearchRateLimit(
  key: string,
  isAuthenticated = false,
  limitOverride?: number
): Promise<RateLimitResult> {
  const limit = limitOverride ?? (isAuthenticated ? SEARCH_LIMITS.AUTHENTICATED : SEARCH_LIMITS.ANONYMOUS);
  const result = await checkLimit(key, SEARCH_WINDOW_SECONDS, limit);

  return {
    allowed: result.allowed,
    currentCount: result.failed ? 0 : limit - result.remaining,
    remaining: result.remaining,
    resetEpoch: Math.ceil(result.resetAt / 1000),
    limit,
  };
}

/**
 * Rate-limits one public search request: signed-in users by account (120/min),
 * everyone else by hashed client IP (15/min). `headers` is the request headers.
 */
export function checkSearchRequest(
  headers: Pick<Headers, 'get'>,
  userId?: string | null
): Promise<RateLimitResult> {
  if (!userId && clientIp(headers) === UNKNOWN_IP) {
    // No trustworthy client IP header: a shared bucket with its own limit.
    console.warn('Search rate limit: no client IP header; using the shared unknown bucket');
    return checkSearchRateLimit(searchKey(headers), false, UNKNOWN_CLIENT_LIMIT);
  }
  return checkSearchRateLimit(searchKey(headers, userId), Boolean(userId));
}

/**
 * Seconds until the limit resets (at least 1 while limited).
 */
export function retryAfterSeconds(result: RateLimitResult): number {
  return Math.max(1, result.resetEpoch - Math.floor(Date.now() / 1000));
}

/**
 * Generate rate limit response headers adhering to standard RFC draft.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetEpoch),
  };

  if (!result.allowed) {
    headers['Retry-After'] = String(retryAfterSeconds(result));
  }

  return headers;
}
