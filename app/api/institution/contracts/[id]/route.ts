import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getContractById, updateContractStatus } from '@/lib/contracts/contract-service';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { id } = await params;
    const contract = await getContractById(id);
    if (!contract) {
      return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });
    }
    return NextResponse.json({ contract });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, institution_notes, scholar_notes } = body;

    const result = await updateContractStatus(id, status, { institution_notes, scholar_notes });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
