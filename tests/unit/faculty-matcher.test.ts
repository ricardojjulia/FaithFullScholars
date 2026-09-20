import { describe, it, expect } from 'vitest';
import {
  matchFacultyHeuristic,
  matchFacultyWithGemini,
  CandidateForMatching,
} from '@/lib/ai/gemini-faculty-matcher';

const MOCK_ROSTER: CandidateForMatching[] = [
  {
    id: 'scholar-owen',
    slug: 'john-owen',
    full_name: 'Dr. John Owen, Ph.D.',
    title: 'Professor of Systematic Theology',
    current_institution: 'Christ Church, Oxford',
    disciplines: [{ name: 'Systematic Theology', is_primary: true }],
    traditions: [{ name: 'Reformed & Presbyterian', is_primary: true }],
    confessions: [
      {
        name: 'Westminster Confession of Faith (1647)',
        adherence_level: 'full_subscription',
      },
    ],
    credentials: [
      {
        degree: 'D.Phil.',
        field_of_study: 'Theology',
        institution_name: 'University of Oxford',
        year_awarded: 2012,
        is_terminal: true,
      },
    ],
    publications: [
      {
        title: 'The Mortification of Sin in Believers',
        publication_type: 'book',
        year: 2018,
        citation_text: 'Oxford University Press, 2018',
      },
    ],
    courses: [
      {
        title: 'Doctrine of Justification & Atonement',
        level: 'graduate',
        delivery_modes: ['residential', 'online_synchronous'],
      },
    ],
    availability: {
      is_available_for_hire: true,
      opportunity_types: ['modular_intensive', 'adjunct'],
      preferred_delivery_modes: ['residential', 'online_synchronous'],
    },
  },
  {
    id: 'scholar-bunyan',
    slug: 'john-bunyan',
    full_name: 'Dr. John Bunyan',
    title: 'Lecturer in Biblical Literature & Preaching',
    current_institution: 'Bedford Theological College',
    disciplines: [{ name: 'Pastoral & Practical Theology', is_primary: true }],
    traditions: [{ name: 'Baptist (Reformed & Historic)', is_primary: true }],
    confessions: [
      {
        name: '1689 Second London Baptist Confession',
        adherence_level: 'full_subscription',
      },
    ],
    credentials: [
      {
        degree: 'Ph.D.',
        field_of_study: 'Homiletics',
        institution_name: 'University of Cambridge',
        year_awarded: 2016,
        is_terminal: true,
      },
    ],
    publications: [
      {
        title: 'Grace Abounding to the Chief of Sinners',
        publication_type: 'book',
        year: 2019,
        citation_text: 'Cambridge University Press, 2019',
      },
    ],
    courses: [
      {
        title: 'Expository Preaching in the Puritan Tradition',
        level: 'graduate',
        delivery_modes: ['residential'],
      },
    ],
    availability: {
      is_available_for_hire: true,
      opportunity_types: ['adjunct'],
      preferred_delivery_modes: ['residential'],
    },
  },
];

describe('Citation-Grounded AI Faculty Matcher (Feature 3)', () => {
  it('returns empty array when query or roster is empty', () => {
    expect(matchFacultyHeuristic('', MOCK_ROSTER)).toEqual([]);
    expect(matchFacultyHeuristic('   ', MOCK_ROSTER)).toEqual([]);
    expect(matchFacultyHeuristic('Oxford Ph.D.', [])).toEqual([]);
  });

  it('ranks Reformed Systematician with Oxford D.Phil higher for Oxford/Westminster search', () => {
    const results = matchFacultyHeuristic(
      'We need an Oxford doctor in Systematic Theology subscribing to the Westminster Confession for a modular term.',
      MOCK_ROSTER
    );

    expect(results.length).toBe(2);
    // Owen should be the top match
    expect(results[0].scholarId).toBe('scholar-owen');
    expect(results[0].fitScore).toBeGreaterThanOrEqual(80);
    expect(results[0].fitLevel).toBe('Exceptional Fit');

    // Should contain grounded citations for credentials and confession
    const citations = results[0].groundedCitations;
    expect(citations.some((c) => c.sourceType === 'credential' && c.quoteOrDetail.includes('Oxford'))).toBe(true);
    expect(citations.some((c) => c.sourceType === 'confession' && c.title.includes('Westminster'))).toBe(true);
  });

  it('ranks 1689 Baptist professor higher for Baptist preaching query', () => {
    const results = matchFacultyHeuristic(
      'Looking for a Baptist scholar subscribing to the 1689 London Baptist Confession for practical homiletics.',
      MOCK_ROSTER
    );

    expect(results.length).toBe(2);
    expect(results[0].scholarId).toBe('scholar-bunyan');
    expect(results[0].groundedCitations.some((c) => c.title.includes('1689'))).toBe(true);
    expect(results[0].strengths.some((s) => s.includes('1689'))).toBe(true);
  });

  it('generates executive search committee summaries tailored for provosts', () => {
    const results = matchFacultyHeuristic('Systematic Theology Ph.D.', MOCK_ROSTER);
    expect(results[0].committeeSummary).toContain(results[0].fullName);
    expect(results[0].committeeSummary).toContain('is an academic match');
  });

  it('falls back seamlessly to heuristic matcher in matchFacultyWithGemini when no API key is provided', async () => {
    const results = await matchFacultyWithGemini(
      'Oxford doctorate Westminster Confession',
      MOCK_ROSTER,
      { apiKey: '' }
    );

    expect(results.length).toBe(2);
    expect(results[0].scholarId).toBe('scholar-owen');
  });
});
