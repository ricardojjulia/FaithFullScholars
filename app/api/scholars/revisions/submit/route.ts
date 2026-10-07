import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionContext } from '@/lib/auth/session';
import { validateRevisionData } from '@/lib/profiles/revision-actions';
import { findUnresolved } from '@/lib/taxonomy/resolve';
import {
  REVISION_SELECT_COLUMNS,
  findOpenRevision,
  loadTaxonomy,
  readRevisionPin,
  sanitizeSnapshot,
} from '@/lib/profiles/revision-service';

export const dynamic = 'force-dynamic';

const GENERIC_ERROR = 'Unable to submit the revision. Please try again.';

export async function POST(req: Request) {
  try {
    const revisionPin = await readRevisionPin(req);
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
    // A stale tab must not act on a revision it never saw.
    if (revisionPin && revision?.id !== revisionPin) {
      return NextResponse.json(
        { error: 'This draft is no longer current. Reload and try again.' },
        { status: 409 }
      );
    }
    if (!revision || (revision.status !== 'draft' && revision.status !== 'changes_requested')) {
      return NextResponse.json({ error: 'There is no draft to submit.' }, { status: 409 });
    }

    // Validate the stored snapshot (mapped to slugs), not anything the client sends now.
    const taxonomy = await loadTaxonomy(supabase);
    const snapshot = sanitizeSnapshot(revision.snapshot_data, taxonomy);
    // sanitizeSnapshot clears a Google Scholar link with a bad scheme; validate the
    // stored value too so the scholar is told instead of the link silently vanishing.
    const storedUrl = (revision.snapshot_data as { google_scholar_url?: unknown } | null)?.google_scholar_url;
    const validation = validateRevisionData({
      ...snapshot,
      google_scholar_url:
        snapshot.google_scholar_url ?? (typeof storedUrl === 'string' && storedUrl.trim() ? storedUrl.trim() : null),
    });
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'The profile is not ready to submit.', errors: validation.errors },
        { status: 400 }
      );
    }
    // Approval refuses entries that are not in the taxonomy, so catch them now.
    const unresolved = findUnresolved(snapshot, taxonomy);
    if (unresolved.length > 0) {
      return NextResponse.json(
        {
          error: 'Some disciplines, traditions or confessional standards are not recognised. Replace or remove them before submitting.',
          unresolved,
        },
        { status: 422 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from('scholar_profile_revisions')
      .update({ status: 'submitted', snapshot_data: snapshot })
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
