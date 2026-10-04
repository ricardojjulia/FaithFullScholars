/**
 * ==============================================================================
 * FaithFull Scholars — ATS & ABHE Accreditation Server Service (ADR 0019)
 *
 * Server-only utility to fetch an institution's saved faculty and compile
 * an ATS Standard 3 & ABHE Standard 11 compliance report.
 * ==============================================================================
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchShortlistDossier, ShortlistDossierCandidate } from '@/lib/inquiries/export-dossier';
import {
  generateAccreditationMatrix,
  ATSComplianceReport
} from './ats-matrix-generator';

export async function fetchATSAccreditationReport(
  supabase: SupabaseClient,
  institutionId: string
): Promise<ATSComplianceReport> {
  // `supabase` is the caller's RLS-scoped client: only that institution's members can read its shortlist.
  const dossier = await fetchShortlistDossier(supabase, institutionId);

  // If live database returned saved candidates, generate matrix from live data
  if (dossier.candidates.length > 0) {
    return generateAccreditationMatrix(
      dossier.candidates,
      dossier.institution_id,
      dossier.institution_name
    );
  }

  // In test / dev environments when no shortlist rows exist in the local DB,
  // provide deterministic seed candidates matching the saved shortlist preview
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_ROUTES === 'true') {
    const seedCandidates: ShortlistDossierCandidate[] = [
      {
        id: 'seed-save-1',
        scholar_id: 'f1000000-0000-0000-0000-000000000001',
        full_name: 'Dr. Calvin Edwards',
        slug: 'calvin-edwards',
        title: 'Professor of Systematic Theology',
        current_institution: 'Covenant Theological Seminary',
        primary_discipline: 'Systematic Theology',
        primary_tradition: 'Reformed',
        confessions: ['Westminster Confession of Faith [Full]'],
        terminal_degree: 'Ph.D. in Systematic Theology',
        terminal_degree_institution: 'University of Edinburgh',
        graduation_year: 2012,
        key_publications: [
          'The Federal Principle in 17th Century Reformed Dogmatics (2018)',
          'Covenant and Union with Christ (2021)'
        ],
        availability_formats: ['in_person', 'modular', 'online'],
        created_at: new Date().toISOString()
      },
      {
        id: 'seed-save-2',
        scholar_id: 'f1000000-0000-0000-0000-000000000002',
        full_name: 'Dr. Sarah Edwards',
        slug: 'sarah-edwards',
        title: 'Associate Professor of New Testament',
        current_institution: 'Reformed Theological Seminary',
        primary_discipline: 'New Testament & Early Christianity',
        primary_tradition: 'Presbyterian',
        confessions: ['Westminster Larger and Shorter Catechisms [Full]'],
        terminal_degree: 'Ph.D. in Biblical Studies',
        terminal_degree_institution: 'University of Aberdeen',
        graduation_year: 2016,
        key_publications: [
          'Pauline Epistolography and Jewish Apocalypticism (2019)'
        ],
        availability_formats: ['online', 'hybrid'],
        created_at: new Date().toISOString()
      }
    ];

    return generateAccreditationMatrix(
      seedCandidates,
      dossier.institution_id || institutionId,
      dossier.institution_name || 'Academic Search Committee'
    );
  }

  return generateAccreditationMatrix(
    [],
    dossier.institution_id || institutionId,
    dossier.institution_name || 'Academic Search Committee'
  );
}
