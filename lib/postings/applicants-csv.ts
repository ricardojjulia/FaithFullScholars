/**
 * ==============================================================================
 * FaithFull Scholars — Applicant matrix CSV (ADR 0027)
 *
 * One CSV module for the matrix export. RFC 4180 quoting (every field is quoted,
 * quotes doubled, CRLF between records) plus spreadsheet formula-injection
 * neutralisation: a cell that starts with = + - @, a tab, a carriage return or a line feed
 * is prefixed with a single quote so Excel and Sheets read it as text. The
 * applicant controls the cover note and profile text, so every free-text cell is
 * treated as hostile.
 * ==============================================================================
 */

import type { PostingApplicantReport } from '@/lib/postings/applicant-service';

const FORMULA_TRIGGER = /^[=+\-@\t\r\n]/;

/** Neutralises a spreadsheet formula and quotes the value per RFC 4180. */
export function csvCell(value: string | number | boolean | null | undefined): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (FORMULA_TRIGGER.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

export const APPLICANT_CSV_HEADERS = [
  'Candidate Name',
  'Preferred Title',
  'Current Institution',
  'Highest Degree',
  'Awarding Institution',
  'ATS Terminal Doctorate',
  'Declared Confessions',
  'Application Status',
  'Applied Date',
  'Cover Note',
] as const;

/** Builds the CSV for a set of applicants (a UTF-8 BOM first, for Excel). */
export function buildApplicantsCsv(applicants: PostingApplicantReport['applicants']): string {
  const rows = applicants.map((a) =>
    [
      csvCell(a.scholarName),
      csvCell(a.title),
      csvCell(a.currentInstitution),
      csvCell(a.highestDegree),
      csvCell(a.degreeInstitution),
      csvCell(a.isTerminalDoctorate ? 'YES' : 'NO'),
      csvCell(a.confessions.map((c) => (c.adherenceLevel ? `${c.name} (${c.adherenceLevel.replace(/_/g, ' ')})` : c.name)).join('; ')),
      csvCell(a.status.toUpperCase()),
      csvCell(new Date(a.appliedAt).toISOString().split('T')[0]),
      csvCell(a.coverNote),
    ].join(',')
  );
  const header = APPLICANT_CSV_HEADERS.map((h) => csvCell(h)).join(',');
  return `﻿${[header, ...rows].join('\r\n')}`;
}
