import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id: postingId } = await params;
    const body = await request.json();
    const { coverNote } = body;

    if (!coverNote || typeof coverNote !== 'string' || coverNote.trim().length < 5) {
      return NextResponse.json(
        { error: 'A meaningful cover note is required.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify posting exists
    const { data: posting, error: postingError } = await supabase
      .from('institution_postings')
      .select('id, title, institution_id, opportunity_type, term, delivery_mode, status')
      .eq('id', postingId)
      .single();

    if (postingError || !posting) {
      return NextResponse.json({ error: 'Posting not found.' }, { status: 404 });
    }

    if (posting.status !== 'published') {
      return NextResponse.json({ error: 'This opportunity is no longer open.' }, { status: 400 });
    }

    // Require authenticated session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required to express interest in faculty opportunities.' },
        { status: 401 }
      );
    }

    // Look up and verify approved scholar profile for this user
    const { data: scholar } = await supabase
      .from('scholars')
      .select('id, full_name, profile_status')
      .eq('account_id', user.id)
      .maybeSingle();

    if (!scholar || scholar.profile_status !== 'approved') {
      return NextResponse.json(
        { error: 'An active, approved scholar profile is required to apply for faculty opportunities.' },
        { status: 403 }
      );
    }

    // Record formal inquiry in accordance with schema
    const { data: inquiry, error: inquiryError } = await supabase
      .from('inquiries')
      .insert({
        institution_id: posting.institution_id,
        scholar_id: scholar.id,
        sender_account_id: user.id,
        opportunity_type: posting.opportunity_type || 'adjunct',
        proposed_term: posting.term || null,
        delivery_mode: posting.delivery_mode || null,
        message: coverNote.trim(),
        contact_email: user.email || 'candidate@faithfullscholars.org',
        status: 'pending',
      })
      .select('id')
      .single();

    if (inquiryError) {
      console.error('Failed to record inquiry expression of interest:', inquiryError);
      return NextResponse.json(
        { error: 'Failed to record expression of interest. Please try again later.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Your expression of interest and dossier have been transmitted successfully.',
        inquiryId: inquiry.id,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('Unexpected error in POST express-interest:', err);
    return NextResponse.json({ error: 'An unexpected internal error occurred.' }, { status: 500 });
  }
}
