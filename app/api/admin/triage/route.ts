import { NextRequest, NextResponse } from 'next/server';
import { verifyStaffUser } from '@/lib/feedback/auth';
import { fetchTriageRecords } from '@/lib/feedback/store';
import { FeedbackCategory } from '@/lib/feedback/types';

export async function GET(request: NextRequest) {
  // 1. Authenticate and enforce staff/admin authorization
  const auth = await verifyStaffUser();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // 2. Parse query parameters
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status') as 'open' | 'done' | 'all' | null;
  const categoryParam = searchParams.get('category') as FeedbackCategory | 'ALL' | null;
  const queryParam = searchParams.get('query') || undefined;
  const startDateParam = searchParams.get('startDate') || undefined;
  const endDateParam = searchParams.get('endDate') || undefined;

  try {
    const records = await fetchTriageRecords({
      status: statusParam || 'open',
      category: categoryParam || 'ALL',
      query: queryParam,
      startDate: startDateParam,
      endDate: endDateParam,
    });

    return NextResponse.json({ success: true, records });
  } catch (err) {
    console.error('Failed to query triage records:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve triage records.' },
      { status: 500 }
    );
  }
}
