import { describe, it, expect } from 'vitest';
import { TIER_CONFIG, formatTierName, SubscriptionTier } from '@/lib/subscriptions/types';

describe('Tiered Institutional Subscriptions (ADR 0010)', () => {
  it('defines 3 distinct subscription tiers with expected feature allowances', () => {
    expect(TIER_CONFIG.basic.monthlyInquiries).toBe(5);
    expect(TIER_CONFIG.basic.searchSeats).toBe(1);
    expect(TIER_CONFIG.basic.candidateShortlistExport).toBe(false);
    expect(TIER_CONFIG.basic.contractDrafting).toBe(false);

    expect(TIER_CONFIG.verified_seminary.monthlyInquiries).toBe(50);
    expect(TIER_CONFIG.verified_seminary.searchSeats).toBe(5);
    expect(TIER_CONFIG.verified_seminary.candidateShortlistExport).toBe(true);
    expect(TIER_CONFIG.verified_seminary.contractDrafting).toBe(true);

    expect(TIER_CONFIG.premier_partner.monthlyInquiries).toBe('Unlimited');
    expect(TIER_CONFIG.premier_partner.searchSeats).toBe('Unlimited');
    expect(TIER_CONFIG.premier_partner.priorityAiMatcher).toBe(true);
  });

  it('formats tier names gracefully', () => {
    expect(formatTierName('basic')).toBe('Basic Directory Access');
    expect(formatTierName('verified_seminary')).toBe('Verified Seminary');
    expect(formatTierName('premier_partner')).toBe('Premier Partner');
  });

  it('provides annual discount pricing calculation for paid tiers', () => {
    const verifiedAnnual = TIER_CONFIG.verified_seminary.priceAnnualUsd;
    const verifiedMonthlyAnnualized = TIER_CONFIG.verified_seminary.priceMonthlyUsd * 12;
    expect(verifiedAnnual).toBeLessThan(verifiedMonthlyAnnualized);

    const premierAnnual = TIER_CONFIG.premier_partner.priceAnnualUsd;
    const premierMonthlyAnnualized = TIER_CONFIG.premier_partner.priceMonthlyUsd * 12;
    expect(premierAnnual).toBeLessThan(premierMonthlyAnnualized);
  });
});
