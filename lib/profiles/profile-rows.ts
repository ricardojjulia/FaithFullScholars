/**
 * ==============================================================================
 * FaithFull Scholars — Pure helpers for the profile row editors (ADR 0025)
 * Mirrors the server rules in sanitizeSnapshot so the UI can tell the scholar
 * about a problem instead of letting a value silently disappear on save.
 * ==============================================================================
 */

import type {
  AdherenceLevel,
  PublicationType,
  RevisionSnapshotData,
  Taxonomy,
  UnresolvedEntry
} from '@/lib/domain/types';
import { resolveTaxonomySlug } from '@/lib/taxonomy/resolve';
import { formatAdherenceLevel } from '@/lib/domain/taxonomies';
import { MAX_YEAR, MIN_YEAR } from '@/lib/profiles/limits';

export const MAX_ROWS = 50;

export type CredentialRow = NonNullable<RevisionSnapshotData['credentials']>[number];
export type PublicationRow = NonNullable<RevisionSnapshotData['publications']>[number];
type SavedConfession = NonNullable<RevisionSnapshotData['confessions']>[number];

/**
 * A confession row as the editor holds it. A freshly ticked standard has no
 * adherence level yet (''): the scholar must choose one, it is never defaulted.
 * Saving is blocked until it is set, so '' never reaches the server.
 */
export type ConfessionRow = Omit<SavedConfession, 'adherence_level'> & {
  adherence_level: AdherenceLevel | '';
};

export const ADHERENCE_OPTIONS: Array<{ value: AdherenceLevel; label: string }> = (
  ['full_subscription', 'strict_subscription', 'substantial_agreement', 'general_agreement', 'with_exceptions'] as const
).map((value) => ({ value, label: formatAdherenceLevel(value) }));

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

/**
 * Rewrites the legacy DOI forms "doi:10.x" and "https://doi.org/10.x" (also
 * dx.doi.org and http) to the bare "10.x" form. Any other value, including other
 * URLs, is returned trimmed and otherwise unchanged.
 */
export function normalizeDoiInput(value: string | null | undefined): string {
  const v = (value ?? '').trim();
  const match = /^(?:doi:\s*|https?:\/\/(?:dx\.)?doi\.org\/)(10\..+)$/i.exec(v);
  return match ? match[1] : v;
}

/** ORCID iD shape used by the database CHECK: 0000-0000-0000-000X. Empty is valid (optional). */
export function isValidOrcid(value: string | null | undefined): boolean {
  const v = (value ?? '').trim();
  return !v || /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(v);
}

/** Google Scholar profile link, matching the database CHECK. Empty is valid (optional). */
export function isValidScholarUrl(value: string | null | undefined): boolean {
  const v = (value ?? '').trim();
  return !v || /^https:\/\/scholar\.google\.[a-z.]+\/citations\?.*user=/.test(v);
}

export const ORCID_ERROR = 'Use the form 0000-0000-0000-000X.';
export const SCHOLAR_URL_ERROR = 'Use a link like https://scholar.google.com/citations?user=...';

/** Year is optional; when present it must be a whole number in a sane range. */
export function isValidYear(value: number | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  return Number.isInteger(value) && value >= MIN_YEAR && value <= MAX_YEAR;
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
  if (!isValidYear(row.year_awarded)) errors.year_awarded = `Enter a year from ${MIN_YEAR} to ${MAX_YEAR}.`;
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
  if (!isValidYear(row.year)) errors.year = `Enter a year from ${MIN_YEAR} to ${MAX_YEAR}.`;
  if (!isValidDoiOrUrl(row.doi_or_url)) {
    errors.doi_or_url = 'Use an http(s) link or a DOI starting with 10.';
  }
  return errors;
}

export interface ConfessionRowErrors {
  adherence_level?: string;
  exception_notes?: string;
}

export function confessionErrors(row: ConfessionRow): ConfessionRowErrors {
  const errors: ConfessionRowErrors = {};
  if (!ADHERENCE_OPTIONS.some((o) => o.value === row.adherence_level)) {
    errors.adherence_level = 'Choose your adherence level.';
  } else if (row.adherence_level === 'with_exceptions' && !row.exception_notes?.trim()) {
    errors.exception_notes = 'State your exceptions.';
  }
  return errors;
}

export interface ProblemSummary {
  credentials: number;
  publications: number;
  confessions: number;
  /** Invalid ORCID or Google Scholar link. */
  fields: number;
  total: number;
}

type ProblemInput = Pick<RevisionSnapshotData, 'credentials' | 'publications' | 'orcid_id' | 'google_scholar_url'> & {
  confessions?: ConfessionRow[];
};

/** Counts the rows and fields with a problem; each row counts once however many errors it has. */
export function summarizeProblems(snapshot: ProblemInput): ProblemSummary {
  const credentials = (snapshot.credentials ?? []).filter((c) => Object.keys(credentialErrors(c)).length > 0).length;
  const publications = (snapshot.publications ?? []).filter((p) => Object.keys(publicationErrors(p)).length > 0).length;
  const confessions = (snapshot.confessions ?? []).filter((c) => Object.keys(confessionErrors(c)).length > 0).length;
  const fields = (isValidOrcid(snapshot.orcid_id) ? 0 : 1) + (isValidScholarUrl(snapshot.google_scholar_url) ? 0 : 1);
  return { credentials, publications, confessions, fields, total: credentials + publications + confessions + fields };
}

/** True when any row or checked field has a problem (blocks Save and Submit). */
export function hasRowErrors(snapshot: ProblemInput): boolean {
  return summarizeProblems(snapshot).total > 0;
}

/** Human sentence for the Save/Submit blocked reason, e.g. "2 problems: 1 credential, 1 confession". */
export function describeProblems(summary: ProblemSummary): string {
  const parts: string[] = [];
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  if (summary.credentials) parts.push(plural(summary.credentials, 'credential', 'credentials'));
  if (summary.publications) parts.push(plural(summary.publications, 'publication', 'publications'));
  if (summary.confessions) parts.push(plural(summary.confessions, 'confession', 'confessions'));
  if (summary.fields) parts.push(plural(summary.fields, 'profile link or ID', 'profile links or IDs'));
  return `${plural(summary.total, 'problem', 'problems')} to fix (${parts.join(', ')}).`;
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

const norm = (v: string | null | undefined) => (v ?? '').trim().toLowerCase();

export interface MergedList<T> {
  list: T[];
  /** Incoming entries appended. */
  added: number;
  /** Incoming entries skipped because the draft already has them. */
  skipped: number;
}

/**
 * CV import merge rule: never remove what the scholar already has. An empty or
 * missing incoming list leaves the existing list untouched; otherwise incoming
 * entries are appended unless an entry with the same key already exists.
 */
export function mergeImported<T>(
  existing: readonly T[] | undefined,
  incoming: readonly T[],
  keyOf: (item: T) => string
): MergedList<T> {
  const list = [...(existing ?? [])];
  const seen = new Set(list.map(keyOf));
  let added = 0;
  let skipped = 0;
  for (const item of incoming) {
    const key = keyOf(item);
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    list.push(item);
    added += 1;
  }
  return { list, added, skipped };
}

export const credentialKey = (c: CredentialRow) =>
  `${norm(c.degree)}|${norm(c.institution_name)}|${c.year_awarded ?? ''}`;
export const publicationKey = (p: PublicationRow) => `${norm(p.title)}|${p.year ?? ''}`;
export const slugKey = (s: string) => s.trim().toLowerCase();
