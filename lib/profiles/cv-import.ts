/**
 * ==============================================================================
 * FaithFull Scholars — CV import into the onboarding draft (ADR 0025)
 * Pure. A parsed CV is only a set of suggestions, so it must never remove what
 * the scholar already has. Rule for every list: an empty parsed list changes
 * nothing; a non-empty one is MERGED (existing entries first, new ones appended,
 * duplicates skipped). The result carries notices so the scholar can see what
 * happened. Credentials get no invented field of study: an unknown field stays
 * empty and row validation asks for it.
 * ==============================================================================
 */

import type { ParsedCvDraft } from '@/lib/profiles/cv-parser';
import type { PublicationType, RevisionSnapshotData, Taxonomy, UnresolvedEntry } from '@/lib/domain/types';
import {
  CredentialRow,
  PublicationRow,
  credentialKey,
  mapSuggestions,
  mergeImported,
  publicationKey,
  slugKey
} from '@/lib/profiles/profile-rows';

const DOCTORAL_DEGREES = ['Ph.D.', 'Th.D.', 'D.Min.'];

export function mapPubType(type: string): PublicationType {
  switch (type) {
    case 'book':
      return 'book';
    case 'monograph':
      return 'monograph';
    case 'journal_article':
      return 'journal_article';
    case 'book_chapter':
      return 'book_chapter';
    case 'essay':
      return 'popular_essay';
    default:
      return 'journal_article';
  }
}

export interface CvImportResult {
  /** Fields to apply over the current draft (lists already merged). */
  updates: Partial<RevisionSnapshotData>;
  /** Suggested disciplines and traditions that match nothing in the taxonomy. */
  unmatched: UnresolvedEntry[];
  /** Plain sentences describing what the import did to non-empty lists. */
  notices: string[];
}

function describeList(
  noun: string,
  existingCount: number,
  parsedCount: number,
  added: number,
  skipped: number
): string | null {
  if (existingCount === 0 && parsedCount === 0) return null;
  if (parsedCount === 0) return `The CV had no ${noun}; your ${existingCount} existing ${noun} were kept.`;
  if (existingCount === 0) return null;
  const tail = skipped > 0 ? ` and skipped ${skipped} already in your draft` : '';
  return `CV import kept your ${existingCount} existing ${noun}, added ${added}${tail}. Review them before saving.`;
}

export function buildCvImport(
  draft: Pick<RevisionSnapshotData, 'credentials' | 'publications' | 'disciplines' | 'traditions'>,
  parsed: ParsedCvDraft,
  taxonomy: Taxonomy
): CvImportResult {
  const disciplines = mapSuggestions('discipline', parsed.suggested_disciplines, taxonomy);
  const traditions = mapSuggestions('tradition', parsed.suggested_traditions, taxonomy);

  const incomingCredentials: CredentialRow[] = parsed.credentials.map((c) => ({
    degree: c.degree,
    // Never invented: an empty field is flagged by row validation for the scholar to fill in.
    field_of_study: c.field ?? '',
    institution_name: c.institution,
    year_awarded: c.year ?? null,
    is_terminal: DOCTORAL_DEGREES.includes(c.degree)
  }));
  const incomingPublications: PublicationRow[] = parsed.publications.map((p) => ({
    title: p.title,
    publication_type: mapPubType(p.publication_type),
    publisher_or_journal: p.publisher_or_journal ?? null,
    year: p.year ?? null,
    citation_text: p.citation_string
  }));

  const credentials = mergeImported(draft.credentials, incomingCredentials, credentialKey);
  const publications = mergeImported(draft.publications, incomingPublications, publicationKey);
  const mergedDisciplines = mergeImported(draft.disciplines, disciplines.slugs, slugKey);
  const mergedTraditions = mergeImported(draft.traditions, traditions.slugs, slugKey);

  const updates: Partial<RevisionSnapshotData> = {
    full_name: parsed.full_name || undefined,
    title: parsed.title || undefined,
    current_institution: parsed.current_institution || undefined,
    institutional_role: parsed.institutional_role || undefined,
    biography: parsed.biography || undefined,
    doctrinal_statement_text: parsed.personal_doctrinal_statement || undefined
  };
  // An empty parsed list is left out entirely so the existing list is kept.
  if (incomingCredentials.length > 0) updates.credentials = credentials.list;
  if (incomingPublications.length > 0) updates.publications = publications.list;
  if (disciplines.slugs.length > 0) updates.disciplines = mergedDisciplines.list;
  if (traditions.slugs.length > 0) updates.traditions = mergedTraditions.list;

  const notices = [
    describeList('credentials', draft.credentials?.length ?? 0, incomingCredentials.length, credentials.added, credentials.skipped),
    describeList('publications', draft.publications?.length ?? 0, incomingPublications.length, publications.added, publications.skipped)
  ].filter((n): n is string => !!n);

  return { updates, unmatched: [...disciplines.unmatched, ...traditions.unmatched], notices };
}
