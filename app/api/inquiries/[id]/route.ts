import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionContext } from '@/lib/auth/session';
import { respondToInquiry } from '@/lib/inquiries/actions';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const session = await getSessionContext(supabase);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    if (!body.status) {
      return NextResponse.json({ error: 'Status is required.' }, { status: 400 });
    }

    // RLS only exposes inquiries the caller participates in.
    const result = await respondToInquiry(
      supabase,
      id,
      body.status,
      body.response_notes,
      session.scholarId
    );

    if (!result.success) {
      const status = result.error === 'Inquiry not found.' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('PATCH /api/inquiries/[id] failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
