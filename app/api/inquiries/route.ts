import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendInquiry } from '@/lib/inquiries/actions';
import { fetchScholarInquiries, fetchInstitutionInquiries } from '@/lib/inquiries/queries';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required. Only verified institutional accounts may dispatch inquiries.' },
        { status: 401 }
      );
    }

    // Verify authenticated institution membership and approved status
    const { data: instUser } = await supabase
      .from('institution_users')
      .select('institution_id, institutions(id, status)')
      .eq('account_id', user.id)
      .maybeSingle();

    const institution = (instUser?.institutions as unknown) as { id: string; status: string } | null;
    if (!instUser || !institution || institution.status !== 'approved') {
      return NextResponse.json(
        { error: 'Only authorized members of approved institutions may dispatch inquiries.' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Enforce verified institution_id and senderAccountId from authenticated session
    const result = await sendInquiry(
      {
        ...body,
        institution_id: instUser.institution_id,
      },
      user.id
    );

    if (!result.success) {
      const isRateLimit = result.error?.includes('rate limit');
      return NextResponse.json(
        { error: result.error },
        { status: isRateLimit ? 429 : 400 }
      );
    }

    return NextResponse.json({ success: true, inquiryId: result.data?.inquiryId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const scholarId = searchParams.get('scholarId');
    const institutionId = searchParams.get('institutionId');
    const status = searchParams.get('status') as 'pending' | 'read' | 'accepted' | 'declined' | 'archived' | null;

    if (scholarId) {
      const { data: scholar } = await supabase
        .from('scholars')
        .select('id')
        .eq('account_id', user.id)
        .eq('id', scholarId)
        .maybeSingle();

      if (!scholar) {
        return NextResponse.json({ error: 'Unauthorized to view these inquiries' }, { status: 403 });
      }

      const inquiries = await fetchScholarInquiries(scholarId, status || 'all');
      return NextResponse.json({ inquiries });
    }

    if (institutionId) {
      const { data: instUser } = await supabase
        .from('institution_users')
        .select('institution_id')
        .eq('account_id', user.id)
        .eq('institution_id', institutionId)
        .maybeSingle();

      if (!instUser) {
        return NextResponse.json({ error: 'Unauthorized to view these inquiries' }, { status: 403 });
      }

      const inquiries = await fetchInstitutionInquiries(institutionId, status || 'all');
      return NextResponse.json({ inquiries });
    }

    return NextResponse.json({ error: 'scholarId or institutionId parameter required' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
