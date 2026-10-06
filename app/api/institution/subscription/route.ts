import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getInstitutionSubscription } from '@/lib/subscriptions/subscription-service';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    const { data: instUser } = await supabase
      .from('institution_users')
      .select('institution_id, institutions(id, name, status)')
      .eq('account_id', user.id)
      .maybeSingle();

    if (!instUser) {
      return NextResponse.json(
        { error: 'Institutional account required.' },
        { status: 403 }
      );
    }

    const subscription = await getInstitutionSubscription(instUser.institution_id);
    return NextResponse.json({ subscription });
  } catch (err: unknown) {
    console.error('/api/institution/subscription failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
