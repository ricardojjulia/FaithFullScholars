import { createAdminClient } from '@/lib/supabase/server';

/**
 * Checks and records a request against the atomic, distributed rate limiter in PostgreSQL.
 * Defaults to 20 submissions per minute per session ID.
 *
 * @returns true if allowed, false if rate limit exceeded.
 */
export async function checkRateLimit(
  sessionId: string,
  maxRequests: number = 20
): Promise<boolean> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient.rpc(
    'check_pilot_feedback_rate_limit',
    {
      p_session_id: sessionId,
      p_max_requests: maxRequests,
    }
  );

  if (error) {
    console.error('Failed to execute rate limit RPC in PostgreSQL:', error);
    // On unexpected database error, fail closed or bubble up
    throw new Error('Rate limit check failed');
  }

  return Boolean(data);
}
