/**
 * ==============================================================================
 * FaithFull Scholars — Pure helpers for the profile row editors (ADR 0025)
 * Mirrors the server rules in sanitizeSnapshot so the UI can tell the scholar
 * about a problem instead of letting a value silently disappear on save.
 * ==============================================================================
 */

import type { PublicationType, RevisionSnapshotData, Taxonomy, UnresolvedEntry } from '@/lib/domain/types';
import { resolveTaxonomySlug } from '@/lib/taxonomy/resolve';

export const MAX_ROWS = 50;

export type CredentialRow = NonNullable<RevisionSnapshotData['credentials']>[number];
export type PublicationRow = NonNullable<RevisionSnapshotData['publications']>[number];

export const PUBLICATION_TYPE_OPTIONS: Array<{ value: PublicationType; label: string }> = [
  { value: 'book', label: 'Book' },
  { value: 'monograph', label: 'Monograph' },
  { value: 'journal_article', label: 'Journal article' },
  { value: 'book_chapter', label: 'Book chapter' },
  { value: 'edited_volume', label: 'Edited volume' },
  { value: 'conference_paper', label: 'Conference paper' },
  { value: 'dissertation', label: 'Dissertation' },
  { value: 'popular_essay', label: 'Popular essay' }
];

/** http(s) URL or a DOI starting with "10." (the server nulls anything else). Empty is valid (optional). */
export function isValidDoiOrUrl(value: string | null | undefined): boolean {
  const v = (value ?? '').trim();
  if (!v) return true;
  return /^https?:\/\/\S+$/i.test(v) || /^10\.\S+$/.test(v);
}

/** Year is optional; when present it must be a whole number in a sane range. */
export function isValidYear(value: number | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  return Number.isInteger(value) && value >= 1 && value <= 2100;
}

export interface CredentialRowErrors {
  degree?: string;
  field_of_study?: string;
  institution_name?: string;
  year_awarded?: string;
}

export function credentialErrors(row: CredentialRow): CredentialRowErrors {
  const errors: CredentialRowErrors = {};
  if (!row.degree?.trim()) errors.degree = 'Degree is required.';
  if (!row.field_of_study?.trim()) errors.field_of_study = 'Field of study is required.';
  if (!row.institution_name?.trim()) errors.institution_name = 'Institution is required.';
  if (!isValidYear(row.year_awarded)) errors.year_awarded = 'Enter a valid year.';
  return errors;
}

export interface PublicationRowErrors {
  title?: string;
  year?: string;
  doi_or_url?: string;
}

export function publicationErrors(row: PublicationRow): PublicationRowErrors {
  const errors: PublicationRowErrors = {};
  if (!row.title?.trim()) errors.title = 'Title is required.';
  if (!isValidYear(row.year)) errors.year = 'Enter a valid year.';
  if (!isValidDoiOrUrl(row.doi_or_url)) {
    errors.doi_or_url = 'Use an http(s) link or a DOI starting with 10. Other values are removed on save.';
  }
  return errors;
}

/** True when any row in either list has a problem. */
export function hasRowErrors(snapshot: Pick<RevisionSnapshotData, 'credentials' | 'publications'>): boolean {
  return (
    (snapshot.credentials ?? []).some((c) => Object.keys(credentialErrors(c)).length > 0) ||
    (snapshot.publications ?? []).some((p) => Object.keys(publicationErrors(p)).length > 0)
  );
}

/** Returns a copy with the item at `from` moved to `to`; out-of-range moves return the list unchanged. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Moves one slug to the front (primary). Unknown slugs leave the list unchanged. */
export function makePrimary(list: readonly string[], slug: string): string[] {
  const index = list.indexOf(slug);
  return index <= 0 ? [...list] : moveItem(list, index, 0);
}

/**
 * Maps names suggested by the CV parser (or any legacy source) to taxonomy slugs.
 * Order is kept, duplicates removed, and anything that does not resolve is
 * returned separately so the scholar can see it instead of losing it.
 */
export function mapSuggestions(
  kind: 'discipline' | 'tradition',
  suggestions: readonly string[],
  taxonomy: Taxonomy
): { slugs: string[]; unmatched: UnresolvedEntry[] } {
  const slugs: string[] = [];
  const unmatched: UnresolvedEntry[] = [];
  for (const raw of suggestions) {
    const slug = resolveTaxonomySlug(kind, raw, taxonomy);
    if (slug) {
      if (!slugs.includes(slug)) slugs.push(slug);
    } else if (!unmatched.some((u) => u.value === raw)) {
      unmatched.push({ kind, value: raw });
    }
  }
  return { slugs, unmatched };
}

/** Name lookup for a slug in a list of options; falls back to the raw value. */
export function nameForSlug(options: readonly { slug: string; name: string }[], slug: string): string {
  return options.find((o) => o.slug === slug)?.name ?? slug;
}
