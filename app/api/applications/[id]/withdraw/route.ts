import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UUID_REGEX, errorCode, jsonError, resolveCaller } from '@/lib/postings/applications-api';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * The applicant withdraws their own application (ADR 0027). Only the applicant:
 * the update is scoped to the caller's own scholar id, and the database guard
 * refuses anything but `withdrawn` (and refuses leaving a declined or withdrawn
 * state) whatever this route sends.
 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return jsonError('Invalid application.', 400);
    }

    const supabase = await createClient();
    const caller = await resolveCaller(supabase);
    if (!caller.ok) return caller.response;

    if (!caller.session.scholarId) {
      return jsonError('Only the applicant can withdraw an application.', 403);
    }

    const { data, error } = await supabase
      .from('posting_applications')
      .update({ status: 'withdrawn' })
      .eq('id', id)
      .eq('scholar_id', caller.session.scholarId)
      .select('id, status');

    if (error) {
      console.error('POST /api/applications/[id]/withdraw rejected (code):', errorCode(error));
      if (error.code === '42501') {
        return jsonError('This application can no longer be withdrawn.', 409);
      }
      return jsonError('We could not withdraw your application. Please try again later.', 500);
    }
    if (!data || data.length === 0) {
      return jsonError('Application not found.', 404);
    }

    return NextResponse.json({ success: true, status: data[0].status });
  } catch (err: unknown) {
    console.error('POST /api/applications/[id]/withdraw failed:', err instanceof Error ? err.name : 'unknown');
    return jsonError('An unexpected internal error occurred.', 500);
  }
}
