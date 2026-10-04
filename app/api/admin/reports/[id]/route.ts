import { NextRequest, NextResponse } from 'next/server';
import { verifyStaffUser } from '@/lib/feedback/auth';
import { processContentReport } from '@/lib/admin/actions';

export const dynamic = 'force-dynamic';

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
    const status = body.status as 'investigating' | 'resolved' | 'dismissed';
    const adminNotes = typeof body.adminNotes === 'string' ? body.adminNotes.trim() : undefined;

    if (!['investigating', 'resolved', 'dismissed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid report status' }, { status: 400 });
    }

    const result = await processContentReport(id, status, adminNotes);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`Failed to update report ${id}:`, err);
    return NextResponse.json({ error: 'Failed to process report update' }, { status: 500 });
  }
}
