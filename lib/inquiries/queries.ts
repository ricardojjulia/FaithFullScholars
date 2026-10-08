import type { SupabaseClient } from '@supabase/supabase-js';
import {
  InstitutionInquiry,
  InquiryStatus,
  OpportunityType,
  DeliveryMode,
  SavedScholar,
  SavedCourse,
  Institution,
} from '@/lib/domain/types';

export interface DetailedScholarInquiry extends InstitutionInquiry {
  institution: {
    id: string;
    name: string;
    slug: string;
    location?: string | null;
    institution_type: string;
    status: string;
    website?: string | null;
  };
  course?: {
    id: string;
    title: string;
    slug: string;
    course_number?: string | null;
  } | null;
}

export interface DetailedInstitutionInquiry extends InstitutionInquiry {
  scholar: {
    id: string;
    full_name: string;
    slug: string;
    avatar_url?: string | null;
    primary_institution?: string | null;
  };
  course?: {
    id: string;
    title: string;
    slug: string;
    course_number?: string | null;
  } | null;
}

interface ScholarInquiryRow {
  id: string;
  institution_id: string;
  scholar_id: string;
  course_id?: string | null;
  sender_account_id: string;
  opportunity_type: OpportunityType;
  proposed_term: string;
  delivery_mode: DeliveryMode;
  message: string;
  contact_email: string;
  status: InquiryStatus;
  created_at: string;
  updated_at: string;
  institutions?: DetailedScholarInquiry['institution'] | null;
  courses?: DetailedScholarInquiry['course'] | null;
}

interface InstitutionInquiryRow {
  id: string;
  institution_id: string;
  scholar_id: string;
  course_id?: string | null;
  sender_account_id: string;
  opportunity_type: OpportunityType;
  proposed_term: string;
  delivery_mode: DeliveryMode;
  message: string;
  contact_email: string;
  status: InquiryStatus;
  created_at: string;
  updated_at: string;
  scholars?: {
    id: string;
    full_name: string;
    slug: string;
    profile_photo_path?: string | null;
    current_institution?: string | null;
  } | null;
  courses?: {
    id: string;
    title: string;
    slug: string;
    course_number?: string | null;
  } | null;
}

interface SavedScholarRow {
  id: string;
  institution_id: string;
  scholar_id: string;
  notes?: string | null;
  created_at: string;
  scholars?: {
    id: string;
    full_name: string;
    slug: string;
    profile_photo_path?: string | null;
    current_institution?: string | null;
    title?: string | null;
  } | null;
}

interface SavedCourseRow {
  id: string;
  institution_id: string;
  course_id: string;
  notes?: string | null;
  created_at: string;
  courses?: {
    id: string;
    title: string;
    slug: string;
    delivery_modes?: string[] | null;
    scholar_id: string;
    scholars?: { full_name: string } | null;
  } | null;
}

/**
 * A failed portal read. Carries only the database error code (never the message,
 * which can contain schema detail) so callers can log it safely and render an
 * error panel instead of fake zeros.
 */
export class PortalQueryError extends Error {
  readonly code: string;
  constructor(label: string, code?: string | null) {
    super(`${label} query failed`);
    this.name = 'PortalQueryError';
    this.code = code ?? 'unknown';
  }
}

/** Runs a throwing fetcher and degrades to a fallback, logging the code only. */
async function orFallback<T>(label: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (err) {
    console.error(`Error fetching ${label} (code):`, err instanceof PortalQueryError ? err.code : 'unknown');
    return fallback;
  }
}

/**
 * Fetches all incoming inquiries for a scholar. Throws PortalQueryError on failure.
 */
export async function fetchScholarInquiriesOrThrow(
  supabase: SupabaseClient,
  scholarId: string,
  statusFilter?: InquiryStatus | 'all'
): Promise<DetailedScholarInquiry[]> {

  let query = supabase
    .from('inquiries')
    .select(`
      id,
      institution_id,
      scholar_id,
      course_id,
      sender_account_id,
      opportunity_type,
      proposed_term,
      delivery_mode,
      message,
      contact_email,
      status,
      created_at,
      updated_at,
      institutions!inquiries_institution_id_fkey (
        id,
        name,
        slug,
        location,
        institution_type,
        status,
        website
      ),
      courses!inquiries_course_id_fkey (
        id,
        title,
        slug
      )
    `)
    .eq('scholar_id', scholarId)
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    throw new PortalQueryError('scholar inquiries', error.code);
  }

  return ((data || []) as unknown as ScholarInquiryRow[]).map((row) => ({
    id: row.id,
    institution_id: row.institution_id,
    scholar_id: row.scholar_id,
    course_id: row.course_id,
    sender_account_id: row.sender_account_id,
    opportunity_type: row.opportunity_type as OpportunityType,
    proposed_term: row.proposed_term,
    delivery_mode: row.delivery_mode as DeliveryMode,
    message: row.message,
    contact_email: row.contact_email,
    status: row.status as InquiryStatus,
    created_at: row.created_at,
    updated_at: row.updated_at,
    institution: row.institutions || {
      id: row.institution_id,
      name: 'Unknown Seminary',
      slug: 'unknown',
      location: null,
      institution_type: 'seminary',
      status: 'approved',
      website: null,
    },
    course: row.courses || null,
  }));
}

/** Non-throwing variant: returns [] on failure (use the OrThrow variant when zero must not be faked). */
export async function fetchScholarInquiries(
  supabase: SupabaseClient,
  scholarId: string,
  statusFilter?: InquiryStatus | 'all'
): Promise<DetailedScholarInquiry[]> {
  return orFallback('scholar inquiries', () => fetchScholarInquiriesOrThrow(supabase, scholarId, statusFilter), []);
}

/**
 * Fetches all inquiries sent by an institution. Throws PortalQueryError on failure.
 */
export async function fetchInstitutionInquiriesOrThrow(
  supabase: SupabaseClient,
  institutionId: string,
  statusFilter?: InquiryStatus | 'all'
): Promise<DetailedInstitutionInquiry[]> {

  let query = supabase
    .from('inquiries')
    .select(`
      id,
      institution_id,
      scholar_id,
      course_id,
      sender_account_id,
      opportunity_type,
      proposed_term,
      delivery_mode,
      message,
      contact_email,
      status,
      created_at,
      updated_at,
      scholars!inquiries_scholar_id_fkey (
        id,
        full_name,
        slug,
        profile_photo_path,
        current_institution,
        title
      ),
      courses!inquiries_course_id_fkey (
        id,
        title,
        slug
      )
    `)
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    throw new PortalQueryError('institution inquiries', error.code);
  }

  return ((data || []) as unknown as InstitutionInquiryRow[]).map((row) => ({
    id: row.id,
    institution_id: row.institution_id,
    scholar_id: row.scholar_id,
    course_id: row.course_id,
    sender_account_id: row.sender_account_id,
    opportunity_type: row.opportunity_type as OpportunityType,
    proposed_term: row.proposed_term,
    delivery_mode: row.delivery_mode as DeliveryMode,
    message: row.message,
    contact_email: row.contact_email,
    status: row.status as InquiryStatus,
    created_at: row.created_at,
    updated_at: row.updated_at,
    scholar: row.scholars
      ? {
          id: row.scholars.id,
          full_name: row.scholars.full_name,
          slug: row.scholars.slug,
          avatar_url: row.scholars.profile_photo_path,
          primary_institution: row.scholars.current_institution,
        }
      : {
          id: row.scholar_id,
          full_name: 'Unknown Scholar',
          slug: 'unknown',
          avatar_url: null,
          primary_institution: null,
        },
    course: row.courses || null,
  }));
}

/** Non-throwing variant: returns [] on failure. */
export async function fetchInstitutionInquiries(
  supabase: SupabaseClient,
  institutionId: string,
  statusFilter?: InquiryStatus | 'all'
): Promise<DetailedInstitutionInquiry[]> {
  return orFallback(
    'institution inquiries',
    () => fetchInstitutionInquiriesOrThrow(supabase, institutionId, statusFilter),
    []
  );
}

/**
 * Fetches shortlisted scholars for an institution. Throws PortalQueryError on failure.
 */
export async function fetchSavedScholarsOrThrow(
  supabase: SupabaseClient,
  institutionId: string
): Promise<SavedScholar[]> {
  const { data, error } = await supabase
    .from('saved_scholars')
    .select(`
      id,
      institution_id,
      scholar_id,
      notes,
      created_at,
      scholars!saved_scholars_scholar_id_fkey (
        id,
        full_name,
        slug,
        profile_photo_path,
        current_institution,
        title
      )
    `)
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new PortalQueryError('saved scholars', error.code);
  }

  return ((data || []) as unknown as SavedScholarRow[]).map((row) => ({
    id: row.id,
    institution_id: row.institution_id,
    scholar_id: row.scholar_id,
    notes: row.notes,
    created_at: row.created_at,
    scholar: row.scholars
      ? {
          id: row.scholars.id,
          full_name: row.scholars.full_name,
          slug: row.scholars.slug,
          avatar_url: row.scholars.profile_photo_path,
          primary_institution: row.scholars.current_institution,
        }
      : null,
  }));
}

/** Non-throwing variant: returns [] on failure. */
export async function fetchSavedScholars(
  supabase: SupabaseClient,
  institutionId: string
): Promise<SavedScholar[]> {
  return orFallback('saved scholars', () => fetchSavedScholarsOrThrow(supabase, institutionId), []);
}

/**
 * Fetches bookmarked courses for an institution. Throws PortalQueryError on failure.
 */
export async function fetchSavedCoursesOrThrow(
  supabase: SupabaseClient,
  institutionId: string
): Promise<SavedCourse[]> {
  const { data, error } = await supabase
    .from('saved_courses')
    .select(`
      id,
      institution_id,
      course_id,
      notes,
      created_at,
      courses!saved_courses_course_id_fkey (
        id,
        title,
        slug,
        delivery_modes,
        scholar_id,
        scholars!courses_scholar_id_fkey ( full_name )
      )
    `)
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new PortalQueryError('saved courses', error.code);
  }

  return ((data || []) as unknown as SavedCourseRow[]).map((row) => ({
    id: row.id,
    institution_id: row.institution_id,
    course_id: row.course_id,
    notes: row.notes,
    created_at: row.created_at,
    course: row.courses
      ? {
          id: row.courses.id,
          title: row.courses.title,
          slug: row.courses.slug,
          delivery_mode: row.courses.delivery_modes?.[0] || null,
          scholar_id: row.courses.scholar_id,
          scholar_name: row.courses.scholars?.full_name ?? null,
        }
      : null,
  }));
}

/** Non-throwing variant: returns [] on failure. */
export async function fetchSavedCourses(
  supabase: SupabaseClient,
  institutionId: string
): Promise<SavedCourse[]> {
  return orFallback('saved courses', () => fetchSavedCoursesOrThrow(supabase, institutionId), []);
}

/**
 * Checks if a scholar is shortlisted by an institution.
 */
export async function checkIsScholarSaved(
  supabase: SupabaseClient,
  institutionId: string,
  scholarId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('saved_scholars')
    .select('id')
    .eq('institution_id', institutionId)
    .eq('scholar_id', scholarId)
    .maybeSingle();

  if (error) {
    return false;
  }
  return !!data;
}

/** Columns the institution home needs; the full row (contact email etc.) is not required. */
const INSTITUTION_HOME_COLUMNS =
  'id, name, slug, location, institution_type, status, accreditation_body, accreditation_status';

/**
 * Fetches institutional profile data. Returns null when the row is not visible
 * to the caller. Throws PortalQueryError when the read itself fails.
 */
export async function fetchInstitutionProfileOrThrow(
  supabase: SupabaseClient,
  institutionId: string
): Promise<InstitutionHomeProfile | null> {
  const { data, error } = await supabase
    .from('institutions')
    .select(INSTITUTION_HOME_COLUMNS)
    .eq('id', institutionId)
    .maybeSingle();

  if (error) {
    throw new PortalQueryError('institution profile', error.code);
  }
  return (data as InstitutionHomeProfile | null) ?? null;
}

/** Non-throwing variant: returns null on failure or when not visible. */
export async function fetchInstitutionProfile(
  supabase: SupabaseClient,
  institutionId: string
): Promise<InstitutionHomeProfile | null> {
  return orFallback('institution profile', () => fetchInstitutionProfileOrThrow(supabase, institutionId), null);
}

export type InstitutionHomeProfile = Pick<
  Institution,
  'id' | 'name' | 'slug' | 'location' | 'institution_type' | 'status'
> & {
  accreditation_body?: string | null;
  accreditation_status?: string | null;
};

export interface InstitutionStats {
  totalInquiries: number;
  /** Inquiries still `pending`. */
  pendingInquiries: number;
  /** Inquiries awaiting the scholar's response: `pending` + `read`. */
  awaitingInquiries: number;
  acceptedInquiries: number;
  savedScholarsCount: number;
  savedCoursesCount: number;
}

/**
 * Aggregate metrics for an institution dashboard, as exact `head` counts that
 * are all filtered on the given institution (under RLS). Throws
 * PortalQueryError if any count fails, so an error is never shown as zero.
 */
export async function fetchInstitutionStats(
  supabase: SupabaseClient,
  institutionId: string
): Promise<InstitutionStats> {
  const countInquiries = (statuses?: InquiryStatus[]) => {
    let q = supabase
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId);
    if (statuses) q = q.in('status', statuses);
    return q;
  };

  const [total, pending, awaiting, accepted, savedScholars, savedCourses] = await Promise.all([
    countInquiries(),
    countInquiries(['pending']),
    countInquiries(['pending', 'read']),
    countInquiries(['accepted']),
    supabase
      .from('saved_scholars')
      .select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId),
    supabase
      .from('saved_courses')
      .select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId),
  ]);

  for (const res of [total, pending, awaiting, accepted, savedScholars, savedCourses]) {
    if (res.error || res.count === null) {
      throw new PortalQueryError('institution stats', res.error?.code);
    }
  }

  return {
    totalInquiries: total.count ?? 0,
    pendingInquiries: pending.count ?? 0,
    awaitingInquiries: awaiting.count ?? 0,
    acceptedInquiries: accepted.count ?? 0,
    savedScholarsCount: savedScholars.count ?? 0,
    savedCoursesCount: savedCourses.count ?? 0,
  };
}
