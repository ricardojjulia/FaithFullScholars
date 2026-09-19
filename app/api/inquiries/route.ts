import { NextRequest, NextResponse } from 'next/server';
import { sendInquiry } from '@/lib/inquiries/actions';
import { fetchScholarInquiries, fetchInstitutionInquiries } from '@/lib/inquiries/queries';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await sendInquiry(body);

    if (!result.success) {
      const isRateLimit = result.error?.includes('rate limit');
      return NextResponse.json(
        { error: result.error },
        { status: isRateLimit ? 429 : 400 }
      );
    }

    return NextResponse.json({ success: true, inquiryId: result.data?.inquiryId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scholarId = searchParams.get('scholarId');
    const institutionId = searchParams.get('institutionId');
    const status = searchParams.get('status') as 'pending' | 'read' | 'accepted' | 'declined' | 'archived' | null;

    if (scholarId) {
      const inquiries = await fetchScholarInquiries(scholarId, status || 'all');
      return NextResponse.json({ inquiries });
    }

    if (institutionId) {
      const inquiries = await fetchInstitutionInquiries(institutionId, status || 'all');
      return NextResponse.json({ inquiries });
    }

    return NextResponse.json({ error: 'scholarId or institutionId parameter required' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
