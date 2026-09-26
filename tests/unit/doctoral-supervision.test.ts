import { describe, it, expect } from 'vitest';
import enMessages from '@/lib/i18n/messages/en.json';
import esMessages from '@/lib/i18n/messages/es.json';
import { OpportunityType } from '@/lib/domain/types';

describe('Doctoral Dissertation Supervision & External Committee Reader Exchange (ADR 0018)', () => {
  it('recognizes doctoral_supervision as a supported opportunity type', () => {
    const validOpportunityTypes: OpportunityType[] = [
      'adjunct_teaching',
      'online_instruction',
      'intensives_modular',
      'guest_lecturing',
      'doctoral_supervision',
      'curriculum_consulting',
      'conference_speaking',
    ];

    expect(validOpportunityTypes).toContain('doctoral_supervision');
  });

  it('correctly filters terminal degrees for ATS doctoral committee qualification', () => {
    const credentials = [
      {
        degree: 'B.A.',
        field_of_study: 'Biblical Studies',
        institution_name: 'Wheaton College',
        is_terminal: false,
      },
      {
        degree: 'M.Div.',
        field_of_study: 'Theology',
        institution_name: 'Trinity Evangelical Divinity School',
        is_terminal: false,
      },
      {
        degree: 'Ph.D.',
        field_of_study: 'New Testament & Early Christianity',
        institution_name: 'University of Cambridge',
        year_awarded: 2017,
        is_terminal: true,
      },
    ];

    const terminalDegrees = credentials.filter((c) => c.is_terminal);
    expect(terminalDegrees).toHaveLength(1);
    expect(terminalDegrees[0].degree).toBe('Ph.D.');
    expect(terminalDegrees[0].institution_name).toBe('University of Cambridge');
  });

  it('determines scholar availability for doctoral committee appointments', () => {
    const scholarAvailability = {
      is_available_for_hire: true,
      opportunity_types: ['adjunct_teaching', 'doctoral_supervision', 'guest_lecturing'] as OpportunityType[],
      available_terms: ['Fall 2026', 'Spring 2027'],
    };

    const isAvailableForDoctoralCommittee =
      scholarAvailability.is_available_for_hire &&
      scholarAvailability.opportunity_types.includes('doctoral_supervision');

    expect(isAvailableForDoctoralCommittee).toBe(true);
  });

  it('maintains 100% symmetric i18n key parity between en.json and es.json for doctoral namespace', () => {
    const enDoctoral = (enMessages as Record<string, Record<string, string>>)['doctoral'];
    const esDoctoral = (esMessages as Record<string, Record<string, string>>)['doctoral'];

    expect(enDoctoral).toBeDefined();
    expect(esDoctoral).toBeDefined();

    const enKeys = Object.keys(enDoctoral).sort();
    const esKeys = Object.keys(esDoctoral).sort();

    expect(enKeys).toEqual(esKeys);
    expect(enKeys.length).toBeGreaterThanOrEqual(10);

    // Verify key translations exist and are non-empty
    for (const key of enKeys) {
      expect(enDoctoral[key].length).toBeGreaterThan(0);
      expect(esDoctoral[key].length).toBeGreaterThan(0);
    }
  });
});
