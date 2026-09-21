/**
-- ==============================================================================
-- FaithFull Scholars — Phase 1 Domain TypeScript Types
-- Type definitions for theological scholars, revision staging (ADR 0005),
-- confessional standards, courses, credentials, publications, and institutions.
-- ==============================================================================
 */

export type UserRole = 'scholar' | 'institution_user' | 'admin';

export interface Account {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type ProfileStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'hidden';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'flagged';
export type RevisionStatus = 'draft' | 'submitted' | 'changes_requested' | 'approved' | 'superseded';

export interface ScholarProfile {
  id: string;
  account_id: string;
  slug: string;
  full_name: string;
  title?: string | null;
  profile_photo_path?: string | null;
  current_institution?: string | null;
  institutional_role?: string | null;
  biography?: string | null;
  location?: string | null;
  timezone?: string | null;
  contact_preference?: string | null;
  doctrinal_statement_text?: string | null;
  doctrinal_statement_path?: string | null;
  profile_status: ProfileStatus;
  verification_status: VerificationStatus;
  published_revision_id?: string | null;
  draft_revision_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RevisionSnapshotData {
  full_name: string;
  title?: string | null;
  current_institution?: string | null;
  institutional_role?: string | null;
  biography?: string | null;
  location?: string | null;
  timezone?: string | null;
  doctrinal_statement_text?: string | null;
  credentials?: Array<{
    degree: string;
    field_of_study: string;
    institution_name: string;
    year_awarded?: number | null;
    is_terminal: boolean;
  }>;
  publications?: Array<{
    title: string;
    publication_type: PublicationType;
    publisher_or_journal?: string | null;
    year?: number | null;
    doi_or_url?: string | null;
    citation_text?: string | null;
  }>;
  confessions?: Array<{
    confessional_standard_id: string;
    confessional_standard_name?: string;
    adherence_level: AdherenceLevel;
    exception_notes?: string | null;
  }>;
  disciplines?: string[];
  traditions?: string[];
}

export interface ScholarProfileRevision {
  id: string;
  scholar_id: string;
  revision_number: number;
  status: RevisionStatus;
  snapshot_data: RevisionSnapshotData;
  admin_notes?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Discipline {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string | null;
  created_at: string;
}

export interface Tradition {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  created_at: string;
}

export type AdherenceLevel =
  | 'full_subscription'
  | 'strict_subscription'
  | 'general_agreement'
  | 'substantial_agreement'
  | 'with_exceptions';

export interface ConfessionalStandard {
  id: string;
  name: string;
  slug: string;
  year?: number | null;
  tradition_affinity?: string | null;
  description?: string | null;
  created_at: string;
}

export interface ScholarConfession {
  id: string;
  scholar_id: string;
  confessional_standard_id: string;
  adherence_level: AdherenceLevel;
  exception_notes?: string | null;
  created_at: string;
  confessional_standard?: ConfessionalStandard;
}

export interface AcademicCredential {
  id: string;
  scholar_id: string;
  degree: string;
  field_of_study: string;
  institution_name: string;
  year_awarded?: number | null;
  is_terminal: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type PublicationType =
  | 'book'
  | 'monograph'
  | 'journal_article'
  | 'book_chapter'
  | 'edited_volume'
  | 'conference_paper'
  | 'dissertation'
  | 'popular_essay';

export interface AcademicPublication {
  id: string;
  scholar_id: string;
  title: string;
  publication_type: PublicationType;
  publisher_or_journal?: string | null;
  year?: number | null;
  doi_or_url?: string | null;
  citation_text?: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type CourseLevel =
  | 'undergraduate'
  | 'graduate'
  | 'doctoral'
  | 'certificate'
  | 'lay_education';

export type DeliveryMode =
  | 'online_async'
  | 'online_sync'
  | 'in_person_modular'
  | 'in_person_semester';

export type CourseVisibility = 'public' | 'unlisted' | 'private';

export interface CourseShowcase {
  id: string;
  scholar_id: string;
  title: string;
  slug: string;
  description?: string | null;
  level: CourseLevel;
  primary_discipline_id?: string | null;
  delivery_modes: DeliveryMode[];
  syllabus_path?: string | null;
  reading_list?: string | null;
  public_preview_enabled: boolean;
  visibility: CourseVisibility;
  created_at: string;
  updated_at: string;
}

export type MediaType =
  | 'youtube_video'
  | 'youtube_playlist'
  | 'podcast'
  | 'audio_lecture'
  | 'article_link';

export interface MediaLink {
  id: string;
  scholar_id: string;
  course_id?: string | null;
  title: string;
  media_type: MediaType;
  url: string;
  description?: string | null;
  display_order: number;
  created_at: string;
}

export type OpportunityType =
  | 'adjunct_teaching'
  | 'online_instruction'
  | 'intensives_modular'
  | 'guest_lecturing'
  | 'doctoral_supervision'
  | 'curriculum_consulting'
  | 'conference_speaking';

export interface AvailabilityProfile {
  id: string;
  scholar_id: string;
  is_available_for_hire: boolean;
  opportunity_types: OpportunityType[];
  preferred_delivery_modes: DeliveryMode[];
  available_terms: string[];
  notes?: string | null;
  travel_preferences?: string | null;
  speaking_bio?: string | null;
  honorarium_policy?: string | null;
  updated_at: string;
}

export type InstitutionType =
  | 'seminary'
  | 'bible_college'
  | 'theological_college'
  | 'christian_university'
  | 'ministry_institute'
  | 'church'
  | 'mission_org'
  | 'other';

export type InstitutionStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface Institution {
  id: string;
  name: string;
  slug: string;
  website?: string | null;
  institution_type: InstitutionType;
  status: InstitutionStatus;
  contact_email: string;
  location?: string | null;
  created_at: string;
  updated_at: string;
}

export type InquiryStatus = 'pending' | 'read' | 'accepted' | 'declined' | 'archived';

export interface InstitutionInquiry {
  id: string;
  institution_id: string;
  scholar_id: string;
  course_id?: string | null;
  sender_account_id: string;
  opportunity_type: OpportunityType;
  proposed_term?: string | null;
  delivery_mode?: DeliveryMode | null;
  message: string;
  contact_email: string;
  status: InquiryStatus;
  created_at: string;
  updated_at: string;
}

export type ReviewAction = 'approve' | 'request_changes' | 'reject' | 'hide';

export interface ProfileReview {
  id: string;
  scholar_id: string;
  revision_id?: string | null;
  reviewer_account_id: string;
  action: ReviewAction;
  feedback_notes?: string | null;
  created_at: string;
}

export type ReportTargetType = 'scholar_profile' | 'course' | 'media_link';
export type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed';

export interface ContentReport {
  id: string;
  reporter_account_id?: string | null;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  status: ReportStatus;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedScholar {
  id: string;
  institution_id: string;
  scholar_id: string;
  notes?: string | null;
  created_at: string;
  scholar?: {
    id: string;
    slug: string;
    full_name: string;
    primary_institution?: string | null;
    avatar_url?: string | null;
    primary_discipline?: string | null;
  } | null;
}

export interface SavedCourse {
  id: string;
  institution_id: string;
  course_id: string;
  notes?: string | null;
  created_at: string;
  course?: {
    id: string;
    slug: string;
    title: string;
    course_number?: string | null;
    delivery_mode?: string | null;
    scholar_id?: string;
  } | null;
}

export interface CreateInquiryInput {
  institution_id: string;
  scholar_id: string;
  course_id?: string | null;
  opportunity_type: OpportunityType;
  proposed_term?: string | null;
  delivery_mode?: DeliveryMode | null;
  message: string;
  contact_email: string;
}

export interface UpdateInquiryStatusInput {
  inquiry_id: string;
  status: InquiryStatus;
  response_notes?: string | null;
}

export interface InquiryNotificationPayload {
  recipient_email: string;
  recipient_name: string;
  sender_name: string;
  subject: string;
  message_preview: string;
  action_url: string;
}
