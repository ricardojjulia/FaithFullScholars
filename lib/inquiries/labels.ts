import type { InquiryStatus } from '@/lib/domain/types';

/** Human labels for inquiry opportunity types (shared by the scholar inbox and the institution outreach log). */
export const OPPORTUNITY_LABELS: Record<string, string> = {
  adjunct_teaching: 'Adjunct Teaching',
  online_instruction: 'Online Course',
  guest_lecturing: 'Guest Lecture',
  intensives_modular: 'Modular Intensive',
  curriculum_consulting: 'Curriculum Consulting',
  doctoral_supervision: 'Doctoral Supervision',
  conference_speaking: 'Conference Speaking',
};

export function opportunityLabel(type: string): string {
  return OPPORTUNITY_LABELS[type] ?? type;
}

/** Inquiry statuses that still await the scholar's decision ("awaiting response"). */
export const AWAITING_STATUSES: readonly InquiryStatus[] = ['pending', 'read'];

export function isAwaiting(status: InquiryStatus): boolean {
  return AWAITING_STATUSES.includes(status);
}

/**
 * Accreditation line for an institution, from admin-verified columns only.
 * Returns null when there is nothing verified to show.
 */
export function accreditationLabel(
  body: string | null | undefined,
  status: string | null | undefined
): string | null {
  if (!body || body === 'none' || !status || status === 'none') return null;
  const prefix = body === 'other' ? '' : `${body} `;
  switch (status) {
    case 'accredited':
      return `${prefix}Accredited`.trim();
    case 'candidate':
      return `${prefix}Candidate`.trim();
    case 'associate':
      return `${prefix}Associate`.trim();
    default:
      return null;
  }
}

/** "Verified" only for an approved institution; everything else is shown as pending. */
export function verificationLabel(status: string | null | undefined): 'Verified Academic Partner' | 'Pending verification' {
  return status === 'approved' ? 'Verified Academic Partner' : 'Pending verification';
}
