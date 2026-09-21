import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scholarId, relationshipType, departmentOrField, endorsementText } = body;

    if (!scholarId || !relationshipType || !departmentOrField || !endorsementText) {
      return NextResponse.json(
        { error: 'All fields (scholar, relationship, department, endorsement) are required.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Default institution or look up user institution
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

    const { data: endorsement, error } = await supabase
      .from('institution_endorsements')
      .insert({
        institution_id: institutionId,
        scholar_id: scholarId,
        relationship_type: relationshipType,
        department_or_field: departmentOrField,
        endorsement_text: endorsementText,
        is_credential_verified: true,
        status: 'active',
      })
      .select('id, relationship_type, department_or_field, status')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, endorsement }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
