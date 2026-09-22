import { describe, it, expect } from 'vitest';
import {
  formatContractType,
  formatContractStatus,
  OpportunityContractType,
  ContractStatus,
} from '@/lib/contracts/types';

describe('Institutional Engagement Contracts (ADR 0011)', () => {
  it('formats academic contract types correctly', () => {
    expect(formatContractType('adjunct_course')).toBe('Adjunct Semester Course');
    expect(formatContractType('modular_intensive')).toBe('Modular / Intensive Course');
    expect(formatContractType('guest_lecture')).toBe('Guest Lecture / Masterclass');
    expect(formatContractType('curriculum_review')).toBe('Curriculum Review & Consultation');
    expect(formatContractType('speaking_engagement')).toBe('Keynote Conference Speaking');
    expect(formatContractType('doctoral_supervision')).toBe('Doctoral / Thesis Supervision');
  });

  it('maps contract statuses to corresponding badges and visual variants', () => {
    expect(formatContractStatus('draft')).toEqual({ label: 'Draft', variant: 'neutral' });
    expect(formatContractStatus('offered')).toEqual({ label: 'Offer Sent', variant: 'info' });
    expect(formatContractStatus('accepted')).toEqual({ label: 'Accepted', variant: 'success' });
    expect(formatContractStatus('in_progress')).toEqual({ label: 'In Progress', variant: 'info' });
    expect(formatContractStatus('completed')).toEqual({ label: 'Completed', variant: 'success' });
    expect(formatContractStatus('declined')).toEqual({ label: 'Declined', variant: 'danger' });
    expect(formatContractStatus('cancelled')).toEqual({ label: 'Cancelled', variant: 'neutral' });
  });
});
