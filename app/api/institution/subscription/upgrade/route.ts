import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateSubscriptionTier } from '@/lib/subscriptions/subscription-service';
import { SubscriptionTier, BillingCycle } from '@/lib/subscriptions/types';

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
    const billingCycle = (body.billing_cycle as BillingCycle) || 'monthly';

    if (!tier || !['basic', 'verified_seminary', 'premier_partner'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid subscription tier selected.' },
        { status: 400 }
      );
    }

    const result = await updateSubscriptionTier(instUser.institution_id, tier, billingCycle);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, subscription: result.subscription });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
