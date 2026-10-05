import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SubscriptionTier } from '@/lib/subscriptions/types';

export async function POST(req: NextRequest) {
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
      .select('institution_id, institutions(id, status)')
      .eq('account_id', user.id)
      .maybeSingle();

    if (!instUser) {
      return NextResponse.json(
        { error: 'Institutional account required.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const tier = body.tier as SubscriptionTier;

    if (!tier || !['basic', 'verified_seminary', 'premier_partner'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid subscription tier selected.' },
        { status: 400 }
      );
    }

    // Self-service plan changes would grant paid limits without payment (ADR 0023).
    // Until billing exists, plan changes are made by FaithFull Scholars staff.
    return NextResponse.json(
      {
        error:
          'Plan changes are not self-service yet. Please contact the FaithFull Scholars team to change your subscription.',
      },
      { status: 403 }
    );
  } catch (err: unknown) {
    console.error('/api/institution/subscription/upgrade failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
