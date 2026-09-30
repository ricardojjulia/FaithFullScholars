import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { respondToInquiry } from '@/lib/inquiries/actions';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    const isDevOrTest = process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_ROUTES === 'true';

    if (!isDevOrTest && (authError || !user)) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    if (!body.status) {
      return NextResponse.json({ error: 'Status is required.' }, { status: 400 });
    }

    // Verify ownership if user is authenticated
    if (user) {
      const adminDb = createAdminClient();
      const { data: inquiry } = await adminDb
        .from('inquiries')
        .select(`
          id,
          institution_id,
          scholar_id,
          scholars(account_id)
        `)
        .eq('id', id)
        .maybeSingle();

      if (!inquiry) {
        return NextResponse.json({ error: 'Inquiry not found.' }, { status: 404 });
      }

      const scholarAccountId = (inquiry.scholars as { account_id?: string } | null)?.account_id;
      const isScholar = scholarAccountId === user.id;

      let isInstitutionMember = false;
      const { data: instUser } = await adminDb
        .from('institution_users')
        .select('id')
        .eq('account_id', user.id)
        .eq('institution_id', inquiry.institution_id)
        .maybeSingle();

      if (instUser) {
        isInstitutionMember = true;
      }

      if (!isScholar && !isInstitutionMember) {
        return NextResponse.json(
          { error: 'Unauthorized: You do not have permission to respond to this inquiry.' },
          { status: 403 }
        );
      }
    }

    const result = await respondToInquiry(id, body.status, body.response_notes);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
