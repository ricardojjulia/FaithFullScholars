import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionContext } from '@/lib/auth/session';
import { validateRevisionData } from '@/lib/profiles/revision-actions';
import {
  REVISION_SELECT_COLUMNS,
  findOpenRevision,
  sanitizeSnapshot,
} from '@/lib/profiles/revision-service';

export const dynamic = 'force-dynamic';

const GENERIC_ERROR = 'Unable to submit the revision. Please try again.';

export async function POST() {
  try {
    const supabase = await createClient();
    const session = await getSessionContext(supabase);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!session.scholarId) {
      return NextResponse.json({ error: 'Scholar profile not found' }, { status: 404 });
    }

    const { revision, failed } = await findOpenRevision(supabase, session.scholarId);
    if (failed) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
    }
    if (!revision || (revision.status !== 'draft' && revision.status !== 'changes_requested')) {
      return NextResponse.json({ error: 'There is no draft to submit.' }, { status: 409 });
    }

    // Validate the stored snapshot, not anything the client sends now.
    const validation = validateRevisionData(sanitizeSnapshot(revision.snapshot_data));
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'The profile is not ready to submit.', details: validation.errors },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from('scholar_profile_revisions')
      .update({ status: 'submitted' })
      .eq('id', revision.id)
      .eq('scholar_id', session.scholarId)
      .in('status', ['draft', 'changes_requested'])
      .select(REVISION_SELECT_COLUMNS);

    if (updateError) {
      const code = (updateError as { code?: string }).code;
      return NextResponse.json({ error: GENERIC_ERROR }, { status: code === '42501' ? 409 : 500 });
    }
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 409 });
    }
    return NextResponse.json({ revision: updated[0] }, { status: 200 });
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }
}
