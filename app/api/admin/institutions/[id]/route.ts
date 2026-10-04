import { NextRequest, NextResponse } from 'next/server';
import { verifyStaffUser } from '@/lib/feedback/auth';
import { processInstitutionVerification } from '@/lib/admin/actions';

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
    const decision = body.decision as 'approved' | 'rejected' | 'suspended';

    if (!['approved', 'rejected', 'suspended'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid institution decision' }, { status: 400 });
    }

    const result = await processInstitutionVerification(id, decision);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`Failed to verify institution ${id}:`, err);
    return NextResponse.json({ error: 'Failed to process institution verification' }, { status: 500 });
  }
}
