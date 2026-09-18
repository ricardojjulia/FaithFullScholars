import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeFeedbackFingerprint } from '@/lib/feedback/fingerprint';
import { checkRateLimit } from '@/lib/feedback/rate-limit';
import { upsertFeedbackRecord } from '@/lib/feedback/store';
import { FeedbackCategory, FEEDBACK_CATEGORIES } from '@/lib/feedback/types';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_ROUTE_LENGTH = 500;
const MAX_NOTE_LENGTH = 2000;
const MAX_ERROR_LENGTH = 1000;
const MAX_VERSION_LENGTH = 50;
const MAX_BREADCRUMBS_COUNT = 5;
const MAX_BREADCRUMB_LENGTH = 500;
const MAX_DURATION_SECONDS = 30 * 24 * 60 * 60; // 30 days

export async function POST(request: NextRequest) {
  // 1. Re-check the feature gate server-side (never trust the client alone)
  const isGateEnabled =
    process.env.NEXT_PUBLIC_PILOT_FEEDBACK_ENABLED === 'true' ||
    process.env.PILOT_FEEDBACK_ENABLED === 'true';

  if (!isGateEnabled) {
    return NextResponse.json(
      { error: 'Pilot feedback system is currently disabled.' },
      { status: 403 }
    );
  }

  // 2. Parse request body safely
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Malformed JSON payload.' },
      { status: 400 }
    );
  }

  // 3. Validate and bound every field
  const {
    sessionId,
    route,
    category,
    note,
    errorMessage,
    breadcrumbs,
    appVersion,
    sessionDurationSeconds,
  } = body;

  // Validate session ID as real UUID
  if (typeof sessionId !== 'string' || !UUID_REGEX.test(sessionId)) {
    return NextResponse.json(
      { error: 'Invalid or missing sessionId. Must be a valid UUID.' },
      { status: 400 }
    );
  }

  // Validate category against exact allowlist
  if (
    typeof category !== 'string' ||
    !FEEDBACK_CATEGORIES.includes(category as FeedbackCategory)
  ) {
    return NextResponse.json(
      {
        error: `Invalid category. Allowed values: ${FEEDBACK_CATEGORIES.join(
          ', '
        )}.`,
      },
      { status: 400 }
    );
  }

  // Bound route
  const sanitizedRoute =
    typeof route === 'string'
      ? route.slice(0, MAX_ROUTE_LENGTH).trim() || '/'
      : '/';

  // Bound note
  let sanitizedNote: string | null = null;
  if (typeof note === 'string') {
    sanitizedNote = note.slice(0, MAX_NOTE_LENGTH).trim() || null;
  }

  // Bound error message
  let sanitizedErrorMessage: string | null = null;
  if (typeof errorMessage === 'string') {
    sanitizedErrorMessage =
      errorMessage.slice(0, MAX_ERROR_LENGTH).trim() || null;
  }

  // Bound breadcrumbs array
  let sanitizedBreadcrumbs: string[] = [];
  if (Array.isArray(breadcrumbs)) {
    sanitizedBreadcrumbs = breadcrumbs
      .slice(-MAX_BREADCRUMBS_COUNT)
      .filter((b): b is string => typeof b === 'string')
      .map((b) => b.slice(0, MAX_BREADCRUMB_LENGTH).trim());
  }

  // Bound appVersion
  let sanitizedVersion: string | null = null;
  if (typeof appVersion === 'string') {
    sanitizedVersion = appVersion.slice(0, MAX_VERSION_LENGTH).trim() || null;
  }

  // Bound sessionDurationSeconds (non-negative, sane upper bound)
  let sanitizedDuration: number | null = null;
  if (typeof sessionDurationSeconds === 'number' && !isNaN(sessionDurationSeconds)) {
    const rounded = Math.floor(sessionDurationSeconds);
    if (rounded >= 0 && rounded <= MAX_DURATION_SECONDS) {
      sanitizedDuration = rounded;
    }
  }

  try {
    // 4. Atomic distributed rate limit (20 req/min per session in PostgreSQL)
    const withinLimit = await checkRateLimit(sessionId, 20);
    if (!withinLimit) {
      return NextResponse.json(
        {
          error:
            'Submission rate limit exceeded. Please wait a moment before sending more feedback.',
        },
        { status: 429 }
      );
    }

    // 5. Derive identity server-side (ignore any client-claimed identity)
    let userEmail: string | null = null;
    let userRole: string | null = null;

    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        userEmail = user.email || null;
        userRole =
          user.app_metadata?.role ||
          user.user_metadata?.role ||
          'authenticated';
      }
    } catch {
      // Unauthenticated / anonymous visitor
    }

    // 6. Compute normalized SHA-256 fingerprint server-side (ignore client fingerprint)
    const fingerprint = computeFeedbackFingerprint({
      route: sanitizedRoute,
      category: category as FeedbackCategory,
      errorMessage: sanitizedErrorMessage,
      note: sanitizedNote,
    });

    // 7. Upsert record into PostgreSQL control-plane telemetry table
    const result = await upsertFeedbackRecord({
      fingerprint,
      sessionId,
      route: sanitizedRoute,
      category: category as FeedbackCategory,
      errorMessage: sanitizedErrorMessage,
      note: sanitizedNote,
      breadcrumbs: sanitizedBreadcrumbs,
      userEmail,
      userRole,
      appVersion: sanitizedVersion,
      sessionDurationSeconds: sanitizedDuration,
    });

    return NextResponse.json(
      {
        success: true,
        id: result.id,
        hitCount: result.hitCount,
        reopened: !result.isNew,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error('Unhandled error during feedback submission:', err);
    // Never leak stack traces, secrets, or raw database queries to the client
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing feedback.' },
      { status: 500 }
    );
  }
}
