import { createAdminClient } from '@/lib/supabase/server';

/**
 * The single rate-limit primitive (ADR 0026): calls `public.check_rate_limit`,
 * which is executable by the service role only. The key and the limit are always
 * derived on the server; a client never supplies either.
 *
 * This limiter is for READS only and always fails open: if it errors or takes
 * longer than LIMITER_TIMEOUT_MS, the request is allowed (`failed` is true) and
 * the cause is logged (code or name only). WRITES do not use it: the inquiry cap
 * is a database trigger on `inquiries`, which fails closed by construction.
 */
export const LIMITER_TIMEOUT_MS = 1500;

export interface LimitResult {
  allowed: boolean;
  remaining: number;
  /** Epoch milliseconds when the current window ends. */
  resetAt: number;
  /** True when the limiter itself could not run; the request is then allowed. */
  failed: boolean;
}

export async function checkLimit(
  key: string,
  windowSeconds: number,
  max: number
): Promise<LimitResult> {
  const fallback: LimitResult = {
    allowed: true,
    remaining: max,
    resetAt: Date.now() + windowSeconds * 1000,
    failed: true,
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), LIMITER_TIMEOUT_MS);
    });
    const call = Promise.resolve(
      createAdminClient().rpc('check_rate_limit', {
        p_key: key,
        p_window_seconds: windowSeconds,
        p_max: max,
      })
    );
    const outcome = await Promise.race([call, timeout]);
    if (outcome === 'timeout') {
      console.error('Rate limiter unavailable (timeout)');
      return fallback;
    }
    const { data, error } = outcome;

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
  } finally {
    clearTimeout(timer);
  }
}
