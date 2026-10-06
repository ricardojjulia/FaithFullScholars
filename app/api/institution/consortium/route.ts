/**
 * ==============================================================================
 * FaithFull Scholars — Institution Consortia API Route
 * (ADR 0012)
 *
 * GET  - Fetch all consortia for the authenticated institution
 * POST - Create a new seminary consortium with the caller as lead institution
 * ==============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getInstitutionConsortiums,
  createConsortium,
} from '@/lib/consortium/consortium-service';

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
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!instUser) {
      return NextResponse.json(
        { error: 'Institutional account required.' },
        { status: 403 }
      );
    }

    const consortia = await getInstitutionConsortiums(instUser.institution_id);
    return NextResponse.json({ consortia });
  } catch (err: unknown) {
    console.error('Error fetching consortia:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while retrieving consortia.' },
      { status: 500 }
    );
  }
}

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
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: account } = await supabase
      .from('accounts')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = account?.role === 'admin';

    if (!instUser && !isAdmin) {
      return NextResponse.json(
        { error: 'Institutional account required to create a consortium.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const targetInstitutionId = isAdmin
      ? (body.leadInstitutionId || instUser?.institution_id)
      : instUser?.institution_id;

    if (!targetInstitutionId || !UUID_REGEX.test(targetInstitutionId)) {
      return NextResponse.json(
        { error: 'A valid lead institution UUID must be specified.' },
        { status: 400 }
      );
    }

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Consortium name is required.' },
        { status: 400 }
      );
    }

    const result = await createConsortium(targetInstitutionId, {
      name: body.name,
      slug: body.slug,
      description: body.description,
      website: body.website,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ consortium: result.consortium }, { status: 201 });
  } catch (err: unknown) {
    console.error('Error creating consortium:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating the consortium.' },
      { status: 500 }
    );
  }
}
