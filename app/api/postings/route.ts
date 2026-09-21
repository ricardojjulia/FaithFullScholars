import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAllPublishedPostings, validatePostingInput } from '@/lib/postings/postings-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined;
    const disciplineSlug = searchParams.get('discipline') || undefined;
    const traditionSlug = searchParams.get('tradition') || undefined;

    const postings = await getAllPublishedPostings({
      opportunityType: type,
      disciplineSlug,
      traditionSlug,
    });

    return NextResponse.json({ postings });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      opportunityType,
      disciplineId,
      traditionId,
      term,
      deliveryMode,
      requiredDegree,
      description,
      confessionalRequirements,
      compensationNotes,
      deadline,
    } = body;

    const validation = validatePostingInput({
      title,
      opportunity_type: opportunityType || 'adjunct',
      required_degree: requiredDegree || 'Doctorate (Ph.D., Th.D., D.Phil.)',
      term,
      description,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid posting data.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required to publish institution opportunities.' },
        { status: 401 }
      );
    }

    // Verify authenticated institution membership and approved institution status
    const { data: instUser } = await supabase
      .from('institution_users')
      .select('institution_id, institutions(id, status)')
      .eq('account_id', user.id)
      .maybeSingle();

    const institution = (instUser?.institutions as unknown) as { id: string; status: string } | null;
    if (!instUser || !institution || institution.status !== 'approved') {
      return NextResponse.json(
        { error: 'Only authorized members of approved institutions may publish opportunities.' },
        { status: 403 }
      );
    }

    const institutionId = instUser.institution_id;

    // Generate slug
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const { data: posting, error } = await supabase
      .from('institution_postings')
      .insert({
        institution_id: institutionId,
        title,
        slug,
        opportunity_type: opportunityType || 'adjunct',
        discipline_id: disciplineId || null,
        tradition_id: traditionId || null,
        required_degree: requiredDegree || 'Doctorate (Ph.D., Th.D., D.Phil.)',
        delivery_mode: deliveryMode || 'in_person',
        term,
        description,
        confessional_requirements: confessionalRequirements || null,
        compensation_notes: compensationNotes || null,
        deadline: deadline || null,
        status: 'published',
      })
      .select('id, slug, title')
      .single();

    if (error) {
      console.error('Failed to create institution posting:', error);
      return NextResponse.json({ error: 'Failed to create opportunity posting.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, posting }, { status: 201 });
  } catch (err: unknown) {
    console.error('Unexpected error in POST /api/postings:', err);
    return NextResponse.json({ error: 'An unexpected internal error occurred.' }, { status: 500 });
  }
}
