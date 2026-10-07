import { createAdminClient } from '@/lib/supabase/server';

/**
 * The single rate-limit primitive (ADR 0026): calls `public.check_rate_limit`,
 * which is executable by the service role only. The key and the limit are always
 * derived on the server; a client never supplies either.
 *
 * Callers decide what a limiter failure means:
 *  - reads fail open  (search stays available; `failed` is true and it is logged),
 *  - writes fail closed (the database trigger enforces the inquiry cap itself).
 */
export interface LimitResult {
  allowed: boolean;
  remaining: number;
  /** Epoch milliseconds when the current window ends. */
  resetAt: number;
  /** True when the limiter itself could not run. `allowed` then reflects `failOpen`. */
  failed: boolean;
}

export async function checkLimit(
  key: string,
  windowSeconds: number,
  max: number,
  options: { failOpen?: boolean } = {}
): Promise<LimitResult> {
  const failOpen = options.failOpen ?? true;
  const fallback: LimitResult = {
    allowed: failOpen,
    remaining: failOpen ? max : 0,
    resetAt: Date.now() + windowSeconds * 1000,
    failed: true,
  };

  try {
    const { data, error } = await createAdminClient().rpc('check_rate_limit', {
      p_key: key,
      p_window_seconds: windowSeconds,
      p_max: max,
    });

    if (error || !Array.isArray(data) || data.length === 0) {
      // Log the SQLSTATE only: never the raw database error, the key or any identifier.
      console.error('Rate limiter unavailable (code):', error?.code ?? 'no-data');
      return fallback;
    }

    const row = data[0] as { allowed: boolean; remaining: number; reset_at: string };
    return {
      allowed: Boolean(row.allowed),
      remaining: Number(row.remaining),
      resetAt: new Date(row.reset_at).getTime(),
      failed: false,
    };
  } catch {
    console.error('Rate limiter unavailable (exception)');
    return fallback;
  }
}
