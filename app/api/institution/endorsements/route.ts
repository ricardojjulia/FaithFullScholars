import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionContext, resolveInstitutionAccess } from '@/lib/auth/session';

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

    // Act only for an institution the signed-in caller belongs to (RLS re-checks on insert).
    const access = resolveInstitutionAccess(await getSessionContext(supabase), body.institutionId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const institutionId = access.institutionId;

    // The verified badge reflects the issuing institution's admin-approved status,
    // not a value the issuer can assert for itself.
    const { data: institution } = await supabase
      .from('institutions')
      .select('status')
      .eq('id', institutionId)
      .maybeSingle();

    const { data: endorsement, error } = await supabase
      .from('institution_endorsements')
      .insert({
        institution_id: institutionId,
        scholar_id: scholarId,
        relationship_type: relationshipType,
        department_or_field: departmentOrField,
        endorsement_text: endorsementText,
        is_credential_verified: institution?.status === 'approved',
        status: 'active',
      })
      .select('id, relationship_type, department_or_field, status')
      .single();

    if (error) {
      console.error('Failed to create endorsement:', error);
      return NextResponse.json({ error: 'Could not create endorsement.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, endorsement }, { status: 201 });
  } catch (err: unknown) {
    console.error('endorsement route failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
