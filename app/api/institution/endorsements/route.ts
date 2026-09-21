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

    // Verify session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required to issue institutional endorsements.' },
        { status: 401 }
      );
    }

    // Verify authenticated institution membership and approved institution status
    const { data: instUser } = await supabase
      .from('institution_users')
      .select('institution_id, role, institutions(id, status)')
      .eq('account_id', user.id)
      .maybeSingle();

    const institution = (instUser?.institutions as unknown) as { id: string; status: string } | null;
    if (!instUser || !institution || institution.status !== 'approved') {
      return NextResponse.json(
        { error: 'Only authorized members of approved institutions may issue institutional endorsements.' },
        { status: 403 }
      );
    }

    const institutionId = instUser.institution_id;
    // Verified credential status is granted if issued by an institution owner or admin
    const isVerifiedCredential = instUser.role === 'owner' || instUser.role === 'admin';

    const { data: endorsement, error } = await supabase
      .from('institution_endorsements')
      .insert({
        institution_id: institutionId,
        scholar_id: scholarId,
        relationship_type: relationshipType,
        department_or_field: departmentOrField,
        endorsement_text: endorsementText,
        is_credential_verified: isVerifiedCredential,
        status: 'active',
      })
      .select('id, relationship_type, department_or_field, is_credential_verified, status')
      .single();

    if (error) {
      console.error('Failed to insert institutional endorsement:', error);
      return NextResponse.json({ error: 'Failed to record institutional endorsement.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, endorsement }, { status: 201 });
  } catch (err: unknown) {
    console.error('Unexpected error in POST /api/institution/endorsements:', err);
    return NextResponse.json({ error: 'An unexpected internal error occurred.' }, { status: 500 });
  }
}
