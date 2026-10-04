import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionContext } from '@/lib/auth/session';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Scholar → institution "express interest" is not yet backed by storage:
 * `inquiries` is institution → scholar only (RLS requires an institution
 * sender), and no application table exists. This route previously wrote
 * non-existent columns and still reported success with a simulated id.
 * Until the application model is designed, it validates the caller and the
 * posting and then says plainly that submission is unavailable.
 */
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
    const session = await getSessionContext(supabase);

    if (!session) {
      return NextResponse.json({ error: 'Please sign in as a scholar to express interest.' }, { status: 401 });
    }
    if (!session.scholarId) {
      return NextResponse.json({ error: 'Only scholar accounts can express interest.' }, { status: 403 });
    }

    const { data: posting, error: postingError } = await supabase
      .from('institution_postings')
      .select('id, status')
      .eq('id', postingId)
      .single();

    if (postingError || !posting) {
      return NextResponse.json({ error: 'Posting not found.' }, { status: 404 });
    }

    if (posting.status !== 'published') {
      return NextResponse.json({ error: 'This opportunity is no longer open.' }, { status: 400 });
    }

    return NextResponse.json(
      {
        error:
          'Online applications are not available yet. Please use the contact details on the posting.',
      },
      { status: 501 }
    );
  } catch (err: unknown) {
    console.error('POST /api/postings/[id]/express-interest failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
