/**
 * ==============================================================================
 * FaithFull Scholars — Search Committee Applicant Matrix Engine (ADR 0020)
 *
 * Provides candidate application dossier triage, side-by-side comparative
 * matrices, ATS Standard 3 terminal degree validation, and confessional fit
 * scoring for seminary faculty search committees.
 * ==============================================================================
 */

import { createAdminClient } from '@/lib/supabase/server';
import { isTerminalDoctorate } from '@/lib/accreditation/ats-matrix-generator';
import {
  evaluateConfessionalAlignment,
  ConfessionalAlignmentLevel,
} from '@/lib/search/confessional-matcher';
import { InquiryStatus } from '@/lib/domain/types';

export interface ApplicantDossier {
  inquiryId: string;
  scholarId: string;
  scholarName: string;
  scholarSlug: string;
  title: string | null;
  currentInstitution: string | null;
  highestDegree: string | null;
  degreeInstitution: string | null;
  isTerminalDoctorate: boolean;
  confessions: string[];
  alignmentLevel: ConfessionalAlignmentLevel;
  alignmentScorePercent: number;
  coverNote: string;
  status: InquiryStatus;
  appliedAt: string;
}

export interface PostingApplicantReport {
  postingId: string;
  postingTitle: string;
  postingSlug: string;
  opportunityType: string;
  term: string;
  requiredDegree: string;
  confessionalRequirements: string | null;
  totalApplicants: number;
  terminalDoctoratesCount: number;
  terminalDoctoratesRatio: number;
  fullConfessionalMatchCount: number;
  applicants: ApplicantDossier[];
}

/**
 * Compiles a comprehensive applicant comparison report for a faculty opening.
 *
 * Reads with the service role, so `institutionId` is REQUIRED and must come from
 * the caller's verified membership (requireInstitutionMember): it is the only
 * thing scoping the report to the posting's owner.
 */
export async function getPostingApplicantReport(
  postingId: string,
  institutionId: string
): Promise<PostingApplicantReport | null> {
  if (!institutionId) {
    return null;
  }

  const adminDb = createAdminClient();

  // 1. Fetch posting
  const postingQuery = adminDb
    .from('institution_postings')
    .select(`
      id,
      institution_id,
      title,
      slug,
      opportunity_type,
      term,
      required_degree,
      confessional_requirements,
      traditions(name)
    `)
    .eq('id', postingId)
    .eq('institution_id', institutionId);

  const { data: posting, error: postingError } = await postingQuery.maybeSingle();

  if (postingError || !posting) {
    console.error('Error fetching posting for applicant report:', postingError);
    return null;
  }

  // 2. Fetch associated inquiries / Common App dossiers
  const { data: inquiries, error: inqError } = await adminDb
    .from('inquiries')
    .select(`
      id,
      scholar_id,
      opportunity_type,
      proposed_term,
      message,
      status,
      created_at
    `)
    .eq('institution_id', posting.institution_id)
    .order('created_at', { ascending: false });

  if (inqError || !inquiries) {
    console.error('Error fetching inquiries for applicant report:', inqError);
    return null;
  }

  // Filter inquiries related to this posting
  const relatedInquiries = inquiries.filter((inq) => {
    if (!inq.message) return false;
    const msg = inq.message;
    return (
      msg.includes(posting.id) ||
      msg.includes(posting.title) ||
      inq.opportunity_type === posting.opportunity_type
    );
  });

  const applicants: ApplicantDossier[] = [];
  let terminalDoctoratesCount = 0;
  let fullConfessionalMatchCount = 0;

  for (const inq of relatedInquiries) {
    // Fetch scholar profile, credentials, confessions
    const { data: scholar } = await adminDb
      .from('scholars')
      .select(`
        id,
        full_name,
        slug,
        title,
        current_institution,
        doctrinal_statement_text
      `)
      .eq('id', inq.scholar_id)
      .maybeSingle();

    if (!scholar) continue;

    // Fetch highest degree / credentials
    const { data: creds } = await adminDb
      .from('credentials')
      .select('degree, institution')
      .eq('scholar_id', scholar.id)
      .order('year', { ascending: false });

    const highestDegree = creds && creds.length > 0 ? creds[0].degree : null;
    const degreeInstitution = creds && creds.length > 0 ? creds[0].institution : null;
    const isTerminal = isTerminalDoctorate(highestDegree);
    if (isTerminal) terminalDoctoratesCount++;

    // Fetch confessions
    const { data: confessionsData } = await adminDb
      .from('scholar_confessions')
      .select(`
        confessional_standards(id, name, slug)
      `)
      .eq('scholar_id', scholar.id);

    const confessionsList = (confessionsData || [])
      .map((c) => (c.confessional_standards as unknown as { id: string; name: string; slug: string })?.name)
      .filter(Boolean);

    const mappedConfessions = (confessionsData || [])
      .map((c) => c.confessional_standards as unknown as { id: string; name: string; slug: string })
      .filter(Boolean);

    const traditionCategory = (posting.traditions as { name?: string } | null)?.name;

    const alignment = evaluateConfessionalAlignment({
      targetTradition: traditionCategory,
      scholarConfessions: mappedConfessions,
      scholarDoctrinalStatement: scholar.doctrinal_statement_text || undefined,
    });

    if (alignment.alignmentLevel === 'full' || alignment.alignmentLevel === 'substantial') {
      fullConfessionalMatchCount++;
    }

    // Strip prefix header from cover note if present
    let cleanedNote = inq.message;
    if (cleanedNote.startsWith('[Common App')) {
      const parts = cleanedNote.split('\n\n');
      cleanedNote = parts.length > 1 ? parts.slice(1).join('\n\n') : cleanedNote;
    }

    applicants.push({
      inquiryId: inq.id,
      scholarId: scholar.id,
      scholarName: scholar.full_name,
      scholarSlug: scholar.slug,
      title: scholar.title,
      currentInstitution: scholar.current_institution,
      highestDegree,
      degreeInstitution,
      isTerminalDoctorate: isTerminal,
      confessions: confessionsList,
      alignmentLevel: alignment.alignmentLevel,
      alignmentScorePercent: alignment.scorePercent,
      coverNote: cleanedNote,
      status: inq.status as InquiryStatus,
      appliedAt: inq.created_at,
    });
  }

  const totalApplicants = applicants.length;
  const terminalDoctoratesRatio = totalApplicants > 0
    ? Math.round((terminalDoctoratesCount / totalApplicants) * 100)
    : 0;

  return {
    postingId: posting.id,
    postingTitle: posting.title,
    postingSlug: posting.slug,
    opportunityType: posting.opportunity_type,
    term: posting.term,
    requiredDegree: posting.required_degree,
    confessionalRequirements: posting.confessional_requirements,
    totalApplicants,
    terminalDoctoratesCount,
    terminalDoctoratesRatio,
    fullConfessionalMatchCount,
    applicants,
  };
}

/**
 * Generates an RFC-4180 CSV export of candidate applicants for committee deliberation.
 */
export function exportApplicantMatrixCsv(report: PostingApplicantReport): string {
  const headers = [
    'Candidate Name',
    'Preferred Title',
    'Current Institution',
    'Highest Degree',
    'Awarding Institution',
    'ATS Terminal Doctorate',
    'Confessional Alignment',
    'Alignment Score',
    'Application Status',
    'Applied Date',
    'Cover Note',
  ];

  const escapeCsv = (val: string | null | undefined): string => {
    if (!val) return '""';
    return `"${val.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
  };

  const rows = report.applicants.map((a) => [
    escapeCsv(a.scholarName),
    escapeCsv(a.title),
    escapeCsv(a.currentInstitution),
    escapeCsv(a.highestDegree),
    escapeCsv(a.degreeInstitution),
    a.isTerminalDoctorate ? '"YES"' : '"NO"',
    escapeCsv(a.alignmentLevel.toUpperCase()),
    `"${a.alignmentScorePercent}%"`,
    escapeCsv(a.status.toUpperCase()),
    escapeCsv(new Date(a.appliedAt).toISOString().split('T')[0]),
    escapeCsv(a.coverNote),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  return `\uFEFF${csvContent}`;
}
