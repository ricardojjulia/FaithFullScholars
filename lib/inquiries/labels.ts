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

/** Tabs shared by the scholar inbox and the institution outreach log. */
export type InquiryTab = 'all' | 'awaiting' | 'accepted' | 'declined' | 'archived';

export const INQUIRY_TABS: readonly { id: InquiryTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'awaiting', label: 'Awaiting response' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'declined', label: 'Declined' },
  { id: 'archived', label: 'Archived' },
];

/** Whether an inquiry belongs under a tab. "Awaiting" is pending + read, everywhere. */
export function matchesInquiryTab(status: InquiryStatus, tab: InquiryTab): boolean {
  if (tab === 'all') return true;
  if (tab === 'awaiting') return isAwaiting(status);
  return status === tab;
}

export function countForTab<T extends { status: InquiryStatus }>(items: readonly T[], tab: InquiryTab): number {
  return items.filter((item) => matchesInquiryTab(item.status, tab)).length;
}

/** Status badge text; `pending` and `read` both read as awaiting. */
export function inquiryStatusLabel(status: InquiryStatus): string {
  switch (status) {
    case 'pending':
      return 'Awaiting response';
    case 'read':
      return 'Read, awaiting response';
    case 'accepted':
      return 'Accepted';
    case 'declined':
      return 'Declined';
    case 'archived':
      return 'Archived';
  }
}

/** Institution status shown in the portal nav; only `approved` reads as verified. */
export function institutionStatusBadge(status: string | null | undefined): {
  label: string;
  tone: 'verified' | 'neutral';
} {
  switch (status) {
    case 'approved':
      return { label: 'Verified', tone: 'verified' };
    case 'pending':
      return { label: 'Pending verification', tone: 'neutral' };
    case 'rejected':
      return { label: 'Verification declined', tone: 'neutral' };
    case 'suspended':
      return { label: 'Suspended', tone: 'neutral' };
    default:
      return { label: 'Verification status unavailable', tone: 'neutral' };
  }
}
