export type LicenseType =
  | 'syllabus_only'
  | 'full_course_curriculum'
  | 'modular_guest_lecture'
  | 'custom_institution_license';

export type TermDuration =
  | '1_semester'
  | '1_academic_year'
  | 'perpetual_institutional'
  | 'single_modular_cohort';

export type LicensingStatus =
  | 'draft'
  | 'requested'
  | 'counter_proposed'
  | 'active'
  | 'expired'
  | 'terminated';

export type AccreditationBody =
  | 'ATS'
  | 'ABHE'
  | 'TRACS'
  | 'HLC'
  | 'SACSCOC'
  | 'other'
  | 'none';

export type AccreditationStatus = 'accredited' | 'candidate' | 'associate' | 'none';

export interface CourseLicensingAgreement {
  id: string;
  course_id: string;
  scholar_id: string;
  institution_id: string;
  consortium_id?: string | null;
  license_type: LicenseType;
  term_duration: TermDuration;
  royalty_amount: number;
  permitted_students_count?: number | null;
  status: LicensingStatus;
  custom_terms?: string | null;
  signed_by_scholar_at?: string | null;
  signed_by_institution_at?: string | null;
  created_at: string;
  updated_at: string;
  course?: {
    id: string;
    title: string;
    slug: string;
    level: string;
    description: string;
  };
  scholar?: {
    id: string;
    full_name: string;
    title: string;
    current_institution?: string | null;
  };
  institution?: {
    id: string;
    name: string;
    location?: string | null;
    accreditation_body?: AccreditationBody;
    accreditation_status?: AccreditationStatus;
  };
  consortium?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface CreateLicensingRequestInput {
  course_id: string;
  scholar_id: string;
  institution_id: string;
  consortium_id?: string | null;
  license_type: LicenseType;
  term_duration: TermDuration;
  royalty_amount: number;
  permitted_students_count?: number | null;
  custom_terms?: string | null;
}

export interface UpdateLicensingAgreementInput {
  license_type?: LicenseType;
  term_duration?: TermDuration;
  royalty_amount?: number;
  permitted_students_count?: number | null;
  custom_terms?: string | null;
  status?: LicensingStatus;
}
