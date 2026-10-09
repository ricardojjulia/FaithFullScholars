import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  UUID_REGEX,
  computeRetryAfterSeconds,
  errorCode,
  jsonError,
  mapSubmitError,
  readJsonObject,
  resolveCaller,
} from '@/lib/postings/applications-api';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Applies to a posting (ADR 0027). Everything that matters is decided in the
 * database by `submit_posting_application`: who may apply, that the posting is
 * published, the duplicate and 20-per-day checks, and the sealed dossier. The
 * client sends only a note; the institution, status and snapshot are never input.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id: postingId } = await params;
    if (!UUID_REGEX.test(postingId)) {
      return jsonError('Invalid opportunity.', 400);
    }

    const supabase = await createClient();
    const caller = await resolveCaller(supabase);
    if (!caller.ok) return caller.response;

    const body = await readJsonObject(request);
    const coverNote = typeof body?.coverNote === 'string' ? body.coverNote.trim() : '';
    if (coverNote.length < 5 || coverNote.length > 4000) {
      return jsonError('A cover note of 5 to 4000 characters is required.', 400);
    }

    const { data, error } = await supabase.rpc('submit_posting_application', {
      p_posting_id: postingId,
      p_cover_note: coverNote,
    });

    if (error) {
      const mapped = mapSubmitError(error);
      console.error('POST /api/postings/[id]/express-interest rejected (code):', errorCode(error));
      if (mapped.status === 429) {
        const retryAfter = await computeRetryAfterSeconds(supabase, caller.session.scholarId);
        return jsonError(mapped.message, 429, { 'Retry-After': String(retryAfter) });
      }
      return jsonError(mapped.message, mapped.status);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Your application and dossier have been sent to the search committee.',
        applicationId: data,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('POST /api/postings/[id]/express-interest failed:', err instanceof Error ? err.name : 'unknown');
    return jsonError('An unexpected internal error occurred.', 500);
  }
}
