import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import path from 'node:path';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }), usePathname: () => '/' }));

import { PostingApplicantMatrix } from '@/components/institution/posting-applicant-matrix';
import { I18nProvider } from '@/lib/i18n/i18n-context';
import { buildApplicantsCsv } from '@/lib/postings/applicants-csv';
import type { ApplicantDossier, PostingApplicantReport } from '@/lib/postings/applicant-service';

/**
 * Owner decision (2026-10-08, ADR 0027): the platform shows what a scholar DECLARED
 * beside what the posting requires. It never derives a confessional "fit" score,
 * level or badge. This regression test fails if one comes back in the matrix, the
 * CSV, the report types or the service.
 */
const applicant: ApplicantDossier = {
  applicationId: 'app-1',
  scholarId: 's-1',
  scholarName: 'Dr. Sarah Edwards',
  scholarSlug: 'sarah-edwards',
  title: null,
  currentInstitution: 'RTS',
  highestDegree: 'Ph.D. in New Testament',
  degreeInstitution: 'Aberdeen',
  isTerminalDoctorate: true,
  confessions: [{ name: 'Westminster Confession of Faith', slug: 'wcf', adherenceLevel: 'with_exceptions', exceptionNotes: 'Chapter 24 on divorce' }],
  coverNote: 'Hello committee.',
  status: 'submitted',
  appliedAt: '2026-10-01T00:00:00Z',
  statusChangedAt: '2026-10-01T00:00:00Z',
  note: '',
  dossier: {
    sealedAt: '2026-10-01T00:00:00Z', biography: null, location: null, institutionalRole: null, doctrinalStatement: null,
    orcidId: null, googleScholarUrl: null, credentials: [], publications: [], disciplines: [], traditions: [], confessions: [],
  },
};
const report: PostingApplicantReport = {
  postingId: 'p', postingTitle: 'Adjunct NT', postingSlug: 'adjunct-nt', opportunityType: 'adjunct', term: 'Fall 2027',
  requiredDegree: 'Ph.D.', confessionalRequirements: 'Subscription to the Westminster Standards.', confessionalStandard: 'Reformed',
  totalApplicants: 1, terminalDoctoratesCount: 1, terminalDoctoratesRatio: 100, applicants: [applicant],
};

const FIT = /alignment|\bfit\b|\bscore\b|\d+\s?%\s*match|full match|substantial|ecumenical|distinctive/i;

describe('applicant matrix: declared confessions, no fit score', () => {
  const markup = renderToStaticMarkup(createElement(I18nProvider, null, createElement(PostingApplicantMatrix, { report })));
  const text = markup.replace(/<[^>]+>/g, ' ');

  it('has no fit, score or alignment column, badge or KPI', () => {
    expect(text).not.toMatch(FIT);
    expect(markup).not.toMatch(/Confessional (Fit|Alignment)/);
  });

  it('shows the declared confessions with adherence and exceptions, beside the posting\'s stated standard', () => {
    expect(text).toContain('Declared confessions');
    expect(text).toContain('Westminster Confession of Faith');
    expect(text).toContain('with exceptions');
    expect(text).toContain('Chapter 24 on divorce');
    expect(text).toContain('Subscription to the Westminster Standards.');
    expect(text).toContain('Reformed');
    expect(text).toContain('The platform does not rate the match.');
  });

  it('has a polite live region for status changes and an accessible table name', () => {
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('aria-label="Applicant Matrix"');
  });

  it('exports no fit column', () => {
    expect(buildApplicantsCsv([applicant])).not.toMatch(FIT);
  });

  it('keeps the matcher out of the service and the matrix', () => {
    const root = path.resolve(import.meta.dirname, '../..');
    for (const file of ['lib/postings/applicant-service.ts', 'components/institution/posting-applicant-matrix.tsx', 'lib/postings/applicants-csv.ts']) {
      expect(readFileSync(path.join(root, file), 'utf8'), file).not.toMatch(/confessional-matcher|evaluateConfessionalAlignment|alignmentScore|alignmentLevel/);
    }
  });
});
