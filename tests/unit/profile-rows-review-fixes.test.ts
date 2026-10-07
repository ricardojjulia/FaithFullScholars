import { describe, expect, it } from 'vitest';
import {
  ADHERENCE_OPTIONS,
  confessionErrors,
  describeProblems,
  hasRowErrors,
  isValidDoiOrUrl,
  isValidOrcid,
  isValidScholarUrl,
  isValidYear,
  mergeImported,
  normalizeDoiInput,
  summarizeProblems,
  credentialKey
} from '@/lib/profiles/profile-rows';
import { FIELD_LIMITS, MAX_YEAR, MIN_YEAR } from '@/lib/profiles/limits';
import { buildCvImport } from '@/lib/profiles/cv-import';
import { parseCvText } from '@/lib/profiles/cv-parser';
import { sanitizeSnapshot, MIN_YEAR as SERVER_MIN, MAX_YEAR as SERVER_MAX } from '@/lib/profiles/revision-service';
import { buildUnmatchedNotes } from '@/components/admin/review-action-panel';
import { formatAdherenceLevel } from '@/lib/domain/taxonomies';
import type { Taxonomy } from '@/lib/domain/types';

const taxonomy: Taxonomy = {
  disciplines: [{ slug: 'systematic-theology', name: 'Systematic Theology' }],
  traditions: [{ slug: 'reformed', name: 'Reformed' }],
  confessions: [{ slug: 'westminster-confession', name: 'Westminster Confession of Faith' }]
};

describe('adherence validation', () => {
  it('requires a level; an unset row is a problem', () => {
    expect(confessionErrors({ confessional_standard_id: 'x', adherence_level: '' }).adherence_level).toMatch(/Choose/);
    expect(confessionErrors({ confessional_standard_id: 'x', adherence_level: 'full_subscription' })).toEqual({});
  });

  it('requires notes only for with_exceptions', () => {
    expect(
      confessionErrors({ confessional_standard_id: 'x', adherence_level: 'with_exceptions', exception_notes: '  ' }).exception_notes
    ).toBeTruthy();
    expect(
      confessionErrors({ confessional_standard_id: 'x', adherence_level: 'with_exceptions', exception_notes: 'ch. 21.8' })
    ).toEqual({});
  });

  it('offers every level, strict_subscription included, with the shared labels', () => {
    expect(ADHERENCE_OPTIONS.map((o) => o.value)).toContain('strict_subscription');
    for (const o of ADHERENCE_OPTIONS) expect(o.label).toBe(formatAdherenceLevel(o.value));
  });

  it('counts unset confessions in the blocking summary', () => {
    const snap = { confessions: [{ confessional_standard_id: 'x', adherence_level: '' as const }] };
    expect(hasRowErrors(snap)).toBe(true);
    expect(summarizeProblems(snap).confessions).toBe(1);
  });
});

describe('problem summary', () => {
  it('counts each bad row once and names the kinds', () => {
    const s = summarizeProblems({
      credentials: [
        { degree: '', field_of_study: '', institution_name: '', year_awarded: null, is_terminal: false },
        { degree: 'Ph.D.', field_of_study: 'OT', institution_name: 'Cam', year_awarded: null, is_terminal: true }
      ],
      publications: [{ title: '', publication_type: 'book', year: null }],
      orcid_id: 'nope',
      google_scholar_url: null
    });
    expect(s).toMatchObject({ credentials: 1, publications: 1, confessions: 0, fields: 1, total: 3 });
    expect(describeProblems(s)).toBe('3 problems to fix (1 credential, 1 publication, 1 profile link or ID).');
  });
});

describe('normalizeDoiInput', () => {
  it('strips doi: and doi.org prefixes down to 10.x', () => {
    expect(normalizeDoiInput('doi:10.1000/xyz')).toBe('10.1000/xyz');
    expect(normalizeDoiInput('DOI: 10.1000/xyz')).toBe('10.1000/xyz');
    expect(normalizeDoiInput('https://doi.org/10.1000/xyz')).toBe('10.1000/xyz');
    expect(normalizeDoiInput('http://dx.doi.org/10.1000/xyz')).toBe('10.1000/xyz');
    expect(isValidDoiOrUrl(normalizeDoiInput('doi:10.1000/xyz'))).toBe(true);
  });

  it('leaves other URLs and DOIs as they are', () => {
    expect(normalizeDoiInput('https://example.org/paper')).toBe('https://example.org/paper');
    expect(normalizeDoiInput('10.1000/xyz')).toBe('10.1000/xyz');
    expect(normalizeDoiInput('  ')).toBe('');
    expect(normalizeDoiInput(null)).toBe('');
  });
});

describe('ORCID and Google Scholar validators', () => {
  it('matches the database CHECK shapes', () => {
    expect(isValidOrcid('')).toBe(true);
    expect(isValidOrcid('0000-0002-1825-0097')).toBe(true);
    expect(isValidOrcid('0000-0002-1825-009X')).toBe(true);
    expect(isValidOrcid('0000-0002-1825-009x')).toBe(false);
    expect(isValidOrcid('0000000218250097')).toBe(false);
    expect(isValidScholarUrl('')).toBe(true);
    expect(isValidScholarUrl('https://scholar.google.com/citations?hl=en&user=AbC123')).toBe(true);
    expect(isValidScholarUrl('https://scholar.google.co.uk/citations?user=AbC')).toBe(true);
    expect(isValidScholarUrl('http://scholar.google.com/citations?user=AbC')).toBe(false);
    expect(isValidScholarUrl('https://scholar.google.com/citations?hl=en')).toBe(false);
    expect(isValidScholarUrl('https://example.com/citations?user=1')).toBe(false);
  });
});

describe('year bounds and caps stay in step with the server', () => {
  it('uses 1000 to 2100', () => {
    expect([MIN_YEAR, MAX_YEAR]).toEqual([SERVER_MIN, SERVER_MAX]);
    expect(isValidYear(999)).toBe(false);
    expect(isValidYear(1000)).toBe(true);
    expect(isValidYear(2101)).toBe(false);
  });

  it('matches the lengths sanitizeSnapshot truncates to', () => {
    const long = 'x'.repeat(20000);
    const out = sanitizeSnapshot({
      full_name: long, title: long, current_institution: long, institutional_role: long, location: long,
      biography: long, doctrinal_statement_text: long, timezone: long, orcid_id: long,
      credentials: [{ degree: long, field_of_study: long, institution_name: long }],
      publications: [{ title: long, publication_type: 'book', publisher_or_journal: long, citation_text: long, doi_or_url: `10.${long}` }],
      confessions: [{ confessional_standard_id: 'a', adherence_level: 'with_exceptions', exception_notes: long }]
    });
    expect(out.full_name.length).toBe(FIELD_LIMITS.full_name);
    expect(out.title!.length).toBe(FIELD_LIMITS.title);
    expect(out.current_institution!.length).toBe(FIELD_LIMITS.current_institution);
    expect(out.institutional_role!.length).toBe(FIELD_LIMITS.institutional_role);
    expect(out.location!.length).toBe(FIELD_LIMITS.location);
    expect(out.biography!.length).toBe(FIELD_LIMITS.biography);
    expect(out.doctrinal_statement_text!.length).toBe(FIELD_LIMITS.doctrinal_statement_text);
    expect(out.timezone!.length).toBe(FIELD_LIMITS.timezone);
    expect(out.orcid_id!.length).toBe(FIELD_LIMITS.orcid_id);
    const c = out.credentials![0];
    expect(c.degree.length).toBe(FIELD_LIMITS.credential_degree);
    expect(c.field_of_study.length).toBe(FIELD_LIMITS.credential_field);
    expect(c.institution_name.length).toBe(FIELD_LIMITS.credential_institution);
    const p = out.publications![0];
    expect(p.title.length).toBe(FIELD_LIMITS.publication_title);
    expect(p.publisher_or_journal!.length).toBe(FIELD_LIMITS.publication_publisher);
    expect(p.citation_text!.length).toBe(FIELD_LIMITS.publication_citation);
    expect(p.doi_or_url!.length).toBe(FIELD_LIMITS.publication_link);
    expect(out.confessions![0].exception_notes!.length).toBe(FIELD_LIMITS.exception_notes);
    const scholar = sanitizeSnapshot({ full_name: 'a', google_scholar_url: `https://${long}` });
    expect(scholar.google_scholar_url!.length).toBe(FIELD_LIMITS.google_scholar_url);
  });
});

describe('mergeImported', () => {
  it('keeps the existing list when the incoming list is empty', () => {
    const r = mergeImported(['a', 'b'], [], (x) => x);
    expect(r).toEqual({ list: ['a', 'b'], added: 0, skipped: 0 });
  });

  it('appends new entries after the existing ones and skips duplicates', () => {
    const r = mergeImported(['a', 'b'], ['b', 'c', 'c'], (x) => x);
    expect(r).toEqual({ list: ['a', 'b', 'c'], added: 1, skipped: 2 });
  });

  it('handles a missing existing list', () => {
    expect(mergeImported(undefined, ['a'], (x) => x).list).toEqual(['a']);
  });
});

describe('buildCvImport', () => {
  const existingCred = { degree: 'M.Div.', field_of_study: 'Theology', institution_name: 'Seminary', year_awarded: 2010, is_terminal: false };

  it('does not wipe a non-empty list when the CV has none, and says so', () => {
    const parsed = parseCvText('Dr. Jane Doe\nProfessor');
    expect(parsed.credentials).toHaveLength(0);
    const r = buildCvImport({ credentials: [existingCred] }, parsed, taxonomy);
    expect(r.updates.credentials).toBeUndefined();
    expect(r.notices.join(' ')).toMatch(/your 1 existing credentials were kept/);
  });

  it('merges parsed credentials into an existing list and never invents a field of study', () => {
    const parsed = parseCvText('Dr. Jane Doe\nEDUCATION\nPh.D., University of Edinburgh, 2017\nM.Div., Seminary, 2010');
    const r = buildCvImport({ credentials: [existingCred] }, parsed, taxonomy);
    const list = r.updates.credentials!;
    expect(list[0]).toEqual(existingCred);
    expect(list.length).toBeGreaterThan(1);
    for (const c of list.slice(1)) expect(c.field_of_study).not.toBe('Theological Studies');
    expect(r.notices.join(' ')).toMatch(/kept your 1 existing credentials/);
    expect(credentialKey(list[0])).toBe(credentialKey(existingCred));
  });

  it('leaves disciplines and traditions alone when nothing resolves, and reports unmatched suggestions', () => {
    const parsed = {
      ...parseCvText('x'),
      suggested_disciplines: ['Pastoral & Practical Theology'],
      suggested_traditions: ['Confessional Baptist']
    };
    const r = buildCvImport({ disciplines: ['systematic-theology'], traditions: ['reformed'] }, parsed, taxonomy);
    expect(r.updates.disciplines).toBeUndefined();
    expect(r.updates.traditions).toBeUndefined();
    expect(r.unmatched).toEqual([
      { kind: 'discipline', value: 'Pastoral & Practical Theology' },
      { kind: 'tradition', value: 'Confessional Baptist' }
    ]);
  });

  it('adds resolved disciplines after the existing ones', () => {
    const parsed = { ...parseCvText('x'), suggested_disciplines: ['Systematic Theology'] };
    const r = buildCvImport({ disciplines: ['old-testament'] }, parsed, {
      ...taxonomy,
      disciplines: [...taxonomy.disciplines, { slug: 'old-testament', name: 'Old Testament' }]
    });
    expect(r.updates.disciplines).toEqual(['old-testament', 'systematic-theology']);
  });
});

describe('buildUnmatchedNotes', () => {
  it('lists every entry and respects the notes cap', () => {
    const text = buildUnmatchedNotes(['discipline: A', 'tradition: B']);
    expect(text).toContain('- discipline: A');
    expect(text).toContain('- tradition: B');
    expect(buildUnmatchedNotes(Array.from({ length: 500 }, (_, i) => `discipline: entry ${i}`)).length).toBeLessThanOrEqual(2000);
  });
});
