import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    if (!title || !term || !description) {
      return NextResponse.json(
        { error: 'Title, term, and description are required.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Look up institution for user or fallback to pilot seminary
    let institutionId = 'e1000000-0000-0000-0000-000000000001';

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: instUser } = await supabase
        .from('institution_users')
        .select('institution_id')
        .eq('account_id', user.id)
        .maybeSingle();

      if (instUser) {
        institutionId = instUser.institution_id;
      }
    }

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
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, posting }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
