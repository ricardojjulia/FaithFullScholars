/**
 * ==============================================================================
 * FaithFull Scholars — ATS & ABHE Accreditation Self-Study Matrix Engine (ADR 0019)
 *
 * Implements automated faculty credentials compilation, terminal doctorate
 * ratio calculations, and ATS Standard 3 / ABHE Standard 11 compliant tables
 * for seminary decennial self-studies, site visits, and annual reporting.
 * ==============================================================================
 */

import type { ShortlistDossierCandidate } from '@/lib/inquiries/export-dossier';

export interface FacultyComplianceRecord {
  scholar_id: string;
  full_name: string;
  slug: string;
  title: string | null;
  current_institution: string | null;
  highest_degree: string | null;
  degree_institution: string | null;
  graduation_year: number | null;
  is_terminal: boolean;
  primary_discipline: string | null;
  publications_count: number;
  confessions: string[];
  is_confessionally_affirmed: boolean;
}

export interface ATSComplianceSummary {
  total_faculty: number;
  terminal_degree_count: number;
  terminal_degree_percentage: number;
  ats_standard_3_compliant: boolean; // ATS Standard 3 recommends >= 50% terminal doctorates
  total_publications: number;
  confessional_affirmation_count: number;
  confessional_affirmation_percentage: number;
}

export interface ATSComplianceReport {
  institution_id: string;
  institution_name: string;
  generated_at: string;
  summary: ATSComplianceSummary;
  records: FacultyComplianceRecord[];
}

/**
 * Evaluates whether an academic degree qualifies as a terminal doctorate
 * under ATS / ABHE guidelines (Ph.D., Th.D., D.Phil., D.Min., S.T.D., Ed.D., D.Miss.).
 */
export function isTerminalDoctorate(degree: string | null | undefined): boolean {
  if (!degree) return false;
  const d = degree.trim().toLowerCase();

  // Guard against in-progress / candidate designations
  const nonTerminalFlags = /\b(candidate|in progress|abd|pursuing|student|expected)\b/i;
  if (nonTerminalFlags.test(d)) {
    return false;
  }

  // Terminal theological & academic doctorates
  const terminalPatterns = [
    /\bph\.?d\b/i,
    /\bth\.?d\b/i,
    /\bd\.?phil\b/i,
    /\bd\.?min\b/i,
    /\bs\.?t\.?d\b/i,
    /\bed\.?d\b/i,
    /\bd\.?miss\b/i,
    /\bd\.?theol\b/i,
    /\bdoctor of philosophy\b/i,
    /\bdoctor of theology\b/i,
    /\bdoctor of ministry\b/i,
    /\bdoctor of sacred theology\b/i,
    /\bdoctor of education\b/i,
    /\bdoctorate\b/i
  ];

  return terminalPatterns.some((pattern) => pattern.test(d));
}

/**
 * Generates an ATS Standard 3 & ABHE Standard 11 compliant faculty matrix report
 * from candidate shortlist records.
 */
export function generateAccreditationMatrix(
  candidates: ShortlistDossierCandidate[],
  institutionId: string = '',
  institutionName: string = 'Academic Search Committee'
): ATSComplianceReport {
  const records: FacultyComplianceRecord[] = candidates.map((c) => {
    const isTerminal = isTerminalDoctorate(c.terminal_degree);
    const pubCount = Array.isArray(c.key_publications) ? c.key_publications.length : 0;
    const hasConfessions = Array.isArray(c.confessions) && c.confessions.length > 0;

    return {
      scholar_id: c.scholar_id,
      full_name: c.full_name,
      slug: c.slug,
      title: c.title || null,
      current_institution: c.current_institution || 'Independent',
      highest_degree: c.terminal_degree || null,
      degree_institution: c.terminal_degree_institution || null,
      graduation_year: c.graduation_year || null,
      is_terminal: isTerminal,
      primary_discipline: c.primary_discipline || null,
      publications_count: pubCount,
      confessions: c.confessions || [],
      is_confessionally_affirmed: hasConfessions
    };
  });

  const total = records.length;
  const terminalCount = records.filter((r) => r.is_terminal).length;
  const terminalPercentage = total > 0 ? Math.round((terminalCount / total) * 1000) / 10 : 0;
  const totalPubs = records.reduce((acc, r) => acc + r.publications_count, 0);
  const confessionalCount = records.filter((r) => r.is_confessionally_affirmed).length;
  const confessionalPercentage = total > 0 ? Math.round((confessionalCount / total) * 1000) / 10 : 0;

  const summary: ATSComplianceSummary = {
    total_faculty: total,
    terminal_degree_count: terminalCount,
    terminal_degree_percentage: terminalPercentage,
    ats_standard_3_compliant: total > 0 && terminalPercentage >= 50.0,
    total_publications: totalPubs,
    confessional_affirmation_count: confessionalCount,
    confessional_affirmation_percentage: confessionalPercentage
  };

  return {
    institution_id: institutionId,
    institution_name: institutionName,
    generated_at: new Date().toISOString(),
    summary,
    records
  };
}

/**
 * Escapes field values for RFC-4180 CSV export and neutralizes spreadsheet formula injection.
 */
export function escapeCsv(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  // Neutralize CSV formula injection (=, +, -, @, tab, CR)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generates an RFC-4180 CSV spreadsheet with UTF-8 BOM formatted for
 * ATS Table 1 & Table 2 Self-Study submissions.
 */
export function exportAccreditationCsv(
  report: ATSComplianceReport,
  baseUrl: string = 'https://faithfullscholars.com'
): string {
  const headers = [
    'Faculty Member',
    'Academic Title',
    'Current Institution',
    'Highest Earned Degree',
    'Degree Awarding Institution',
    'Graduation Year',
    'Terminal Doctorate (ATS Std 3)',
    'Primary Teaching Discipline',
    'Scholarly Works Count',
    'Confessional Standards Affirmed',
    'Confessionally Verified',
    'Profile URL'
  ];

  const rows = report.records.map((r) => [
    escapeCsv(r.full_name),
    escapeCsv(r.title || ''),
    escapeCsv(r.current_institution || 'Independent'),
    escapeCsv(r.highest_degree || 'Unspecified'),
    escapeCsv(r.degree_institution || 'Unspecified'),
    escapeCsv(r.graduation_year || ''),
    escapeCsv(r.is_terminal ? 'YES' : 'NO'),
    escapeCsv(r.primary_discipline || 'General Studies'),
    escapeCsv(r.publications_count),
    escapeCsv(r.confessions.join('; ')),
    escapeCsv(r.is_confessionally_affirmed ? 'YES' : 'NO'),
    escapeCsv(`${baseUrl}/scholars/${r.slug}`)
  ]);

  const summaryHeader = [
    `ATS & ABHE Self-Study Faculty Credentials Matrix — ${report.institution_name}`,
    `Report Generated: ${report.generated_at.split('T')[0]}`,
    `Total Faculty Evaluated: ${report.summary.total_faculty}`,
    `Terminal Doctorate Ratio: ${report.summary.terminal_degree_percentage}% (${report.summary.terminal_degree_count}/${report.summary.total_faculty})`,
    `ATS Standard 3 Minimum (50%): ${report.summary.ats_standard_3_compliant ? 'MEETS STANDARD' : 'DEFICIT'}`,
    `Total Scholarly Output Items: ${report.summary.total_publications}`,
    `Confessional Affirmation Ratio: ${report.summary.confessional_affirmation_percentage}%`
  ];

  const summarySection = summaryHeader.map((line) => escapeCsv(line)).join('\r\n');
  const tableSection = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

  return `\uFEFF${summarySection}\r\n\r\n${tableSection}`;
}
