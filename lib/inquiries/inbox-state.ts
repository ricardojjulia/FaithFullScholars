/**
 * Pure state transitions for the scholar inquiry inbox, kept out of the React
 * component so the optimistic update and its rollback are unit-testable.
 */
import type { InquiryStatus } from '@/lib/domain/types';

export interface DecidableInquiry {
  id: string;
  status: InquiryStatus;
  contact_email: string | null;
}

/** What to restore if the server does not confirm a decision. */
export interface DecisionSnapshot {
  status: InquiryStatus;
  contact_email: string | null;
}

export type DecisionResult = { ok: true; contactEmail: string | null } | { ok: false };

export function snapshotOf(item: DecidableInquiry): DecisionSnapshot {
  return { status: item.status, contact_email: item.contact_email };
}

/** Optimistic update: show the new status immediately. */
export function applyOptimisticStatus<T extends DecidableInquiry>(
  items: readonly T[],
  id: string,
  status: InquiryStatus
): T[] {
  return items.map((item) => (item.id === id ? { ...item, status } : item));
}

/**
 * Settles a decision against the server's answer. Success keeps the new status
 * (and adopts the contact email the server released on acceptance); failure
 * restores exactly what was shown before.
 */
export function settleDecision<T extends DecidableInquiry>(
  items: readonly T[],
  id: string,
  status: InquiryStatus,
  previous: DecisionSnapshot,
  result: DecisionResult
): T[] {
  return items.map((item) => {
    if (item.id !== id) return item;
    if (!result.ok) return { ...item, status: previous.status, contact_email: previous.contact_email };
    return {
      ...item,
      status,
      contact_email: status === 'accepted' ? result.contactEmail : item.contact_email,
    };
  });
}

/** Sends the decision. Never throws: any rejection or non-2xx response is `{ ok: false }`. */
export async function sendInquiryDecision(
  fetchImpl: typeof fetch,
  id: string,
  status: InquiryStatus,
  notes: string | null
): Promise<DecisionResult> {
  try {
    const res = await fetchImpl(`/api/inquiries/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, response_notes: notes }),
    });
    if (!res.ok) return { ok: false };
    const body = (await res.json().catch(() => null)) as { contactEmail?: string | null } | null;
    return { ok: true, contactEmail: body?.contactEmail ?? null };
  } catch {
    return { ok: false };
  }
}
