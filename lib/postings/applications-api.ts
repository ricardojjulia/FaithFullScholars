/**
 * ==============================================================================
 * FaithFull Scholars — shared helpers for the posting-application API routes
 * (ADR 0027). Every route uses the caller's own (RLS-scoped) client; none of them
 * may reach for the service role. Errors are mapped from SQLSTATE codes to fixed,
 * generic messages: a database message never reaches a response or a log.
 * ==============================================================================
 */

import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSessionContext, type SessionContext } from '@/lib/auth/session';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DAILY_APPLICATION_LIMIT = 20;
const DAY_SECONDS = 24 * 60 * 60;
const FALLBACK_RETRY_AFTER_SECONDS = 3600;

export const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export function jsonError(error: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json({ error }, { status, headers });
}

export type CallerResult =
  | { ok: true; session: SessionContext }
  | { ok: false; response: NextResponse };

/** Resolves the signed-in caller: 401 when signed out, 503 when the session lookup itself failed. */
export async function resolveCaller(supabase: SupabaseClient): Promise<CallerResult> {
  const session = await getSessionContext(supabase);
  if (!session) {
    return { ok: false, response: jsonError('Authentication required.', 401) };
  }
  if (session.lookupFailed) {
    return { ok: false, response: jsonError('Your access could not be verified right now. Please try again.', 503) };
  }
  return { ok: true, session };
}

export type RpcErrorLike = { code?: string | null } | null | undefined;

/** Code only, for logs. Never the message (it can carry query detail). */
export const errorCode = (error: RpcErrorLike): string => error?.code ?? 'unknown';

/**
 * Maps a `submit_posting_application` failure to an HTTP status and a fixed message.
 * 28000 -> 401, 42501 -> 403, P0002 -> 404, 23505 -> 409, FS429 -> 429, 22023 -> 400.
 */
export function mapSubmitError(error: RpcErrorLike): { status: number; message: string } {
  switch (error?.code) {
    case '28000':
      return { status: 401, message: 'Sign in to apply for this opportunity.' };
    case '42501':
      return { status: 403, message: 'An approved scholar profile is required to apply for faculty opportunities.' };
    case 'P0002':
      return { status: 404, message: 'This opportunity is not open for applications.' };
    case '23505':
      return { status: 409, message: 'You have already applied to this opportunity.' };
    case 'FS429':
      return { status: 429, message: 'You have reached the daily application limit. Please try again later.' };
    case '22023':
      return { status: 400, message: 'A cover note of 5 to 4000 characters is required.' };
    default:
      return { status: 500, message: 'We could not submit your application. Please try again later.' };
  }
}

/**
 * Seconds until the caller may apply again: when the 20th newest of their own
 * applications leaves the 24-hour window. Reads the caller's own rows under RLS.
 * Falls back to one hour when it cannot be worked out.
 */
export async function computeRetryAfterSeconds(
  supabase: SupabaseClient,
  scholarId: string | null,
  now: number = Date.now()
): Promise<number> {
  if (!scholarId) return FALLBACK_RETRY_AFTER_SECONDS;
  try {
    const { data, error } = await supabase
      .from('posting_applications')
      .select('created_at')
      .eq('scholar_id', scholarId)
      .order('created_at', { ascending: false })
      .range(DAILY_APPLICATION_LIMIT - 1, DAILY_APPLICATION_LIMIT - 1);
    const createdAt = data?.[0]?.created_at;
    if (error || !createdAt) return FALLBACK_RETRY_AFTER_SECONDS;
    const leavesAt = new Date(createdAt).getTime() + DAY_SECONDS * 1000;
    if (!Number.isFinite(leavesAt)) return FALLBACK_RETRY_AFTER_SECONDS;
    return Math.min(DAY_SECONDS, Math.max(1, Math.ceil((leavesAt - now) / 1000)));
  } catch {
    return FALLBACK_RETRY_AFTER_SECONDS;
  }
}

/** Reads a JSON object body, or null when it is missing, malformed or not an object. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
