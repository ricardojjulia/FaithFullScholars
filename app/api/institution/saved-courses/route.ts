import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toggleSaveCourse } from '@/lib/inquiries/actions';
import { fetchSavedCourses } from '@/lib/inquiries/queries';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let targetInstitutionId: string;

    if (user) {
      const { data: instUser } = await supabase
        .from('institution_users')
        .select('institution_id')
        .eq('account_id', user.id)
        .maybeSingle();

      if (!instUser) {
        return NextResponse.json({ error: 'Institutional account required.' }, { status: 403 });
      }
      targetInstitutionId = instUser.institution_id;
    } else {
      const isDevOrTest = process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_ROUTES === 'true';
      if (!isDevOrTest) {
        return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
      }
      const bodyPreview = await req.clone().json().catch(() => ({}));
      targetInstitutionId = bodyPreview.institutionId || 'f2000000-0000-0000-0000-000000000001';
    }

    const body = await req.json();
    if (!body.courseId) {
      return NextResponse.json(
        { error: 'courseId is required' },
        { status: 400 }
      );
    }

    const result = await toggleSaveCourse(targetInstitutionId, body.courseId, body.notes);
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let targetInstitutionId: string;

    if (user) {
      const { data: instUser } = await supabase
        .from('institution_users')
        .select('institution_id')
        .eq('account_id', user.id)
        .maybeSingle();

      if (!instUser) {
        return NextResponse.json({ error: 'Institutional account required.' }, { status: 403 });
      }
      targetInstitutionId = instUser.institution_id;
    } else {
      const isDevOrTest = process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_ROUTES === 'true';
      if (!isDevOrTest) {
        return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
      }
      const { searchParams } = new URL(req.url);
      targetInstitutionId = searchParams.get('institutionId') || 'f2000000-0000-0000-0000-000000000001';
    }

    const courses = await fetchSavedCourses(targetInstitutionId);
    return NextResponse.json({ courses });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
