import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionContext, resolveInstitutionAccess } from '@/lib/auth/session';
import { getAllPublishedPostings } from '@/lib/postings/postings-service';

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
    console.error('posting route failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
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

    if (!title || !term || !description) {
      return NextResponse.json(
        { error: 'Title, term, and description are required.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Act only for an institution the signed-in caller belongs to (RLS re-checks on insert).
    const access = resolveInstitutionAccess(await getSessionContext(supabase), body.institutionId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const institutionId = access.institutionId;

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
      console.error('Failed to create posting:', error);
      return NextResponse.json({ error: 'Could not create posting.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, posting }, { status: 201 });
  } catch (err: unknown) {
    console.error('posting route failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
