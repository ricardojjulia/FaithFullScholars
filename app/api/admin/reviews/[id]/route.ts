import { NextRequest, NextResponse } from 'next/server';
import { verifyStaffUser } from '@/lib/feedback/auth';
import { fetchRevisionWithBaseline } from '@/lib/admin/queries';
import { processRevisionReview } from '@/lib/admin/actions';
import { ReviewAction } from '@/lib/domain/types';

export const dynamic = 'force-dynamic';

const REVIEW_ACTIONS: ReviewAction[] = ['approve', 'request_changes', 'reject', 'hide'];
const MAX_NOTES_LENGTH = 2000;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await verifyStaffUser();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Admin authorization required' }, { status: auth.status });
  }

  const { id } = await context.params;

  try {
    const detail = await fetchRevisionWithBaseline(id);
    if (!detail) {
      return NextResponse.json({ error: 'Revision not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: detail });
  } catch (err) {
    console.error('Failed to fetch revision detail:', { name: err instanceof Error ? err.name : 'unknown' });
    return NextResponse.json({ error: 'Failed to retrieve revision detail' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await verifyStaffUser();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Admin authorization required' }, { status: auth.status });
  }

  const { id } = await context.params;

  let body: { action?: unknown; feedbackNotes?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const action = body.action as ReviewAction;
    const feedbackNotes = typeof body.feedbackNotes === 'string' ? body.feedbackNotes.trim() : undefined;

    if (!REVIEW_ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Invalid review action' }, { status: 400 });
    }
    if (feedbackNotes && feedbackNotes.length > MAX_NOTES_LENGTH) {
      return NextResponse.json(
        { error: `Feedback notes must be ${MAX_NOTES_LENGTH} characters or fewer` },
        { status: 400 }
      );
    }
    // The scholar sees these notes; a request for changes or a rejection
    // without a reason leaves them nothing to act on.
    if ((action === 'request_changes' || action === 'reject') && !feedbackNotes) {
      return NextResponse.json(
        { error: 'Feedback notes are required when requesting changes or rejecting' },
        { status: 400 }
      );
    }

    const reviewerAccountId = auth.user!.id;

    const result = await processRevisionReview({
      revisionId: id,
      action,
      feedbackNotes,
      reviewerAccountId,
    });

    if (!result.success) {
      if (result.code === 'not_found') {
        return NextResponse.json({ error: 'Revision not found' }, { status: 404 });
      }
      if (result.code === 'not_reviewable') {
        return NextResponse.json({ error: 'Only submitted revisions can be reviewed' }, { status: 409 });
      }
      if (result.code === 'taxonomy_unmatched') {
        return NextResponse.json(
          { error: result.error, code: result.code, unmatched: result.unmatched ?? [] },
          { status: 422 }
        );
      }
      if (result.code === 'snapshot_invalid') {
        return NextResponse.json({ error: result.error, code: result.code }, { status: 422 });
      }
      if (result.code === 'invalid_action') {
        return NextResponse.json({ error: 'Invalid review action' }, { status: 400 });
      }
      return NextResponse.json({ error: result.error || 'Review processing failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error('Failed to process review action:', { name: err instanceof Error ? err.name : 'unknown' });
    return NextResponse.json({ error: 'Failed to process review action' }, { status: 500 });
  }
}
