import { describe, expect, it } from 'vitest';
import { TAXONOMY_ALIASES } from '@/lib/taxonomy/aliases';
import { findUnresolved, resolveTaxonomySlug, type Taxonomy } from '@/lib/taxonomy/resolve';

const taxonomy: Taxonomy = {
  disciplines: [
    { slug: 'new-testament', name: 'New Testament & Early Christian Literature' },
    { slug: 'systematic-theology', name: 'Systematic Theology' },
  ],
  traditions: [
    { slug: 'baptist', name: 'Baptist' },
    { slug: 'lutheran', name: 'Lutheran' },
  ],
  confessions: [
    { slug: 'chicago-statement-inerrancy', name: 'Chicago Statement on Biblical Inerrancy' },
    { slug: 'lausanne-covenant', name: 'Lausanne Covenant' },
  ],
};

describe('resolveTaxonomySlug', () => {
  it('prefers an exact slug, then an alias, then a case-insensitive name', () => {
    expect(resolveTaxonomySlug('tradition', 'baptist', taxonomy)).toBe('baptist');
    expect(resolveTaxonomySlug('tradition', ' Confessional Baptist ', taxonomy)).toBe('baptist');
    expect(resolveTaxonomySlug('discipline', 'SYSTEMATIC THEOLOGY', taxonomy)).toBe('systematic-theology');
    expect(resolveTaxonomySlug('confession', 'standard-chicago', taxonomy)).toBe('chicago-statement-inerrancy');
    expect(resolveTaxonomySlug('confession', 'chicago-inerrancy', taxonomy)).toBe('chicago-statement-inerrancy');
  });

  it('never resolves to a slug missing from the taxonomy', () => {
    const noLausanne: Taxonomy = { ...taxonomy, confessions: [taxonomy.confessions[0]] };
    expect(resolveTaxonomySlug('confession', 'standard-lausanne', noLausanne)).toBeNull();
    expect(resolveTaxonomySlug('tradition', 'unknown', taxonomy)).toBeNull();
  });

  it('does not cross kinds, and rejects non-strings and blanks', () => {
    expect(resolveTaxonomySlug('discipline', 'baptist', taxonomy)).toBeNull();
    expect(resolveTaxonomySlug('tradition', 42, taxonomy)).toBeNull();
    expect(resolveTaxonomySlug('tradition', '   ', taxonomy)).toBeNull();
  });

  it('resolves only aliases without a taxonomy', () => {
    expect(resolveTaxonomySlug('confession', 'standard-westminster')).toBe('westminster-confession');
    expect(resolveTaxonomySlug('tradition', 'baptist')).toBeNull();
  });
});

describe('findUnresolved', () => {
  it('lists unknown entries once, in snapshot order', () => {
    expect(
      findUnresolved(
        {
          disciplines: ['systematic-theology', 'Nope', 'Nope'],
          traditions: ['lutheran', 'Odd'],
          confessions: [{ confessional_standard_id: 'standard-x' }, { confessional_standard_id: 'lausanne-covenant' }],
        },
        taxonomy
      )
    ).toEqual([
      { kind: 'discipline', value: 'Nope' },
      { kind: 'tradition', value: 'Odd' },
      { kind: 'confession', value: 'standard-x' },
    ]);
    expect(findUnresolved({}, taxonomy)).toEqual([]);
  });
});

describe('TAXONOMY_ALIASES', () => {
  it('has normalised keys and slug-shaped targets', () => {
    for (const kind of Object.keys(TAXONOMY_ALIASES) as Array<keyof typeof TAXONOMY_ALIASES>) {
      for (const [key, target] of Object.entries(TAXONOMY_ALIASES[kind])) {
        expect(key).toBe(key.trim().toLowerCase());
        expect(target).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      }
    }
  });
});
