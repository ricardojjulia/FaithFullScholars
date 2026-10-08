import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canEditInstitutionProfile, getSessionContext, resolveInstitutionAccess } from '@/lib/auth/session';
import { updateInstitutionProfile } from '@/lib/inquiries/actions';
import { validateInstitutionProfile } from '@/lib/inquiries/profile-validation';

const MAX_BODY_BYTES = 8 * 1024;

/**
 * Updates the signed-in owner/admin's own institution profile. The institution is
 * resolved from the session only: any institution id in the body is ignored.
 * Only validated identity fields are written; trust columns are not accepted.
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const session = await getSessionContext(supabase);
    const access = resolveInstitutionAccess(session);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    // Early, friendly refusal; the institutions UPDATE policy enforces the same rule (ADR 0023).
    if (!canEditInstitutionProfile(session, access.institutionId)) {
      return NextResponse.json(
        { error: 'Only institution owners and admins can edit the institution profile.' },
        { status: 403 }
      );
    }

    const declared = Number(req.headers.get('content-length') ?? '0');
    if (declared > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 });
    }

    // Read as text so the size cap also holds for chunked requests without a
    // Content-Length header.
    const raw = await req.text();
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 });
    }
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const validated = validateInstitutionProfile(body);
    if (!validated.ok) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', errors: validated.errors },
        { status: 400 }
      );
    }

    if (Object.keys(validated.value).length === 0) {
      return NextResponse.json({ error: 'No editable fields were provided.' }, { status: 400 });
    }

    const result = await updateInstitutionProfile(supabase, access.institutionId, validated.value);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('PATCH /api/institution/profile failed:', err instanceof Error ? err.name : 'unknown');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
