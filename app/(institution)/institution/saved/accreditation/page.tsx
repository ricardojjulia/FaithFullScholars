import React from 'react';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { fetchATSAccreditationReport } from '@/lib/accreditation/ats-matrix-service';
import { ATSComplianceMatrixTable } from '@/components/institution/ats-compliance-matrix-table';
import { ATSComplianceReport } from '@/lib/accreditation/ats-matrix-generator';

export const metadata: Metadata = {
  title: 'ATS & ABHE Faculty Credentials Matrix | Institution Portal',
  description: 'Standard 3 and Standard 11 institutional self-study compliance roster.',
};

export default async function AccreditationMatrixPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let targetInstitutionId = 'f2000000-0000-0000-0000-000000000001';

  if (user) {
    const { data: instUser } = await supabase
      .from('institution_users')
      .select('institution_id')
      .eq('account_id', user.id)
      .maybeSingle();

    if (instUser?.institution_id) {
      targetInstitutionId = instUser.institution_id;
    }
  }

  let report: ATSComplianceReport;
  try {
    report = await fetchATSAccreditationReport(targetInstitutionId);
  } catch (err) {
    console.error('Failed to compile ATS matrix report:', err);
    report = {
      institution_id: targetInstitutionId,
      institution_name: 'Academic Search Committee',
      generated_at: new Date().toISOString(),
      summary: {
        total_faculty: 0,
        terminal_degree_count: 0,
        terminal_degree_percentage: 0,
        ats_standard_3_compliant: false,
        total_publications: 0,
        confessional_affirmation_count: 0,
        confessional_affirmation_percentage: 0,
      },
      records: [],
    };
  }

  return <ATSComplianceMatrixTable report={report} />;
}
