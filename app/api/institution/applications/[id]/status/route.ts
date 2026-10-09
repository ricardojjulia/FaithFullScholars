import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveInstitutionAccess } from '@/lib/auth/session';
import { isMemberTargetStatus } from '@/lib/postings/application-status';
import { UUID_REGEX, errorCode, jsonError, readJsonObject, resolveCaller } from '@/lib/postings/applications-api';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * An institution member moves an application through review (ADR 0027). Only
 * under_review, interview_scheduled or declined can be requested here; withdrawn
 * is the applicant's. The database guard enforces the transition table (forward
 * only, no exit from declined) whatever this route sends.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
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
    if (!isMemberTargetStatus(body?.status)) {
      return jsonError('Status must be under_review, interview_scheduled or declined.', 400);
    }

    const { data, error } = await supabase
      .from('posting_applications')
      .update({ status: body.status })
      .eq('id', id)
      .in('institution_id', caller.session.institutionIds)
      .select('id, status, status_changed_at');

    if (error) {
      console.error('PATCH /api/institution/applications/[id]/status rejected (code):', errorCode(error));
      if (error.code === '42501') {
        return jsonError('That status change is not allowed for this application.', 409);
      }
      return jsonError('We could not update the application. Please try again later.', 500);
    }
    if (!data || data.length === 0) {
      return jsonError('Application not found.', 404);
    }

    return NextResponse.json({
      success: true,
      status: data[0].status,
      statusChangedAt: data[0].status_changed_at,
    });
  } catch (err: unknown) {
    console.error('PATCH /api/institution/applications/[id]/status failed:', err instanceof Error ? err.name : 'unknown');
    return jsonError('An unexpected internal error occurred.', 500);
  }
}
