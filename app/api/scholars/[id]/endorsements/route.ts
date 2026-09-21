import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getApprovedEndorsements,
  submitPeerEndorsement,
  SubmitEndorsementInput,
} from '@/lib/endorsements/endorsement-service';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const endorsements = await getApprovedEndorsements(id);
    return NextResponse.json({ endorsements });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipientScholarId } = await params;
    const supabase = await createClient();

    // Verify session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required to endorse colleagues.' }, { status: 401 });
    }

    // Resolve endorser scholar profile
    const { data: endorserScholar } = await supabase
      .from('scholars')
      .select('id, profile_status')
      .eq('account_id', user.id)
      .single();

    if (!endorserScholar) {
      return NextResponse.json(
        { error: 'Only registered scholars can submit peer endorsements.' },
        { status: 403 }
      );
    }

    const body: SubmitEndorsementInput = await req.json();

    if (!body.relationship || !body.subjectArea || !body.endorsementText) {
      return NextResponse.json(
        { error: 'Relationship, subject area, and endorsement text are required.' },
        { status: 400 }
      );
    }

    const result = await submitPeerEndorsement(endorserScholar.id, {
      recipientScholarId,
      relationship: body.relationship,
      subjectArea: body.subjectArea,
      endorsementText: body.endorsementText,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, endorsement: result.endorsement }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
