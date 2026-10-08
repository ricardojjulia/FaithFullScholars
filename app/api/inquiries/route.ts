import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionContext, resolveInstitutionAccess } from '@/lib/auth/session';
import { sendInquiry } from '@/lib/inquiries/actions';
import { fetchScholarInquiries, fetchInstitutionInquiries } from '@/lib/inquiries/queries';
import type { InquiryStatus } from '@/lib/domain/types';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const session = await getSessionContext(supabase);
    const body = await req.json();

    const access = resolveInstitutionAccess(session, body?.institution_id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const result = await sendInquiry(
      supabase,
      { ...body, institution_id: access.institutionId },
      session!.userId
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        {
          status: result.status ?? 400,
          headers: result.retryAfterSeconds ? { 'Retry-After': String(result.retryAfterSeconds) } : undefined,
        }
      );
    }

    return NextResponse.json({ success: true, inquiryId: result.data?.inquiryId });
  } catch (err: unknown) {
    console.error('POST /api/inquiries failed:', err instanceof Error ? err.name : 'unknown');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const session = await getSessionContext(supabase);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }
    if (session.lookupFailed) {
      return NextResponse.json({ error: 'Your access could not be verified right now. Please try again.' }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const scholarId = searchParams.get('scholarId');
    const institutionId = searchParams.get('institutionId');
    const status = (searchParams.get('status') as InquiryStatus | null) || 'all';

    if (institutionId) {
      const access = resolveInstitutionAccess(session, institutionId);
      if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
      }
      const inquiries = await fetchInstitutionInquiries(supabase, access.institutionId, status);
      return NextResponse.json({ inquiries });
    }

    // Scholar inbox: only the caller's own inbox, regardless of any requested id.
    if (!session.scholarId || (scholarId && scholarId !== session.scholarId)) {
      return NextResponse.json({ error: 'You can only view your own inquiries.' }, { status: 403 });
    }

    const inquiries = await fetchScholarInquiries(supabase, session.scholarId, status);
    return NextResponse.json({ inquiries });
  } catch (err: unknown) {
    console.error('GET /api/inquiries failed:', err instanceof Error ? err.name : 'unknown');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
