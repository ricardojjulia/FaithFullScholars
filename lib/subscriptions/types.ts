export type SubscriptionTier = 'basic' | 'verified_seminary' | 'premier_partner';
export type BillingCycle = 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';

export interface InstitutionSubscription {
  id: string;
  institution_id: string;
  tier: SubscriptionTier;
  billing_cycle: BillingCycle;
  status: SubscriptionStatus;
  seats_limit: number;
  monthly_inquiry_limit: number;
  inquiries_used_current_month: number;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

export interface TierBenefits {
  tier: SubscriptionTier;
  displayName: string;
  priceMonthlyUsd: number;
  priceAnnualUsd: number;
  monthlyInquiries: number | 'Unlimited';
  searchSeats: number | 'Unlimited';
  candidateShortlistExport: boolean;
  contractDrafting: boolean;
  priorityAiMatcher: boolean;
  institutionalBadge: boolean;
  description: string;
}

export const TIER_CONFIG: Record<SubscriptionTier, TierBenefits> = {
  basic: {
    tier: 'basic',
    displayName: 'Basic Directory Access',
    priceMonthlyUsd: 0,
    priceAnnualUsd: 0,
    monthlyInquiries: 5,
    searchSeats: 1,
    candidateShortlistExport: false,
    contractDrafting: false,
    priorityAiMatcher: false,
    institutionalBadge: false,
    description: 'Complimentary academic directory discovery and limited faculty outreach.',
  },
  verified_seminary: {
    tier: 'verified_seminary',
    displayName: 'Verified Seminary',
    priceMonthlyUsd: 149,
    priceAnnualUsd: 1490,
    monthlyInquiries: 50,
    searchSeats: 5,
    candidateShortlistExport: true,
    contractDrafting: true,
    priorityAiMatcher: false,
    institutionalBadge: true,
    description: 'Full search committee access, candidate shortlist export, and formal contract drafting.',
  },
  premier_partner: {
    tier: 'premier_partner',
    displayName: 'Premier Partner',
    priceMonthlyUsd: 399,
    priceAnnualUsd: 3990,
    monthlyInquiries: 'Unlimited',
    searchSeats: 'Unlimited',
    candidateShortlistExport: true,
    contractDrafting: true,
    priorityAiMatcher: true,
    institutionalBadge: true,
    description: 'Campus-wide search licenses, unlimited inquiries, priority AI matching, and premier institutional visibility.',
  },
};

export function formatTierName(tier: SubscriptionTier): string {
  return TIER_CONFIG[tier]?.displayName || tier;
}
