import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getInstitutionContracts,
  createContract,
} from '@/lib/contracts/contract-service';
import { CreateContractInput } from '@/lib/contracts/types';

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

    const contracts = await getInstitutionContracts(instUser.institution_id);
    return NextResponse.json({ contracts });
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
    const input: CreateContractInput = {
      ...body,
      institution_id: instUser.institution_id,
    };

    const result = await createContract(input, user.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, contract: result.contract });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
