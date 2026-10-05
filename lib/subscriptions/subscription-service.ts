import { createClient } from '@/lib/supabase/server';
import {
  InstitutionSubscription,
  SubscriptionTier,
  BillingCycle,
  TIER_CONFIG,
} from './types';

export async function getInstitutionSubscription(
  institutionId: string
): Promise<InstitutionSubscription | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('institution_subscriptions')
    .select('*')
    .eq('institution_id', institutionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Fallback: return default virtual basic subscription if none exists yet
      return {
        id: 'virtual-basic',
        institution_id: institutionId,
        tier: 'basic',
        billing_cycle: 'monthly',
        status: 'active',
        seats_limit: 1,
        monthly_inquiry_limit: 5,
        inquiries_used_current_month: 0,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    return null;
  }

  return data as InstitutionSubscription;
}

export async function updateSubscriptionTier(
  institutionId: string,
  tier: SubscriptionTier,
  billingCycle: BillingCycle = 'monthly'
): Promise<{ success: boolean; subscription?: InstitutionSubscription; error?: string }> {
  const supabase = await createClient();
  const config = TIER_CONFIG[tier];
  if (!config) {
    return { success: false, error: 'Invalid subscription tier.' };
  }

  const seatsLimit = config.searchSeats === 'Unlimited' ? 9999 : config.searchSeats;
  const inquiryLimit = config.monthlyInquiries === 'Unlimited' ? 99999 : config.monthlyInquiries;

  const { data, error } = await supabase
    .from('institution_subscriptions')
    .upsert(
      {
        institution_id: institutionId,
        tier,
        billing_cycle: billingCycle,
        status: 'active',
        seats_limit: seatsLimit,
        monthly_inquiry_limit: inquiryLimit,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'institution_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('updateSubscriptionTier failed:', error);
    return { success: false, error: 'Failed to update subscription.' };
  }

  return { success: true, subscription: data as InstitutionSubscription };
}

export async function canSendInquiry(institutionId: string): Promise<{
  allowed: boolean;
  remainingInquiries: number;
  tier: SubscriptionTier;
  error?: string;
}> {
  const sub = await getInstitutionSubscription(institutionId);
  if (!sub) {
    return { allowed: false, remainingInquiries: 0, tier: 'basic', error: 'Subscription not found' };
  }

  if (sub.status !== 'active' && sub.status !== 'trialing') {
    return {
      allowed: false,
      remainingInquiries: 0,
      tier: sub.tier,
      error: `Subscription is currently ${sub.status}. Please update your membership.`,
    };
  }

  const remaining = Math.max(0, sub.monthly_inquiry_limit - sub.inquiries_used_current_month);
  if (remaining <= 0 && sub.tier !== 'premier_partner') {
    return {
      allowed: false,
      remainingInquiries: 0,
      tier: sub.tier,
      error: `Monthly inquiry limit of ${sub.monthly_inquiry_limit} reached for ${TIER_CONFIG[sub.tier].displayName}. Upgrade to send additional inquiries.`,
    };
  }

  return { allowed: true, remainingInquiries: remaining, tier: sub.tier };
}

export async function incrementInquiryUsage(institutionId: string): Promise<boolean> {
  const supabase = await createClient();
  const sub = await getInstitutionSubscription(institutionId);
  if (!sub || sub.id === 'virtual-basic') {
    // Create actual row if virtual
    await supabase.from('institution_subscriptions').upsert({
      institution_id: institutionId,
      tier: 'basic',
      inquiries_used_current_month: 1,
      monthly_inquiry_limit: 5,
      seats_limit: 1,
    });
    return true;
  }

  const { error } = await supabase
    .from('institution_subscriptions')
    .update({
      inquiries_used_current_month: sub.inquiries_used_current_month + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sub.id);

  return !error;
}
