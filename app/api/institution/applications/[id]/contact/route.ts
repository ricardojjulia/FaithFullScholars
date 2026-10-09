import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveInstitutionAccess } from '@/lib/auth/session';
import { NO_STORE, UUID_REGEX, errorCode, jsonError, resolveCaller } from '@/lib/postings/applications-api';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Reveals the applicant's login email to a member (ADR 0027), only once the
 * application is at interview_scheduled, and never to the applicant. The database
 * function decides; this route reports "not available" for every other case so the
 * reason is not revealed. Never cached.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return jsonError('Invalid application.', 400, NO_STORE);
    }

    const supabase = await createClient();
    const caller = await resolveCaller(supabase);
    if (!caller.ok) {
      caller.response.headers.set('Cache-Control', 'no-store');
      return caller.response;
    }

    const access = resolveInstitutionAccess(caller.session);
    if (!access.ok) {
      return jsonError(access.error, access.status, NO_STORE);
    }

    const { data, error } = await supabase.rpc('get_application_contact', { p_application_id: id });
    if (error) {
      console.error('GET /api/institution/applications/[id]/contact rejected (code):', errorCode(error));
      return jsonError('Contact details could not be loaded. Please try again later.', 500, NO_STORE);
    }
    if (typeof data !== 'string' || data === '') {
      return jsonError('Contact details are not available for this application.', 404, NO_STORE);
    }

    return NextResponse.json({ email: data }, { headers: NO_STORE });
  } catch (err: unknown) {
    console.error('GET /api/institution/applications/[id]/contact failed:', err instanceof Error ? err.name : 'unknown');
    return jsonError('An unexpected internal error occurred.', 500, NO_STORE);
  }
}
