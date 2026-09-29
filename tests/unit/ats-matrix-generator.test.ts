import { describe, it, expect } from 'vitest';
import {
  isTerminalDoctorate,
  generateAccreditationMatrix,
  exportAccreditationCsv,
  escapeCsv,
  ATSComplianceReport
} from '@/lib/accreditation/ats-matrix-generator';
import { ShortlistDossierCandidate } from '@/lib/inquiries/export-dossier';

describe('ATS/ABHE Accreditation Matrix Engine (ADR 0019)', () => {
  describe('isTerminalDoctorate', () => {
    it('identifies terminal academic and ministerial doctorates correctly', () => {
      expect(isTerminalDoctorate('Ph.D. in New Testament')).toBe(true);
      expect(isTerminalDoctorate('PhD')).toBe(true);
      expect(isTerminalDoctorate('Th.D. in Historical Theology')).toBe(true);
      expect(isTerminalDoctorate('D.Phil in Oriental Studies')).toBe(true);
      expect(isTerminalDoctorate('D.Min. in Expository Preaching')).toBe(true);
      expect(isTerminalDoctorate('S.T.D. in Dogmatic Theology')).toBe(true);
      expect(isTerminalDoctorate('Ed.D. in Christian Education')).toBe(true);
      expect(isTerminalDoctorate('Doctor of Philosophy')).toBe(true);
      expect(isTerminalDoctorate('Doctor of Theology')).toBe(true);
    });

    it('rejects master’s degrees and non-terminal credentials', () => {
      expect(isTerminalDoctorate('M.Div.')).toBe(false);
      expect(isTerminalDoctorate('Th.M. in Systematic Theology')).toBe(false);
      expect(isTerminalDoctorate('M.A. in Biblical Studies')).toBe(false);
      expect(isTerminalDoctorate('M.T.S.')).toBe(false);
      expect(isTerminalDoctorate('B.A. in Religion')).toBe(false);
      expect(isTerminalDoctorate(null)).toBe(false);
      expect(isTerminalDoctorate(undefined)).toBe(false);
      expect(isTerminalDoctorate('')).toBe(false);
    });

    it('rejects in-progress, candidate, and ABD doctoral statuses (ATS Std 3 rule)', () => {
      expect(isTerminalDoctorate('Ph.D. Candidate')).toBe(false);
      expect(isTerminalDoctorate('Doctor of Ministry (In Progress)')).toBe(false);
      expect(isTerminalDoctorate('ABD (All But Dissertation)')).toBe(false);
      expect(isTerminalDoctorate('Pursuing Ph.D. in Old Testament')).toBe(false);
      expect(isTerminalDoctorate('Expected Th.D. 2027')).toBe(false);
      expect(isTerminalDoctorate('Doctoral Student')).toBe(false);
    });
  });

  describe('generateAccreditationMatrix', () => {
    it('handles empty candidate lists safely', () => {
      const report = generateAccreditationMatrix([], 'inst-1', 'Test Seminary');
      expect(report.institution_id).toBe('inst-1');
      expect(report.institution_name).toBe('Test Seminary');
      expect(report.summary.total_faculty).toBe(0);
      expect(report.summary.terminal_degree_count).toBe(0);
      expect(report.summary.terminal_degree_percentage).toBe(0);
      expect(report.summary.ats_standard_3_compliant).toBe(false);
      expect(report.summary.total_publications).toBe(0);
      expect(report.records).toHaveLength(0);
    });

    it('calculates ATS Standard 3 terminal degree ratios and compliance correctly', () => {
      const candidates: ShortlistDossierCandidate[] = [
        {
          id: 's-1',
          scholar_id: 'sch-1',
          full_name: 'Dr. John Calvin',
          slug: 'john-calvin',
          title: 'Professor of Systematic Theology',
          current_institution: 'Geneva Academy',
          primary_discipline: 'Systematic Theology',
          primary_tradition: 'Reformed',
          confessions: ['Westminster Standards [Full]'],
          terminal_degree: 'Doctor of Sacred Theology',
          terminal_degree_institution: 'University of Paris',
          graduation_year: 1532,
          key_publications: ['Institutes of the Christian Religion'],
          availability_formats: ['in_person', 'modular'],
          created_at: new Date().toISOString()
        },
        {
          id: 's-2',
          scholar_id: 'sch-2',
          full_name: 'Dr. B.B. Warfield',
          slug: 'bb-warfield',
          title: 'Professor of Didactic and Polemic Theology',
          current_institution: 'Princeton Seminary',
          primary_discipline: 'Apologetics',
          primary_tradition: 'Presbyterian',
          confessions: ['Westminster Standards [Full]'],
          terminal_degree: 'Ph.D.',
          terminal_degree_institution: 'Princeton University',
          graduation_year: 1880,
          key_publications: ['The Inspiration and Authority of the Bible', 'Counterfeit Miracles'],
          availability_formats: ['online'],
          created_at: new Date().toISOString()
        },
        {
          id: 's-3',
          scholar_id: 'sch-3',
          full_name: 'Rev. Candidate Scholar',
          slug: 'rev-scholar',
          title: 'Instructor in Greek',
          current_institution: 'Local Bible College',
          primary_discipline: 'New Testament',
          primary_tradition: 'Baptist',
          confessions: [],
          terminal_degree: 'Th.M.',
          terminal_degree_institution: 'Trinity Evangelical Divinity School',
          graduation_year: 2020,
          key_publications: [],
          availability_formats: ['online'],
          created_at: new Date().toISOString()
        }
      ];

      const report = generateAccreditationMatrix(candidates, 'inst-1', 'Calvin Theological Seminary');

      expect(report.summary.total_faculty).toBe(3);
      expect(report.summary.terminal_degree_count).toBe(2);
      // 2 / 3 = 66.7%
      expect(report.summary.terminal_degree_percentage).toBe(66.7);
      expect(report.summary.ats_standard_3_compliant).toBe(true);
      expect(report.summary.total_publications).toBe(3);
      expect(report.summary.confessional_affirmation_count).toBe(2);
      expect(report.summary.confessional_affirmation_percentage).toBe(66.7);

      expect(report.records[0].is_terminal).toBe(true);
      expect(report.records[1].is_terminal).toBe(true);
      expect(report.records[2].is_terminal).toBe(false);
    });

    it('flags compliance deficit when terminal doctorates fall below 50%', () => {
      const candidates: ShortlistDossierCandidate[] = [
        {
          id: 's-1',
          scholar_id: 'sch-1',
          full_name: 'Dr. One Doctor',
          slug: 'one-doctor',
          terminal_degree: 'Ph.D.',
          confessions: [],
          key_publications: [],
          availability_formats: [],
          created_at: new Date().toISOString()
        },
        {
          id: 's-2',
          scholar_id: 'sch-2',
          full_name: 'Pastor Master One',
          slug: 'master-one',
          terminal_degree: 'M.Div.',
          confessions: [],
          key_publications: [],
          availability_formats: [],
          created_at: new Date().toISOString()
        },
        {
          id: 's-3',
          scholar_id: 'sch-3',
          full_name: 'Pastor Master Two',
          slug: 'master-two',
          terminal_degree: 'Th.M.',
          confessions: [],
          key_publications: [],
          availability_formats: [],
          created_at: new Date().toISOString()
        }
      ];

      const report = generateAccreditationMatrix(candidates, 'inst-2', 'Biblical Institute');
      expect(report.summary.terminal_degree_count).toBe(1);
      expect(report.summary.terminal_degree_percentage).toBe(33.3);
      expect(report.summary.ats_standard_3_compliant).toBe(false);
    });
  });

  describe('exportAccreditationCsv', () => {
    it('produces RFC-4180 CSV with UTF-8 BOM and correct metadata headers', () => {
      const report: ATSComplianceReport = {
        institution_id: 'inst-1',
        institution_name: 'Reformed Theological Seminary',
        generated_at: '2026-09-29T12:00:00.000Z',
        summary: {
          total_faculty: 1,
          terminal_degree_count: 1,
          terminal_degree_percentage: 100,
          ats_standard_3_compliant: true,
          total_publications: 1,
          confessional_affirmation_count: 1,
          confessional_affirmation_percentage: 100
        },
        records: [
          {
            scholar_id: 'sch-1',
            full_name: 'Dr. Herman Bavinck',
            slug: 'herman-bavinck',
            title: 'Chair of Dogmatics',
            current_institution: 'Free University of Amsterdam',
            highest_degree: 'Doctor of Theology',
            degree_institution: 'Leiden University',
            graduation_year: 1880,
            is_terminal: true,
            primary_discipline: 'Dogmatic Theology',
            publications_count: 4,
            confessions: ['Three Forms of Unity [Full]'],
            is_confessionally_affirmed: true
          }
        ]
      };

      const csv = exportAccreditationCsv(report);

      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('ATS & ABHE Self-Study Faculty Credentials Matrix — Reformed Theological Seminary');
      expect(csv).toContain('Terminal Doctorate (ATS Std 3)');
      expect(csv).toContain('Dr. Herman Bavinck');
      expect(csv).toContain('YES');
      expect(csv).toContain('Free University of Amsterdam');
    });

    it('neutralizes spreadsheet formula injection in CSV cells', () => {
      expect(escapeCsv('=SUM(A1:A10)')).toBe('"\'=SUM(A1:A10)"');
      expect(escapeCsv('+12345')).toBe('"\' +12345"'.replace(' ', ''));
      expect(escapeCsv('@danger')).toBe('"\'@danger"');
      expect(escapeCsv('-cmd|calc')).toBe('"\' -cmd|calc"'.replace(' ', ''));
      expect(escapeCsv('\talert()')).toBe('"\'\talert()"');
    });

    it('escapes quotes, commas, and special characters cleanly in RFC-4180 format', () => {
      expect(escapeCsv('St. John\'s "The Beloved" Seminary')).toBe('"St. John\'s ""The Beloved"" Seminary"');
      expect(escapeCsv('Biblical Studies, Ancient History')).toBe('"Biblical Studies, Ancient History"');
      expect(escapeCsv('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
    });

    it('escapes institution names containing quotes in summary headers', () => {
      const report: ATSComplianceReport = {
        institution_id: 'inst-quotes',
        institution_name: 'St. John\'s "The Beloved" Theological Seminary',
        generated_at: '2026-09-29T12:00:00.000Z',
        summary: {
          total_faculty: 0,
          terminal_degree_count: 0,
          terminal_degree_percentage: 0,
          ats_standard_3_compliant: false,
          total_publications: 0,
          confessional_affirmation_count: 0,
          confessional_affirmation_percentage: 0
        },
        records: []
      };

      const csv = exportAccreditationCsv(report);
      expect(csv).toContain('"ATS & ABHE Self-Study Faculty Credentials Matrix — St. John\'s ""The Beloved"" Theological Seminary"');
    });
  });
});
