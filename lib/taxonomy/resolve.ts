/**
 * ==============================================================================
 * FaithFull Scholars — Taxonomy resolver (ADR 0025)
 * Pure functions. A snapshot stores the canonical database slug. Resolution
 * order: slug, then legacy alias, then case-insensitive name. The database
 * function private.resolve_taxonomy_id matches the slug only, so everything is
 * mapped to a slug here, before it is stored.
 * ==============================================================================
 */

import { TAXONOMY_ALIASES, type TaxonomyKind } from './aliases';

export type { TaxonomyKind };

export interface TaxonomyOption {
  slug: string;
  name: string;
}

/** The database taxonomy as the editor and sanitiser see it. */
export interface Taxonomy {
  disciplines: TaxonomyOption[];
  traditions: TaxonomyOption[];
  confessions: TaxonomyOption[];
}

export interface UnresolvedEntry {
  kind: TaxonomyKind;
  value: string;
}

const norm = (value: string) => value.trim().toLowerCase();

function optionsFor(taxonomy: Taxonomy, kind: TaxonomyKind): TaxonomyOption[] {
  return kind === 'discipline'
    ? taxonomy.disciplines
    : kind === 'tradition'
      ? taxonomy.traditions
      : taxonomy.confessions;
}

/**
 * Resolves a stored or legacy value to a canonical slug.
 * With a taxonomy, the result is only ever a slug that exists in it (null when
 * nothing matches). Without one, only the alias map can resolve (the slug
 * itself cannot be verified), so unknown values return null.
 */
export function resolveTaxonomySlug(
  kind: TaxonomyKind,
  value: unknown,
  taxonomy?: Taxonomy
): string | null {
  if (typeof value !== 'string') return null;
  const key = norm(value);
  if (!key) return null;
  const alias = TAXONOMY_ALIASES[kind][key] ?? null;

  if (!taxonomy) return alias;

  const options = optionsFor(taxonomy, kind);
  const bySlug = options.find((o) => o.slug === key);
  if (bySlug) return bySlug.slug;
  if (alias && options.some((o) => o.slug === alias)) return alias;
  const byName = options.find((o) => norm(o.name) === key);
  return byName ? byName.slug : null;
}

/** True when the value is already a slug present in the taxonomy. */
export function isKnownSlug(kind: TaxonomyKind, value: string, taxonomy: Taxonomy): boolean {
  return optionsFor(taxonomy, kind).some((o) => o.slug === value);
}

/**
 * Lists every discipline, tradition and confession in a (sanitised) snapshot
 * that is not a known slug. Order follows the snapshot; duplicates are removed.
 */
export function findUnresolved(
  snapshot: {
    disciplines?: string[];
    traditions?: string[];
    confessions?: Array<{ confessional_standard_id: string }>;
  },
  taxonomy: Taxonomy
): UnresolvedEntry[] {
  const out: UnresolvedEntry[] = [];
  const seen = new Set<string>();
  const add = (kind: TaxonomyKind, value: string) => {
    if (isKnownSlug(kind, value, taxonomy)) return;
    const key = `${kind}:${value}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ kind, value });
  };
  for (const v of snapshot.disciplines ?? []) add('discipline', v);
  for (const v of snapshot.traditions ?? []) add('tradition', v);
  for (const c of snapshot.confessions ?? []) add('confession', c.confessional_standard_id);
  return out;
}
