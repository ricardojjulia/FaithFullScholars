/**
-- ==============================================================================
-- FaithFull Scholars — Distributed Search Rate Limiter
-- ADR 0008: Search Abuse Gating, Anti-Scraping Defenses & PII Protection
-- ==============================================================================
 */

import { createAdminClient } from '@/lib/supabase/server';

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

/**
 * Enforces distributed token-bucket rate limits on directory search queries.
 */
export async function checkSearchRateLimit(
  fingerprint: string,
  isAuthenticated = false
): Promise<RateLimitResult> {
  const maxAllowed = isAuthenticated
    ? SEARCH_LIMITS.AUTHENTICATED
    : SEARCH_LIMITS.ANONYMOUS;

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc('check_search_rate_limit', {
      p_client_fingerprint: fingerprint,
      p_max_allowed: maxAllowed,
      p_is_authenticated: isAuthenticated,
    });

    if (error || !data || data.length === 0) {
      console.warn('Search rate limit RPC error, failing open safely:', error);
      return {
        allowed: true,
        currentCount: 1,
        remaining: maxAllowed - 1,
        resetEpoch: Math.floor(Date.now() / 1000) + 60,
        limit: maxAllowed,
      };
    }

    const row = data[0];
    return {
      allowed: Boolean(row.allowed),
      currentCount: Number(row.current_count),
      remaining: Number(row.remaining),
      resetEpoch: Number(row.reset_epoch),
      limit: maxAllowed,
    };
  } catch (err) {
    console.error('Unexpected error checking search rate limit:', err);
    return {
      allowed: true,
      currentCount: 1,
      remaining: maxAllowed - 1,
      resetEpoch: Math.floor(Date.now() / 1000) + 60,
      limit: maxAllowed,
    };
  }
}

/**
 * Generate rate limit response headers adhering to standard RFC draft.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const retryAfter = Math.max(0, result.resetEpoch - Math.floor(Date.now() / 1000));

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetEpoch),
  };

  if (!result.allowed) {
    headers['Retry-After'] = String(retryAfter);
  }

  return headers;
}
