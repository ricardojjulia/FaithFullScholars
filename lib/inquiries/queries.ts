import { createAdminClient } from '@/lib/supabase/server';
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
  } | null;
}

/**
 * Fetches all incoming inquiries for a scholar.
 */
export async function fetchScholarInquiries(
  scholarId: string,
  statusFilter?: InquiryStatus | 'all'
): Promise<DetailedScholarInquiry[]> {
  const supabase = createAdminClient();

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
    console.error('Error fetching scholar inquiries:', error);
    return [];
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

/**
 * Fetches all inquiries sent by an institution.
 */
export async function fetchInstitutionInquiries(
  institutionId: string,
  statusFilter?: InquiryStatus | 'all'
): Promise<DetailedInstitutionInquiry[]> {
  const supabase = createAdminClient();

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
    console.error('Error fetching institution inquiries:', error);
    return [];
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

/**
 * Fetches shortlisted scholars for an institution.
 */
export async function fetchSavedScholars(institutionId: string): Promise<SavedScholar[]> {
  const supabase = createAdminClient();

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
    console.error('Error fetching saved scholars:', error);
    return [];
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

/**
 * Fetches bookmarked courses for an institution.
 */
export async function fetchSavedCourses(institutionId: string): Promise<SavedCourse[]> {
  const supabase = createAdminClient();

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
        scholar_id
      )
    `)
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching saved courses:', error);
    return [];
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
        }
      : null,
  }));
}

/**
 * Checks if a scholar is shortlisted by an institution.
 */
export async function checkIsScholarSaved(
  institutionId: string,
  scholarId: string
): Promise<boolean> {
  const supabase = createAdminClient();
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

/**
 * Fetches institutional profile data.
 */
export async function fetchInstitutionProfile(institutionId: string): Promise<Institution | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('institutions')
    .select('*')
    .eq('id', institutionId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return data as Institution;
}

/**
 * Fetches aggregate metrics for an institution dashboard.
 */
export async function fetchInstitutionStats(institutionId: string) {
  const supabase = createAdminClient();

  const [inquiriesRes, savedScholarsRes, savedCoursesRes] = await Promise.all([
    supabase
      .from('inquiries')
      .select('status', { count: 'exact' })
      .eq('institution_id', institutionId),
    supabase
      .from('saved_scholars')
      .select('id', { count: 'exact' })
      .eq('institution_id', institutionId),
    supabase
      .from('saved_courses')
      .select('id', { count: 'exact' })
      .eq('institution_id', institutionId),
  ]);

  const inquiries = inquiriesRes.data || [];
  const pendingCount = inquiries.filter((i) => i.status === 'pending').length;
  const acceptedCount = inquiries.filter((i) => i.status === 'accepted').length;

  return {
    totalInquiries: inquiriesRes.count || 0,
    pendingInquiries: pendingCount,
    acceptedInquiries: acceptedCount,
    savedScholarsCount: savedScholarsRes.count || 0,
    savedCoursesCount: savedCoursesRes.count || 0,
  };
}
