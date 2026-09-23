import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateContractStatus, getContractById } from '@/lib/contracts/contract-service';

export async function POST(
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

    const { data: scholar } = await supabase
      .from('scholars')
      .select('id')
      .eq('account_id', user.id)
      .maybeSingle();

    if (!scholar) {
      return NextResponse.json({ error: 'Scholar profile required.' }, { status: 403 });
    }

    const { id } = await params;
    const contract = await getContractById(id);

    if (!contract || contract.scholar_id !== scholar.id) {
      return NextResponse.json({ error: 'Contract not found or not assigned to you.' }, { status: 404 });
    }

    const body = await req.json();
    const { action, scholar_notes } = body; // action: 'accept' | 'decline'

    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    const result = await updateContractStatus(id, newStatus, { scholar_notes });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
