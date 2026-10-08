import { describe, it, expect } from 'vitest';
import { APPLICANT_CSV_HEADERS, buildApplicantsCsv, csvCell } from '@/lib/postings/applicants-csv';
import type { ApplicantDossier } from '@/lib/postings/applicant-service';

const dossier = (over: Partial<ApplicantDossier> = {}): ApplicantDossier => ({
  applicationId: 'app-1',
  scholarId: 's-1',
  scholarName: 'Dr. Sarah Edwards',
  scholarSlug: 'sarah-edwards',
  title: 'Associate Professor',
  currentInstitution: 'Reformed Theological Seminary',
  highestDegree: 'Ph.D. in New Testament',
  degreeInstitution: 'University of Aberdeen',
  isTerminalDoctorate: true,
  confessions: ['Westminster Confession of Faith'],
  alignmentLevel: 'full',
  alignmentScorePercent: 95,
  coverNote: 'Excited to apply for this modular intensive teaching role.',
  status: 'submitted',
  appliedAt: '2026-09-29T12:00:00Z',
  statusChangedAt: '2026-09-29T12:00:00Z',
  note: '',
  dossier: {
    sealedAt: '2026-09-29T12:00:00Z',
    biography: null,
    location: null,
    institutionalRole: null,
    doctrinalStatement: null,
    orcidId: null,
    googleScholarUrl: null,
    credentials: [],
    publications: [],
    disciplines: [],
    traditions: [],
    confessions: [],
  },
  ...over,
});

describe('applicants CSV (RFC 4180 + formula-injection neutralisation)', () => {
  it('starts with a UTF-8 BOM and the evaluation headers', () => {
    const csv = buildApplicantsCsv([dossier()]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    for (const header of APPLICANT_CSV_HEADERS) expect(csv).toContain(`"${header}"`);
  });

  it('formats real rows with the real status', () => {
    const csv = buildApplicantsCsv([dossier({ status: 'interview_scheduled' })]);
    expect(csv).toContain('"Dr. Sarah Edwards"');
    expect(csv).toContain('"University of Aberdeen"');
    expect(csv).toContain('"YES"');
    expect(csv).toContain('"95%"');
    expect(csv).toContain('"INTERVIEW_SCHEDULED"');
    expect(csv).toContain('"2026-09-29"');
  });

  it('separates records with CRLF and quotes every field', () => {
    const csv = buildApplicantsCsv([dossier(), dossier({ applicationId: 'app-2' })]).slice(1);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(3);
    for (const line of lines) {
      expect(line.startsWith('"')).toBe(true);
      expect(line.endsWith('"')).toBe(true);
    }
  });

  it('doubles quotes and keeps commas and newlines inside the quoted field', () => {
    expect(csvCell('He said "hi", then\nleft')).toBe('"He said ""hi"", then\nleft"');
  });

  it('renders null and undefined as an empty quoted field', () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  it.each(['=1+1', '+1+1', '-1+1', '@SUM(A1)', '\t=1+1', '\r=1+1'])('neutralises the formula trigger %j', (value) => {
    expect(csvCell(value)).toBe(`"'${value}"`);
  });

  it('does not touch values that merely contain a trigger later', () => {
    expect(csvCell('a=b')).toBe('"a=b"');
    expect(csvCell('Dr. -Smith')).toBe('"Dr. -Smith"');
  });

  it('neutralises hostile applicant-controlled cells in a full export', () => {
    const csv = buildApplicantsCsv([
      dossier({ scholarName: '=HYPERLINK("http://evil.example","x")', coverNote: '@cmd|\' /C calc\'!A0', title: '+1' }),
    ]);
    expect(csv).toContain(`"'=HYPERLINK(""http://evil.example"",""x"")"`);
    expect(csv).toContain(`"'@cmd|' /C calc'!A0"`);
    expect(csv).toContain(`"'+1"`);
    expect(csv).not.toMatch(/,"=/);
    expect(csv).not.toMatch(/,"@/);
  });
});
