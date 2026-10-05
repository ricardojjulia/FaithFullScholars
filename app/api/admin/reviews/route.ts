import { NextRequest, NextResponse } from 'next/server';
import { verifyStaffUser } from '@/lib/feedback/auth';
import { fetchPendingRevisions } from '@/lib/admin/queries';
import { RevisionStatus } from '@/lib/domain/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifyStaffUser();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Admin authorization required' }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = (searchParams.get('status') as RevisionStatus | 'all') || 'all';

  try {
    const revisions = await fetchPendingRevisions(statusParam);
    return NextResponse.json({ success: true, revisions });
  } catch (err) {
    console.error('Failed to list revisions:', err);
    return NextResponse.json({ error: 'Failed to retrieve revisions' }, { status: 500 });
  }
}
