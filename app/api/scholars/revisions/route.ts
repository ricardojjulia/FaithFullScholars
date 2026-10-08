import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionContext } from '@/lib/auth/session';
import {
  MAX_SNAPSHOT_BYTES,
  REVISION_SELECT_COLUMNS,
  findOpenRevision,
  loadRevisionState,
  loadTaxonomy,
  sanitizeSnapshot,
} from '@/lib/profiles/revision-service';

export const dynamic = 'force-dynamic';

// The stored snapshot exceeded the database size check (stored JSON can be larger than the request).
const TOO_LARGE_ERROR = 'The profile is too large to save. Shorten some entries and try again.';
const GENERIC_ERROR = 'Unable to process the request. Please try again.';

function isCode(error: unknown, code: string): boolean {
  return !!error && typeof error === 'object' && (error as { code?: string }).code === code;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const session = await getSessionContext(supabase);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (session.lookupFailed) {
      return NextResponse.json({ error: 'Your access could not be verified right now. Please try again.' }, { status: 503 });
    }
    if (!session.scholarId) {
      return NextResponse.json({ error: 'Scholar profile not found' }, { status: 404 });
    }

    const state = await loadRevisionState(supabase, session.scholarId);
    if (!state) {
      return NextResponse.json({ error: 'Scholar profile not found' }, { status: 404 });
    }
    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const session = await getSessionContext(supabase);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (session.lookupFailed) {
      return NextResponse.json({ error: 'Your access could not be verified right now. Please try again.' }, { status: 503 });
    }
    if (!session.scholarId) {
      return NextResponse.json({ error: 'Scholar profile not found' }, { status: 404 });
    }
    const scholarId = session.scholarId;

    // Size cap is enforced before the body is parsed.
    const declared = Number(req.headers.get('content-length') ?? '0');
    if (Number.isFinite(declared) && declared > MAX_SNAPSHOT_BYTES) {
      return NextResponse.json({ error: 'Request body is too large' }, { status: 413 });
    }
    const raw = await req.text();
    if (Buffer.byteLength(raw, 'utf8') > MAX_SNAPSHOT_BYTES) {
      return NextResponse.json({ error: 'Request body is too large' }, { status: 413 });
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const payload = body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
    const rawSnapshot = payload?.snapshot;
    if (!payload || !rawSnapshot || typeof rawSnapshot !== 'object' || Array.isArray(rawSnapshot)) {
      return NextResponse.json({ error: 'A profile snapshot is required' }, { status: 400 });
    }
    const revisionId = typeof payload.revisionId === 'string' ? payload.revisionId : null;

    // Only the allow-listed snapshot is ever written; scholar_id, status,
    // revision_number and admin_notes are never taken from the client.
    // Taxonomy entries are mapped to canonical slugs (ADR 0025); unresolved values
    // are kept (capped) so the scholar can fix them. Submit refuses them.
    const snapshot = sanitizeSnapshot(rawSnapshot, await loadTaxonomy(supabase));

    for (let attempt = 0; attempt < 2; attempt++) {
      const { revision, failed } = await findOpenRevision(supabase, scholarId);
      if (failed) {
        return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
      }

      if (!revision) {
        if (revisionId) {
          return NextResponse.json(
            { error: 'This draft is no longer current. Reload and try again.' },
            { status: 409 }
          );
        }
        const { data: created, error: insertError } = await supabase
          .from('scholar_profile_revisions')
          .insert({ scholar_id: scholarId, status: 'draft', snapshot_data: snapshot })
          .select(REVISION_SELECT_COLUMNS)
          .single();

        if (insertError) {
          if (isCode(insertError, '23505') && attempt === 0) continue;
          if (isCode(insertError, '23514')) {
            return NextResponse.json({ error: TOO_LARGE_ERROR }, { status: 413 });
          }
          if (isCode(insertError, '23505') || isCode(insertError, '42501')) {
            return NextResponse.json({ error: GENERIC_ERROR }, { status: 409 });
          }
          return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
        }

        // Advisory pointer; failure is harmless because the open revision is found by query.
        const createdId = (created as { id?: string } | null)?.id;
        if (createdId) {
          await supabase.from('scholars').update({ draft_revision_id: createdId }).eq('id', scholarId);
        }
        return NextResponse.json({ revision: created }, { status: 201 });
      }

      if (revisionId && revisionId !== revision.id) {
        return NextResponse.json(
          { error: 'This draft is no longer current. Reload and try again.' },
          { status: 409 }
        );
      }
      if (revision.status === 'submitted') {
        return NextResponse.json(
          { error: 'This revision is awaiting review. Withdraw it to edit.' },
          { status: 409 }
        );
      }

      const { data: updated, error: updateError } = await supabase
        .from('scholar_profile_revisions')
        .update({ snapshot_data: snapshot })
        .eq('id', revision.id)
        .eq('scholar_id', scholarId)
        .in('status', ['draft', 'changes_requested'])
        .select(REVISION_SELECT_COLUMNS);

      if (updateError) {
        if (isCode(updateError, '23514')) {
          return NextResponse.json({ error: TOO_LARGE_ERROR }, { status: 413 });
        }
        if (isCode(updateError, '42501')) {
          return NextResponse.json({ error: GENERIC_ERROR }, { status: 409 });
        }
        return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
      }
      if (!updated || updated.length === 0) {
        return NextResponse.json({ error: GENERIC_ERROR }, { status: 409 });
      }
      return NextResponse.json({ revision: updated[0] }, { status: 200 });
    }

    return NextResponse.json({ error: GENERIC_ERROR }, { status: 409 });
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }
}
