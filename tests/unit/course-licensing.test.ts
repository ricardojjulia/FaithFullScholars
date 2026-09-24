import { describe, it, expect } from 'vitest';
import {
  LicenseType,
  TermDuration,
  CourseLicensingAgreement,
} from '@/lib/licensing/types';

describe('Course Licensing & Syllabus Distribution Agreements (ADR 0013)', () => {
  it('validates supported license types and term durations', () => {
    const validLicenseTypes: LicenseType[] = [
      'syllabus_only',
      'full_course_curriculum',
      'modular_guest_lecture',
      'custom_institution_license',
    ];

    const validTerms: TermDuration[] = [
      '1_semester',
      '1_academic_year',
      'perpetual_institutional',
      'single_modular_cohort',
    ];

    expect(validLicenseTypes).toHaveLength(4);
    expect(validTerms).toHaveLength(4);
  });

  it('correctly models an active course licensing agreement with royalties and accreditation', () => {
    const agreement: CourseLicensingAgreement = {
      id: '05000000-0000-0000-0000-000000000001',
      course_id: '02000000-0000-0000-0000-000000000002',
      scholar_id: 'f1000000-0000-0000-0000-000000000002',
      institution_id: 'e1000000-0000-0000-0000-000000000001',
      license_type: 'full_course_curriculum',
      term_duration: '1_academic_year',
      royalty_amount: 3500.0,
      permitted_students_count: 30,
      status: 'active',
      signed_by_scholar_at: '2026-09-13T00:00:00Z',
      signed_by_institution_at: '2026-09-13T00:00:00Z',
      created_at: '2026-09-13T00:00:00Z',
      updated_at: '2026-09-13T00:00:00Z',
      institution: {
        id: 'e1000000-0000-0000-0000-000000000001',
        name: 'Westminster Theological Seminary',
        accreditation_body: 'ATS',
        accreditation_status: 'accredited',
      },
    };

    expect(agreement.status).toBe('active');
    expect(agreement.royalty_amount).toBe(3500.0);
    expect(agreement.institution?.accreditation_body).toBe('ATS');
    expect(agreement.institution?.accreditation_status).toBe('accredited');
    expect(agreement.signed_by_scholar_at).not.toBeNull();
    expect(agreement.signed_by_institution_at).not.toBeNull();
  });
});
