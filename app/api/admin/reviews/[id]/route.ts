import { NextRequest, NextResponse } from 'next/server';
import { verifyStaffUser } from '@/lib/feedback/auth';
import { fetchRevisionWithBaseline } from '@/lib/admin/queries';
import { processRevisionReview } from '@/lib/admin/actions';
import { ReviewAction } from '@/lib/domain/types';

export const dynamic = 'force-dynamic';

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
    console.error(`Failed to fetch revision detail ${id}:`, err);
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

  try {
    const body = await request.json();
    const action = body.action as ReviewAction;
    const feedbackNotes = typeof body.feedbackNotes === 'string' ? body.feedbackNotes.trim() : undefined;

    if (!['approve', 'request_changes', 'reject', 'hide'].includes(action)) {
      return NextResponse.json({ error: 'Invalid review action' }, { status: 400 });
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
      return NextResponse.json({ error: result.error || 'Review processing failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error(`Failed to process review for revision ${id}:`, err);
    return NextResponse.json({ error: 'Failed to process review action' }, { status: 500 });
  }
}
