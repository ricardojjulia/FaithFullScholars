import { describe, it, expect } from 'vitest';
import { isTerminalDoctorate } from '@/lib/accreditation/ats-matrix-generator';
import {
  evaluateConfessionalAlignment,
} from '@/lib/search/confessional-matcher';
import {
  exportApplicantMatrixCsv,
  PostingApplicantReport,
} from '@/lib/postings/applicant-service';

describe('Search Committee Applicant Matrix & Confessional Common App (ADR 0020)', () => {
  describe('ATS Standard 3 Terminal Degree Qualifications', () => {
    it('accurately identifies theological doctorate degrees as terminal', () => {
      expect(isTerminalDoctorate('Ph.D. in Systematic Theology')).toBe(true);
      expect(isTerminalDoctorate('Doctor of Philosophy (Ph.D.)')).toBe(true);
      expect(isTerminalDoctorate('Th.D. in Old Testament')).toBe(true);
      expect(isTerminalDoctorate('D.Phil. in Patristics (Oxford)')).toBe(true);
      expect(isTerminalDoctorate('D.Min. in Expository Preaching')).toBe(true);
      expect(isTerminalDoctorate('S.T.D. (Doctor of Sacred Theology)')).toBe(true);
    });

    it('rejects master degrees and candidate designations as terminal', () => {
      expect(isTerminalDoctorate('Master of Divinity (M.Div.)')).toBe(false);
      expect(isTerminalDoctorate('Th.M. in Historical Theology')).toBe(false);
      expect(isTerminalDoctorate('M.A. in Biblical Studies')).toBe(false);
      expect(isTerminalDoctorate('Ph.D. Candidate (ABD)')).toBe(false);
      expect(isTerminalDoctorate(null)).toBe(false);
      expect(isTerminalDoctorate(undefined)).toBe(false);
    });
  });

  describe('Confessional Alignment Engine', () => {
    it('scores full alignment when candidate directly affirms target confessional standard', () => {
      const result = evaluateConfessionalAlignment({
        targetStandardId: 'westminster-confession',
        scholarConfessions: [
          { id: 'c1', name: 'Westminster Confession of Faith (1646)', slug: 'westminster-confession' },
        ],
      });

      expect(result.alignmentLevel).toBe('full');
      expect(result.scorePercent).toBe(100);
    });

    it('scores substantial alignment when candidate affirms matching tradition', () => {
      const result = evaluateConfessionalAlignment({
        targetTradition: 'Reformed',
        scholarConfessions: [
          { id: 'c1', name: 'Westminster Confession of Faith (1646)', slug: 'westminster-confession' },
        ],
      });

      expect(result.alignmentLevel).toBe('substantial');
      expect(result.scorePercent).toBeGreaterThanOrEqual(80);
    });

    it('scores distinctive when candidate has no historic confessional affirmations', () => {
      const result = evaluateConfessionalAlignment({
        targetTradition: 'Reformed',
        scholarConfessions: [],
        scholarDoctrinalStatement: 'Personal statement of faith in the historic gospel.',
      });

      expect(result.alignmentLevel).toBe('distinctive');
      expect(result.scorePercent).toBeLessThan(50);
    });
  });

  describe('RFC-4180 CSV Export Generation', () => {
    const mockReport: PostingApplicantReport = {
      postingId: 'p-1',
      postingTitle: 'Adjunct Professor of New Testament Greek',
      postingSlug: 'adjunct-greek-fall-2027',
      opportunityType: 'adjunct',
      term: 'Fall 2027',
      requiredDegree: 'Ph.D. or Th.D. in New Testament',
      confessionalRequirements: 'Westminster Standards or Three Forms of Unity',
      totalApplicants: 2,
      terminalDoctoratesCount: 2,
      terminalDoctoratesRatio: 100,
      fullConfessionalMatchCount: 2,
      applicants: [
        {
          inquiryId: 'inq-1',
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
          status: 'pending',
          appliedAt: '2026-09-29T12:00:00Z',
        },
        {
          inquiryId: 'inq-2',
          scholarId: 's-2',
          scholarName: 'Dr. Calvin Edwards',
          scholarSlug: 'calvin-edwards',
          title: 'Professor of Theology',
          currentInstitution: 'Covenant Theological Seminary',
          highestDegree: 'Th.D. in Systematic Theology',
          degreeInstitution: 'Harvard Divinity School',
          isTerminalDoctorate: true,
          confessions: ['Westminster Confession of Faith', 'Nicene Creed'],
          alignmentLevel: 'full',
          alignmentScorePercent: 92,
          coverNote: 'Please review my attached dossier for the Greek seminar opening.',
          status: 'accepted',
          appliedAt: '2026-09-28T14:30:00Z',
        },
      ],
    };

    it('generates UTF-8 BOM formatted CSV for Excel compatibility', () => {
      const csv = exportApplicantMatrixCsv(mockReport);
      expect(csv.charCodeAt(0)).toBe(0xfeff);
    });

    it('includes required candidate evaluation headers', () => {
      const csv = exportApplicantMatrixCsv(mockReport);
      expect(csv).toContain('Candidate Name');
      expect(csv).toContain('ATS Terminal Doctorate');
      expect(csv).toContain('Confessional Alignment');
      expect(csv).toContain('Application Status');
    });

    it('formats candidate rows accurately', () => {
      const csv = exportApplicantMatrixCsv(mockReport);
      expect(csv).toContain('"Dr. Sarah Edwards"');
      expect(csv).toContain('"University of Aberdeen"');
      expect(csv).toContain('"YES"');
      expect(csv).toContain('"95%"');
      expect(csv).toContain('"Dr. Calvin Edwards"');
      expect(csv).toContain('"ACCEPTED"');
    });
  });
});
