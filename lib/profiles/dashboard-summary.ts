/**
 * Scholar dashboard summary: pure mappers plus one loader.
 *
 * Every value on /dashboard is derived here from the signed-in scholar's own
 * rows (user/RLS client, explicit scholar_id filters). Nothing is invented:
 * there is no view/impression data, so none is shown.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProfileStatus, RevisionStatus } from '@/lib/domain/types';
import { OPPORTUNITY_LABELS } from '@/lib/inquiries/labels';
import { PortalQueryError } from '@/lib/inquiries/queries';

const DAY_MS = 24 * 60 * 60 * 1000;
const HONORIFICS = new Set(['dr', 'prof', 'professor', 'rev', 'revd', 'fr', 'pr', 'mr', 'mrs', 'ms', 'miss', 'sr', 'br']);

/** Up to two initials from a display name, ignoring honorifics ("Dr. Sarah Edwards" -> "SE"). */
export function initialsFrom(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter((w) => /\p{L}/u.test(w));
  const significant = words.filter((w) => !HONORIFICS.has(w.replace(/\.$/, '').toLowerCase()));
  const use = significant.length > 0 ? significant : words;
  if (use.length === 0) return '?';
  const first = (w: string) => (w.match(/\p{L}/u)?.[0] ?? '').toUpperCase();
  if (use.length === 1) return first(use[0]);
  return first(use[0]) + first(use[use.length - 1]);
}

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning';

export function profileStatusLabel(status: ProfileStatus | null | undefined): { label: string; tone: StatusTone } {
  switch (status) {
    case 'draft':
      return { label: 'Draft', tone: 'neutral' };
    case 'submitted':
      return { label: 'Under review', tone: 'info' };
    case 'approved':
      return { label: 'Published', tone: 'success' };
    case 'hidden':
      return { label: 'Hidden', tone: 'warning' };
    case 'rejected':
      return { label: 'Not approved', tone: 'warning' };
    default:
      return { label: 'Unknown', tone: 'neutral' };
  }
}

export interface RevisionSummaryRow {
  id?: string;
  revision_number: number;
  status: RevisionStatus;
}

const OPEN: readonly RevisionStatus[] = ['draft', 'submitted', 'changes_requested'];

/**
 * One line describing the live and in-progress revisions, in the ADR 0024
 * vocabulary. A `rejected` revision is only mentioned while it is newer than
 * the published one (an older rejection is history, not status).
 */
export function revisionStatusText(input: {
  hasPublished: boolean;
  publishedRevisionNumber: number | null;
  revisions: RevisionSummaryRow[];
}): string {
  const { hasPublished, publishedRevisionNumber, revisions } = input;

  const live = hasPublished
    ? publishedRevisionNumber != null
      ? `Live revision #${publishedRevisionNumber}`
      : 'Live revision'
    : 'Not published yet';

  const byNewest = [...revisions].sort((a, b) => b.revision_number - a.revision_number);
  const open = byNewest.find((r) => OPEN.includes(r.status));
  const rejected = byNewest.find(
    (r) => r.status === 'rejected' && r.revision_number > (publishedRevisionNumber ?? 0)
  );

  let progress: string;
  if (open) {
    switch (open.status) {
      case 'submitted':
        progress = `Revision #${open.revision_number} awaiting review`;
        break;
      case 'changes_requested':
        progress = `Revision #${open.revision_number}: changes requested`;
        break;
      default:
        progress = `Draft revision #${open.revision_number} not yet submitted`;
    }
  } else if (rejected) {
    progress = `Revision #${rejected.revision_number} was not approved`;
  } else {
    progress = 'No draft in progress';
  }

  return `${live} • ${progress}`;
}

export interface InquiryTrend {
  last30: number;
  previous30: number;
  delta: number;
  direction: 'up' | 'down' | 'flat';
  label: string;
}

/**
 * Rolling-window trend: inquiries created in the 30 days up to `now` against
 * the 30 days before that. A window is (start, end]; timestamps after `now`
 * or older than 60 days are ignored. Counts only, never percentages.
 */
export function inquiryTrend(createdAts: readonly string[], now: Date): InquiryTrend {
  const t = now.getTime();
  const start30 = t - 30 * DAY_MS;
  const start60 = t - 60 * DAY_MS;
  let last30 = 0;
  let previous30 = 0;
  for (const iso of createdAts) {
    const ms = Date.parse(iso);
    if (Number.isNaN(ms) || ms > t) continue;
    if (ms > start30) last30++;
    else if (ms > start60) previous30++;
  }
  const delta = last30 - previous30;
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  let label: string;
  if (delta > 0) label = `+${delta} vs previous 30 days`;
  else if (delta < 0) label = `${delta} vs previous 30 days`;
  else if (last30 === 0) label = 'No inquiries in the last 30 days';
  else label = 'Same as previous 30 days';
  return { last30, previous30, delta, direction, label };
}

export interface AvailabilityRow {
  is_available_for_hire: boolean;
  opportunity_types: string[] | null;
  preferred_delivery_modes?: string[] | null;
}

export interface AvailabilitySummary {
  state: 'available' | 'unavailable' | 'unset';
  badge: string;
  detail: string;
}

export function summarizeAvailability(row: AvailabilityRow | null | undefined): AvailabilitySummary {
  if (!row) {
    return { state: 'unset', badge: 'Not set', detail: 'Tell institutions what you are open to' };
  }
  const labels = (row.opportunity_types ?? []).map((t) => OPPORTUNITY_LABELS[t] ?? t);
  const shown = labels.slice(0, 3).join(', ');
  const more = labels.length > 3 ? ` +${labels.length - 3} more` : '';
  const detail = labels.length > 0 ? `${shown}${more}` : 'No opportunity types selected';
  return row.is_available_for_hire
    ? { state: 'available', badge: 'Available', detail }
    : { state: 'unavailable', badge: 'Not available', detail };
}

export interface ScholarDashboardSummary {
  fullName: string;
  initials: string;
  profile: { label: string; tone: StatusTone };
  revisionText: string;
  totalInquiries: number;
  trend: InquiryTrend;
  publicCourseCount: number;
  availability: AvailabilitySummary;
}

/**
 * Loads the dashboard for one scholar. Returns null when the scholar row is not
 * visible (a signed-in user without a scholar profile). Throws PortalQueryError
 * if any read fails, so the page can show an error instead of zeros.
 */
export async function fetchScholarDashboardSummary(
  supabase: SupabaseClient,
  scholarId: string,
  now: Date = new Date()
): Promise<ScholarDashboardSummary | null> {
  const since = new Date(now.getTime() - 60 * DAY_MS).toISOString();

  const [scholarRes, revisionsRes, totalRes, recentRes, availabilityRes, coursesRes] = await Promise.all([
    supabase
      .from('scholars')
      .select('id, full_name, profile_status, published_revision_id')
      .eq('id', scholarId)
      .maybeSingle(),
    supabase
      .from('scholar_profile_revisions')
      .select('id, revision_number, status')
      .eq('scholar_id', scholarId)
      .order('revision_number', { ascending: false })
      .limit(50),
    supabase.from('inquiries').select('id', { count: 'exact', head: true }).eq('scholar_id', scholarId),
    supabase.from('inquiries').select('created_at').eq('scholar_id', scholarId).gte('created_at', since),
    supabase
      .from('availability_profiles')
      .select('is_available_for_hire, opportunity_types, preferred_delivery_modes')
      .eq('scholar_id', scholarId)
      .maybeSingle(),
    supabase
      .from('courses')
      .select('id', { count: 'exact', head: true })
      .eq('scholar_id', scholarId)
      .eq('visibility', 'public'),
  ]);

  for (const [label, res] of [
    ['scholar', scholarRes],
    ['revisions', revisionsRes],
    ['inquiry count', totalRes],
    ['recent inquiries', recentRes],
    ['availability', availabilityRes],
    ['courses', coursesRes],
  ] as const) {
    if (res.error) throw new PortalQueryError(`dashboard ${label}`, res.error.code);
  }

  const scholar = scholarRes.data as {
    full_name: string;
    profile_status: ProfileStatus;
    published_revision_id: string | null;
  } | null;
  if (!scholar) return null;

  const revisions = (revisionsRes.data ?? []) as unknown as RevisionSummaryRow[];
  const published = scholar.published_revision_id
    ? revisions.find((r) => r.id === scholar.published_revision_id)
    : undefined;

  return {
    fullName: scholar.full_name,
    initials: initialsFrom(scholar.full_name),
    profile: profileStatusLabel(scholar.profile_status),
    revisionText: revisionStatusText({
      hasPublished: !!scholar.published_revision_id,
      publishedRevisionNumber: published?.revision_number ?? null,
      revisions,
    }),
    totalInquiries: totalRes.count ?? 0,
    trend: inquiryTrend(
      ((recentRes.data ?? []) as { created_at: string }[]).map((r) => r.created_at),
      now
    ),
    publicCourseCount: coursesRes.count ?? 0,
    availability: summarizeAvailability(availabilityRes.data as AvailabilityRow | null),
  };
}
