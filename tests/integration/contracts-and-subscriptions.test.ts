import { describe, it, expect } from 'vitest';
import { createContract } from '@/lib/contracts/contract-service';
import { updateSubscriptionTier } from '@/lib/subscriptions/subscription-service';

describe('Contracts and Subscriptions Service Integration', () => {
  it('validates required fields when creating an academic engagement contract', async () => {
    const result = await createContract({
      institution_id: '00000000-0000-0000-0000-000000000000',
      scholar_id: '11111111-1111-1111-1111-111111111111',
      opportunity_type: 'adjunct_course',
      title: '',
      scope_of_work: '',
      start_date: '',
      total_compensation_amount: 5000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Title, scope of work, and start date are required.');
  });

  it('rejects invalid subscription tiers on upgrade requests', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await updateSubscriptionTier('00000000-0000-0000-0000-000000000000', 'invalid_tier' as any);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid subscription tier.');
  });
});
