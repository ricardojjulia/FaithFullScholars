import { describe, it, expect } from 'vitest';
import {
  APPLICANT_TRANSITIONS,
  APPLICATION_STATUSES,
  MEMBER_TARGET_STATUSES,
  MEMBER_TRANSITIONS,
  canApplicantWithdraw,
  contactReleased,
  isApplicationStatus,
  isMemberTargetStatus,
  isOpenApplication,
  nextMemberStatuses,
} from '@/lib/postings/application-status';
import enMessages from '@/lib/i18n/messages/en.json';
import esMessages from '@/lib/i18n/messages/es.json';

/**
 * The transition maps mirror the database guard (ADR 0027). The integration suite
 * (tests/integration/posting-applications.test.ts) sweeps every pair against the
 * real guard; these tests pin the maps themselves.
 */
describe('posting application status maps', () => {
  it('lists the five real statuses', () => {
    expect([...APPLICATION_STATUSES]).toEqual(['submitted', 'under_review', 'interview_scheduled', 'declined', 'withdrawn']);
  });

  it('lets a member move forward only, and decline only after review', () => {
    expect(MEMBER_TRANSITIONS.submitted).toEqual(['under_review']);
    expect(MEMBER_TRANSITIONS.under_review).toEqual(['interview_scheduled', 'declined']);
    expect(MEMBER_TRANSITIONS.interview_scheduled).toEqual(['declined']);
    expect(MEMBER_TRANSITIONS.declined).toEqual([]);
    expect(MEMBER_TRANSITIONS.withdrawn).toEqual([]);
  });

  it('never lets a member set withdrawn or submitted', () => {
    for (const targets of Object.values(MEMBER_TRANSITIONS)) {
      expect(targets).not.toContain('withdrawn');
      expect(targets).not.toContain('submitted');
    }
    expect([...MEMBER_TARGET_STATUSES]).toEqual(['under_review', 'interview_scheduled', 'declined']);
  });

  it('lets the applicant only withdraw, from an open state', () => {
    for (const status of ['submitted', 'under_review', 'interview_scheduled'] as const) {
      expect(APPLICANT_TRANSITIONS[status]).toEqual(['withdrawn']);
      expect(canApplicantWithdraw(status)).toBe(true);
    }
    expect(canApplicantWithdraw('declined')).toBe(false);
    expect(canApplicantWithdraw('withdrawn')).toBe(false);
  });

  it('treats declined and withdrawn as terminal for everyone', () => {
    for (const terminal of ['declined', 'withdrawn'] as const) {
      expect(MEMBER_TRANSITIONS[terminal]).toEqual([]);
      expect(APPLICANT_TRANSITIONS[terminal]).toEqual([]);
      expect(isOpenApplication(terminal)).toBe(false);
    }
  });

  it('offers a member only the valid next moves', () => {
    expect(nextMemberStatuses('submitted')).toEqual(['under_review']);
    expect(nextMemberStatuses('withdrawn')).toEqual([]);
  });

  it('validates status values from the outside', () => {
    expect(isApplicationStatus('under_review')).toBe(true);
    expect(isApplicationStatus('accepted')).toBe(false);
    expect(isApplicationStatus(undefined)).toBe(false);
    expect(isMemberTargetStatus('declined')).toBe(true);
    expect(isMemberTargetStatus('withdrawn')).toBe(false);
    expect(isMemberTargetStatus('submitted')).toBe(false);
  });

  it('releases contact only at the interview stage', () => {
    expect(contactReleased('interview_scheduled')).toBe(true);
    for (const status of APPLICATION_STATUSES.filter((s) => s !== 'interview_scheduled')) {
      expect(contactReleased(status)).toBe(false);
    }
  });

  it('has a translated label for every status in English and Spanish', () => {
    for (const status of APPLICATION_STATUSES) {
      expect((enMessages.common_app as Record<string, string>)[`status_${status}`]).toBeTruthy();
      expect((esMessages.common_app as Record<string, string>)[`status_${status}`]).toBeTruthy();
    }
  });
});
