import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionContext, resolveInstitutionAccess } from '@/lib/auth/session';
import { toggleSaveScholar, removeSavedScholar } from '@/lib/inquiries/actions';
import { fetchSavedScholars } from '@/lib/inquiries/queries';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    const access = resolveInstitutionAccess(await getSessionContext(supabase), body?.institutionId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!body.scholarId) {
      return NextResponse.json({ error: 'scholarId is required' }, { status: 400 });
    }

    const result = await toggleSaveScholar(supabase, access.institutionId, body.scholarId, body.notes);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, saved: result.data?.saved });
  } catch (err: unknown) {
    console.error('POST /api/institution/saved-scholars failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);

    const access = resolveInstitutionAccess(
      await getSessionContext(supabase),
      searchParams.get('institutionId')
    );
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const scholars = await fetchSavedScholars(supabase, access.institutionId);
    return NextResponse.json({ scholars });
  } catch (err: unknown) {
    console.error('GET /api/institution/saved-scholars failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * Explicit removal (never an add). The id is a query parameter, validated as a
 * UUID; the institution comes from the verified session (an optional
 * `institutionId` is honoured only if the caller is a member). Idempotent.
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);

    const access = resolveInstitutionAccess(
      await getSessionContext(supabase),
      searchParams.get('institutionId')
    );
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const scholarId = searchParams.get('scholarId');
    if (!scholarId || !UUID_REGEX.test(scholarId)) {
      return NextResponse.json({ error: 'scholarId must be a valid UUID' }, { status: 400 });
    }

    const result = await removeSavedScholar(supabase, access.institutionId, scholarId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, removed: result.data?.removed ?? false });
  } catch (err: unknown) {
    console.error('DELETE /api/institution/saved-scholars failed:', err instanceof Error ? err.name : 'unknown');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
