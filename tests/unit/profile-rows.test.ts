import { describe, expect, it } from 'vitest';
import {
  credentialErrors,
  hasRowErrors,
  isValidDoiOrUrl,
  makePrimary,
  mapSuggestions,
  moveItem,
  nameForSlug,
  publicationErrors
} from '@/lib/profiles/profile-rows';
import type { Taxonomy } from '@/lib/domain/types';

const taxonomy: Taxonomy = {
  disciplines: [
    { slug: 'systematic-theology', name: 'Systematic Theology' },
    { slug: 'old-testament', name: 'Old Testament' }
  ],
  traditions: [{ slug: 'reformed', name: 'Reformed' }],
  confessions: []
};

describe('isValidDoiOrUrl', () => {
  it('accepts empty, http(s) and 10. DOIs', () => {
    expect(isValidDoiOrUrl('')).toBe(true);
    expect(isValidDoiOrUrl(null)).toBe(true);
    expect(isValidDoiOrUrl('https://example.org/x')).toBe(true);
    expect(isValidDoiOrUrl('http://example.org')).toBe(true);
    expect(isValidDoiOrUrl('10.1000/xyz123')).toBe(true);
  });
  it('rejects other schemes and bare text', () => {
    expect(isValidDoiOrUrl('javascript:alert(1)')).toBe(false);
    expect(isValidDoiOrUrl('ftp://example.org')).toBe(false);
    expect(isValidDoiOrUrl('doi:10.1000/x')).toBe(false);
    expect(isValidDoiOrUrl('example.org')).toBe(false);
  });
});

describe('row errors', () => {
  it('requires degree, field and institution', () => {
    const errs = credentialErrors({ degree: ' ', field_of_study: '', institution_name: 'X', is_terminal: false });
    expect(Object.keys(errs).sort()).toEqual(['degree', 'field_of_study']);
  });
  it('flags bad publication links and missing titles', () => {
    const errs = publicationErrors({ title: '', publication_type: 'book', doi_or_url: 'nope' });
    expect(Object.keys(errs).sort()).toEqual(['doi_or_url', 'title']);
  });
  it('hasRowErrors is false for a clean snapshot', () => {
    expect(
      hasRowErrors({
        credentials: [{ degree: 'Ph.D.', field_of_study: 'OT', institution_name: 'U', is_terminal: true }],
        publications: [{ title: 'T', publication_type: 'book' }]
      })
    ).toBe(false);
    expect(hasRowErrors({ credentials: [{ degree: '', field_of_study: '', institution_name: '', is_terminal: false }] })).toBe(true);
  });
});

describe('ordering', () => {
  it('moveItem moves and ignores out-of-range', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveItem(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
  });
  it('makePrimary moves the slug first', () => {
    expect(makePrimary(['a', 'b', 'c'], 'c')).toEqual(['c', 'a', 'b']);
    expect(makePrimary(['a', 'b'], 'zzz')).toEqual(['a', 'b']);
  });
});

describe('mapSuggestions', () => {
  it('maps names to slugs, dedupes, and reports unmatched', () => {
    const out = mapSuggestions('discipline', ['Systematic Theology', 'systematic-theology', 'Underwater Basket Theology'], taxonomy);
    expect(out.slugs).toEqual(['systematic-theology']);
    expect(out.unmatched).toEqual([{ kind: 'discipline', value: 'Underwater Basket Theology' }]);
  });
  it('nameForSlug falls back to the raw value', () => {
    expect(nameForSlug(taxonomy.traditions, 'reformed')).toBe('Reformed');
    expect(nameForSlug(taxonomy.traditions, 'x')).toBe('x');
  });
});
