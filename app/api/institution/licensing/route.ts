import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getInstitutionLicensingAgreements,
  requestCourseLicense,
} from '@/lib/licensing/licensing-service';
import { CreateLicensingRequestInput } from '@/lib/licensing/types';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { data: instUser } = await supabase
      .from('institution_users')
      .select('institution_id')
      .eq('account_id', user.id)
      .maybeSingle();

    if (!instUser) {
      return NextResponse.json({ error: 'Institutional account required.' }, { status: 403 });
    }

    const agreements = await getInstitutionLicensingAgreements(instUser.institution_id);
    return NextResponse.json({ agreements });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { data: instUser } = await supabase
      .from('institution_users')
      .select('institution_id, institutions(status)')
      .eq('account_id', user.id)
      .maybeSingle();

    if (!instUser) {
      return NextResponse.json({ error: 'Institutional account required.' }, { status: 403 });
    }

    const body = await req.json();

    const input: CreateLicensingRequestInput = {
      course_id: body.course_id,
      scholar_id: body.scholar_id,
      institution_id: instUser.institution_id,
      consortium_id: body.consortium_id || null,
      license_type: body.license_type || 'syllabus_only',
      term_duration: body.term_duration || '1_academic_year',
      royalty_amount: Number(body.royalty_amount) || 0,
      permitted_students_count: body.permitted_students_count ? Number(body.permitted_students_count) : null,
      custom_terms: body.custom_terms || null,
    };

    const result = await requestCourseLicense(input);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, agreement: result.agreement }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
