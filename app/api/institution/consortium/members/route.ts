/**
 * ==============================================================================
 * FaithFull Scholars — Consortium Members API Route
 * (ADR 0012)
 *
 * POST   - Add an institution member or affiliate to a consortium
 * DELETE - Remove an institution member from a consortium
 * ==============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  addConsortiumMember,
  removeConsortiumMember,
} from '@/lib/consortium/consortium-service';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
      .select('institution_id')
      .eq('account_id', user.id)
      .maybeSingle();

    const { data: account } = await supabase
      .from('accounts')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = account?.role === 'admin';

    if (!instUser && !isAdmin) {
      return NextResponse.json(
        { error: 'Institutional account required.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { consortiumId, institutionId, role } = body;

    if (!consortiumId || !UUID_REGEX.test(consortiumId) || !institutionId || !UUID_REGEX.test(institutionId)) {
      return NextResponse.json(
        { error: 'Valid consortiumId and institutionId UUIDs are required.' },
        { status: 400 }
      );
    }

    if (role && !['lead', 'member', 'affiliate'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be one of: lead, member, affiliate.' },
        { status: 400 }
      );
    }

    const callerInstitutionId = instUser?.institution_id || '';
    const result = await addConsortiumMember(
      callerInstitutionId,
      { consortiumId, institutionId, role },
      isAdmin
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ member: result.member }, { status: 201 });
  } catch (err: unknown) {
    console.error('Error adding consortium member:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while adding consortium member.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
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

    const { data: account } = await supabase
      .from('accounts')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = account?.role === 'admin';

    if (!instUser && !isAdmin) {
      return NextResponse.json(
        { error: 'Institutional account required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const consortiumId = searchParams.get('consortiumId');
    const memberInstitutionId = searchParams.get('institutionId');

    if (!consortiumId || !UUID_REGEX.test(consortiumId) || !memberInstitutionId || !UUID_REGEX.test(memberInstitutionId)) {
      return NextResponse.json(
        { error: 'Valid consortiumId and institutionId UUID query parameters are required.' },
        { status: 400 }
      );
    }

    const callerInstitutionId = instUser?.institution_id || '';
    const result = await removeConsortiumMember(
      callerInstitutionId,
      consortiumId,
      memberInstitutionId,
      isAdmin
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error removing consortium member:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while removing consortium member.' },
      { status: 500 }
    );
  }
}
