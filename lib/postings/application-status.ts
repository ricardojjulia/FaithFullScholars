/**
 * ==============================================================================
 * FaithFull Scholars — Posting application status vocabulary (ADR 0027)
 *
 * These maps MIRROR the database guard `private.guard_posting_applications`
 * (migration 20261012090000). The database is the enforcing layer; this module
 * only decides which buttons and routes to offer. An integration sweep
 * (tests/integration/posting-applications.test.ts) runs every from/to pair against
 * the real guard and fails if these maps drift from it.
 * ==============================================================================
 */

export const APPLICATION_STATUSES = [
  'submitted',
  'under_review',
  'interview_scheduled',
  'declined',
  'withdrawn',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Statuses an institution member may set (never `submitted` or `withdrawn`). */
export const MEMBER_TARGET_STATUSES = ['under_review', 'interview_scheduled', 'declined'] as const;
export type MemberTargetStatus = (typeof MEMBER_TARGET_STATUSES)[number];

/** What a member (who is not the applicant) may move an application to. Forward only. */
export const MEMBER_TRANSITIONS: Readonly<Record<ApplicationStatus, readonly ApplicationStatus[]>> = {
  submitted: ['under_review'],
  under_review: ['interview_scheduled', 'declined'],
  interview_scheduled: ['declined'],
  declined: [],
  withdrawn: [],
};

/** What the applicant may move their own application to: withdraw, from an open state. */
export const APPLICANT_TRANSITIONS: Readonly<Record<ApplicationStatus, readonly ApplicationStatus[]>> = {
  submitted: ['withdrawn'],
  under_review: ['withdrawn'],
  interview_scheduled: ['withdrawn'],
  declined: [],
  withdrawn: [],
};

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return typeof value === 'string' && (APPLICATION_STATUSES as readonly string[]).includes(value);
}

export function isMemberTargetStatus(value: unknown): value is MemberTargetStatus {
  return typeof value === 'string' && (MEMBER_TARGET_STATUSES as readonly string[]).includes(value);
}

/** Valid next statuses for a member, in pipeline order. */
export function nextMemberStatuses(status: ApplicationStatus): readonly ApplicationStatus[] {
  return MEMBER_TRANSITIONS[status];
}

/** True while the applicant can still withdraw. */
export function canApplicantWithdraw(status: ApplicationStatus): boolean {
  return APPLICANT_TRANSITIONS[status].includes('withdrawn');
}

/** Open = still in play for the applicant (not declined, not withdrawn). */
export function isOpenApplication(status: ApplicationStatus): boolean {
  return status !== 'declined' && status !== 'withdrawn';
}

/** Contact is released to the institution only at this stage. */
export function contactReleased(status: ApplicationStatus): boolean {
  return status === 'interview_scheduled';
}
