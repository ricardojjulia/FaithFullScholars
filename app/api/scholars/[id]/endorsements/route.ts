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
    console.error('Scholar endorsements route failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipientScholarId } = await params;
    const supabase = await createClient();

    // Verify the session with the auth server (getSession() trusts the cookie unverified)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
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
    console.error('Scholar endorsements route failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
