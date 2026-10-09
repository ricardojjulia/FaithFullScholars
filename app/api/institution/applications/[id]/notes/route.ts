import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveInstitutionAccess } from '@/lib/auth/session';
import { UUID_REGEX, errorCode, jsonError, readJsonObject, resolveCaller } from '@/lib/postings/applications-api';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const MAX_NOTE_LENGTH = 4000;

/**
 * Saves the institution's private note on an application (ADR 0027). One note per
 * application (upsert on application_id). The database derives the institution,
 * forces the author, and refuses the applicant and non-members; a refusal is
 * reported as "not found" so existence is not revealed.
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return jsonError('Invalid application.', 400);
    }

    const supabase = await createClient();
    const caller = await resolveCaller(supabase);
    if (!caller.ok) return caller.response;

    const access = resolveInstitutionAccess(caller.session);
    if (!access.ok) {
      return jsonError(access.error, access.status);
    }

    const body = await readJsonObject(request);
    if (typeof body?.body !== 'string' || body.body.length > MAX_NOTE_LENGTH) {
      return jsonError(`A note of up to ${MAX_NOTE_LENGTH} characters is required.`, 400);
    }

    const { data, error } = await supabase
      .from('posting_application_notes')
      .upsert({ application_id: id, body: body.body }, { onConflict: 'application_id' })
      .select('body, updated_at')
      .single();

    if (error) {
      console.error('PUT /api/institution/applications/[id]/notes rejected (code):', errorCode(error));
      if (error.code === '42501' || error.code === '23503') {
        return jsonError('Application not found.', 404);
      }
      return jsonError('We could not save the note. Please try again later.', 500);
    }

    return NextResponse.json({ success: true, body: data.body, updatedAt: data.updated_at });
  } catch (err: unknown) {
    console.error('PUT /api/institution/applications/[id]/notes failed:', err instanceof Error ? err.name : 'unknown');
    return jsonError('An unexpected internal error occurred.', 500);
  }
}
