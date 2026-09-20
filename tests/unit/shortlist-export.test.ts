import { describe, it, expect } from 'vitest';
import {
  generateShortlistCsv,
  ShortlistDossierCandidate
} from '@/lib/inquiries/export-dossier';

const MOCK_CANDIDATES: ShortlistDossierCandidate[] = [
  {
    id: 'cand-1',
    scholar_id: 'scholar-uuid-1',
    full_name: 'Dr. Thomas Cranmer-Davies',
    slug: 'dr-thomas-cranmer-davies',
    title: 'Professor of Old Testament',
    current_institution: 'University of Oxford',
    primary_discipline: 'Old Testament & Hebrew Scriptures',
    primary_tradition: 'Anglican & Episcopalian',
    confessions: ['Thirty-Nine Articles of Religion [full]'],
    terminal_degree: 'D.Phil. in Oriental Studies',
    terminal_degree_institution: 'University of Oxford',
    graduation_year: 2012,
    key_publications: ['The Syntax of Sorrow (2018)', 'Royal Ideology in the Songs of Ascents (2021)'],
    availability_formats: ['modular_intensive', 'online_synchronous'],
    relocation_preference: 'open_to_relocation',
    notes: 'Top candidate for Michaelmas term modular intensive.',
    created_at: '2026-09-18T10:00:00Z'
  },
  {
    id: 'cand-2',
    scholar_id: 'scholar-uuid-2',
    full_name: 'Dr. Marcus Aurelius Vance',
    slug: 'dr-marcus-aurelius-vance',
    title: 'Associate Professor of Apologetics',
    current_institution: 'Southern Baptist Theological Seminary',
    primary_discipline: 'Systematic Theology',
    primary_tradition: 'Confessional Baptist',
    confessions: ['1689 London Baptist Confession of Faith [full]'],
    terminal_degree: 'Ph.D. in Systematic Theology',
    terminal_degree_institution: 'Southern Baptist Theological Seminary',
    graduation_year: 2016,
    key_publications: ['The Logic of Covenantal Epistemology (2020)'],
    availability_formats: ['guest_lecture', 'online_asynchronous'],
    relocation_preference: null,
    notes: 'Invited for the annual theology symposium, "Faith & Reason."',
    created_at: '2026-09-19T14:30:00Z'
  }
];

describe('Shortlist & Search Committee Dossier Export (Feature 1)', () => {
  it('generates an RFC-4180 CSV string with UTF-8 BOM for Excel/Sheets', () => {
    const csv = generateShortlistCsv(MOCK_CANDIDATES);

    // Check BOM prefix (\uFEFF)
    expect(csv.startsWith('\uFEFF')).toBe(true);

    const lines = csv.slice(1).split('\r\n');
    expect(lines.length).toBe(3); // Header + 2 rows

    const header = lines[0];
    expect(header).toContain('Full Name');
    expect(header).toContain('Terminal Degree');
    expect(header).toContain('Confessional Standards');
    expect(header).toContain('Committee Notes');
    expect(header).toContain('Profile URL');
  });

  it('correctly escapes commas, quotes, and newlines in CSV fields', () => {
    const csv = generateShortlistCsv([
      {
        id: 'c-special',
        scholar_id: 's-special',
        full_name: 'Dr. John "Jack" Owen, Jr.',
        slug: 'john-owen',
        title: 'Dean, School of Theology',
        current_institution: 'Trinity College, Cambridge',
        primary_discipline: 'Historical Theology & Church History',
        primary_tradition: 'Reformed & Presbyterian',
        confessions: ['Westminster Confession of Faith (1647) [full]'],
        terminal_degree: 'Ph.D.',
        terminal_degree_institution: 'Cambridge',
        graduation_year: 2010,
        key_publications: ['"Justification by Faith Alone," in Works, vol. 5'],
        availability_formats: ['residential'],
        notes: 'Dean remarked: "Outstanding scholar; must recruit."\nAvailable immediately.',
        created_at: '2026-09-20T00:00:00Z'
      }
    ]);

    // Name with quotes should have escaped quotes: ""Jack""
    expect(csv).toContain('""Jack""');
    // Field with commas should be surrounded by quotes
    expect(csv).toContain('"Trinity College, Cambridge"');
    // Notes with newline should preserve line breaks safely within quotes
    expect(csv).toContain('Dean remarked: ""Outstanding scholar; must recruit.""\nAvailable immediately.');
  });

  it('generates accurate profile URLs linking to scholar profiles', () => {
    const csv = generateShortlistCsv(MOCK_CANDIDATES, 'https://staging.faithfullscholars.com');
    expect(csv).toContain('https://staging.faithfullscholars.com/scholars/dr-thomas-cranmer-davies');
    expect(csv).toContain('https://staging.faithfullscholars.com/scholars/dr-marcus-aurelius-vance');
  });
});
