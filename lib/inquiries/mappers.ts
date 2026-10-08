/**
 * Pure mappers from query rows to the plain, serialisable props the portal
 * client components render. No I/O, no Supabase: safe to import anywhere.
 */
import type {
  DeliveryMode,
  InquiryStatus,
  OpportunityType,
  SavedCourse,
  SavedScholar,
} from '@/lib/domain/types';
import type { DetailedInstitutionInquiry, DetailedScholarInquiry } from '@/lib/inquiries/queries';

export interface InboxInquiryItem {
  id: string;
  institution_id: string;
  /** "Institution unavailable" when the institution row is not visible. */
  institution_name: string;
  institution_location?: string | null;
  /** Null when the institution is unavailable: no type or trust signal is invented. */
  institution_type: string | null;
  institution_available: boolean;
  opportunity_type: OpportunityType;
  proposed_term?: string | null;
  delivery_mode?: DeliveryMode | null;
  message: string;
  /**
   * The institution's contact email. Stripped server-side (null) unless the
   * inquiry is `accepted`: the scholar only sees it after agreeing to connect.
   */
  contact_email: string | null;
  status: InquiryStatus;
  created_at: string;
  course_title?: string | null;
}

export const INSTITUTION_UNAVAILABLE = 'Institution unavailable';
export const SCHOLAR_UNAVAILABLE = 'Scholar unavailable';

export interface OutboxInquiryItem {
  id: string;
  scholar_id: string;
  scholar_name: string;
  /** Null when the scholar profile is not visible: no profile link is rendered. */
  scholar_slug: string | null;
  opportunity_type: OpportunityType;
  proposed_term?: string | null;
  delivery_mode?: DeliveryMode | null;
  message: string;
  status: InquiryStatus;
  created_at: string;
  course_title?: string | null;
}

export interface ShortlistedScholarItem {
  id: string;
  scholar_id: string;
  /** Null when the profile is not visible to this institution (for example unpublished). */
  full_name: string | null;
  slug: string | null;
  primary_institution: string | null;
  avatar_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface BookmarkedCourseItem {
  id: string;
  course_id: string;
  /** Null when the course is no longer visible to this institution. */
  title: string | null;
  slug: string | null;
  delivery_mode: string | null;
  scholar_name: string | null;
  notes: string | null;
  created_at: string;
}

export function toInboxItems(rows: DetailedScholarInquiry[]): InboxInquiryItem[] {
  return rows.map((row) => ({
    id: row.id,
    institution_id: row.institution_id,
    institution_name: row.institution?.name ?? INSTITUTION_UNAVAILABLE,
    institution_location: row.institution?.location ?? null,
    institution_type: row.institution?.institution_type ?? null,
    institution_available: !!row.institution,
    opportunity_type: row.opportunity_type,
    proposed_term: row.proposed_term ?? null,
    delivery_mode: row.delivery_mode ?? null,
    message: row.message,
    // Data minimisation: the contact email leaves the server only once accepted.
    contact_email: row.status === 'accepted' ? row.contact_email : null,
    status: row.status,
    created_at: row.created_at,
    course_title: row.course?.title ?? null,
  }));
}

export function toOutboxItems(rows: DetailedInstitutionInquiry[]): OutboxInquiryItem[] {
  return rows.map((row) => ({
    id: row.id,
    scholar_id: row.scholar_id,
    scholar_name: row.scholar?.full_name ?? SCHOLAR_UNAVAILABLE,
    scholar_slug: row.scholar?.slug ?? null,
    opportunity_type: row.opportunity_type,
    proposed_term: row.proposed_term ?? null,
    delivery_mode: row.delivery_mode ?? null,
    message: row.message,
    status: row.status,
    created_at: row.created_at,
    course_title: row.course?.title ?? null,
  }));
}

export function toShortlistedScholarItems(rows: SavedScholar[]): ShortlistedScholarItem[] {
  return rows.map((row) => ({
    id: row.id,
    scholar_id: row.scholar_id,
    full_name: row.scholar?.full_name ?? null,
    slug: row.scholar?.slug ?? null,
    primary_institution: row.scholar?.primary_institution ?? null,
    avatar_url: row.scholar?.avatar_url ?? null,
    notes: row.notes ?? null,
    created_at: row.created_at,
  }));
}

export function toBookmarkedCourseItems(rows: SavedCourse[]): BookmarkedCourseItem[] {
  return rows.map((row) => ({
    id: row.id,
    course_id: row.course_id,
    title: row.course?.title ?? null,
    slug: row.course?.slug ?? null,
    delivery_mode: row.course?.delivery_mode ?? null,
    scholar_name: row.course?.scholar_name ?? null,
    notes: row.notes ?? null,
    created_at: row.created_at,
  }));
}
