import { describe, it, expect, vi } from 'vitest';
import { fetchATSAccreditationReport } from '@/lib/accreditation/ats-matrix-service';
import * as exportDossierModule from '@/lib/inquiries/export-dossier';

describe('fetchATSAccreditationReport (Service)', () => {
  it('loads candidates via shortlist dossier and compiles an ATS compliance report', async () => {
    const mockDossier: exportDossierModule.ShortlistDossier = {
      institution_id: 'inst-test-123',
      institution_name: 'Geneva Reformed Seminary',
      exported_at: '2026-09-29T12:00:00Z',
      total_candidates: 1,
      candidates: [
        {
          id: 'c-1',
          scholar_id: 's-1',
          full_name: 'Dr. Francis Turretin',
          slug: 'francis-turretin',
          title: 'Professor of Theology',
          current_institution: 'Academy of Geneva',
          primary_discipline: 'Systematic Theology',
          primary_tradition: 'Reformed',
          confessions: ['Westminster Standards [Full]'],
          terminal_degree: 'Doctor of Sacred Theology',
          terminal_degree_institution: 'Geneva Academy',
          graduation_year: 1650,
          key_publications: ['Institutes of Elenctic Theology'],
          availability_formats: ['in_person'],
          created_at: '2026-09-29T12:00:00Z'
        }
      ]
    };

    const spy = vi
      .spyOn(exportDossierModule, 'fetchShortlistDossier')
      .mockResolvedValue(mockDossier);

    const fakeClient = {} as Parameters<typeof fetchATSAccreditationReport>[0];
    const report = await fetchATSAccreditationReport(fakeClient, 'inst-test-123');

    expect(spy).toHaveBeenCalledWith(fakeClient, 'inst-test-123');
    expect(report.institution_id).toBe('inst-test-123');
    expect(report.institution_name).toBe('Geneva Reformed Seminary');
    expect(report.summary.total_faculty).toBe(1);
    expect(report.summary.terminal_degree_count).toBe(1);
    expect(report.summary.terminal_degree_percentage).toBe(100);
    expect(report.summary.ats_standard_3_compliant).toBe(true);
    expect(report.records[0].full_name).toBe('Dr. Francis Turretin');

    spy.mockRestore();
  });
});
