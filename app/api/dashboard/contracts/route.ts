import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getScholarContracts } from '@/lib/contracts/contract-service';

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

    const { data: scholar } = await supabase
      .from('scholars')
      .select('id')
      .eq('account_id', user.id)
      .maybeSingle();

    if (!scholar) {
      return NextResponse.json({ error: 'Scholar profile required.' }, { status: 403 });
    }

    const contracts = await getScholarContracts(scholar.id);
    return NextResponse.json({ contracts });
  } catch (err: unknown) {
    console.error('/api/dashboard/contracts failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
