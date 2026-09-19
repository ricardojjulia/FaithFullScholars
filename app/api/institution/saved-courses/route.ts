import { NextRequest, NextResponse } from 'next/server';
import { toggleSaveCourse } from '@/lib/inquiries/actions';
import { fetchSavedCourses } from '@/lib/inquiries/queries';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.institutionId || !body.courseId) {
      return NextResponse.json(
        { error: 'institutionId and courseId are required' },
        { status: 400 }
      );
    }

    const result = await toggleSaveCourse(body.institutionId, body.courseId, body.notes);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, saved: result.data?.saved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get('institutionId');

    if (!institutionId) {
      return NextResponse.json({ error: 'institutionId is required' }, { status: 400 });
    }

    const courses = await fetchSavedCourses(institutionId);
    return NextResponse.json({ courses });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
