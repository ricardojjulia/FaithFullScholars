/**
 * ==============================================================================
 * FaithFull Scholars — Revision Service (ADR 0024)
 * Shared server-side logic for the scholar revision lifecycle: snapshot
 * sanitising (allow-list) and loading the scholar's current revision state.
 * Authorization is enforced by RLS and guard triggers, not here.
 * ==============================================================================
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AdherenceLevel,
  PublicationType,
  RevisionSnapshotData,
  ScholarProfileRevision,
} from '@/lib/domain/types';
import {
  findUnresolved,
  resolveTaxonomySlug,
  type Taxonomy,
  type TaxonomyKind,
  type UnresolvedEntry,
} from '@/lib/taxonomy/resolve';

export const MAX_SNAPSHOT_BYTES = 262144;
export const OPEN_REVISION_STATUSES = ['draft', 'submitted', 'changes_requested'] as const;

const PUBLICATION_TYPES: PublicationType[] = [
  'book',
  'monograph',
  'journal_article',
  'book_chapter',
  'edited_volume',
  'conference_paper',
  'dissertation',
  'popular_essay',
];

const ADHERENCE_LEVELS: AdherenceLevel[] = [
  'full_subscription',
  'strict_subscription',
  'general_agreement',
  'substantial_agreement',
  'with_exceptions',
];

const MAX_ITEMS = 50;

function str(value: unknown, max: number): string | undefined {
  return typeof value === 'string' ? value.trim().slice(0, max) : undefined;
}

function nullableStr(value: unknown, max: number): string | null | undefined {
  if (value === null) return null;
  return str(value, max);
}

function records(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_ITEMS)
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item));
}

/** A publication link is stored only as an http(s) URL or a DOI (10.xxxx/...). */
function safeLink(value: string | null): string | null {
  if (!value) return null;
  return /^https?:\/\//i.test(value) || /^10\./.test(value) ? value : null;
}

/** Maps a value to its slug when it resolves, otherwise keeps the raw value (already capped). */
function toSlug(kind: TaxonomyKind, raw: string, taxonomy?: Taxonomy): string {
  return resolveTaxonomySlug(kind, raw, taxonomy) ?? raw;
}

/**
 * Reduces untrusted client input to the known RevisionSnapshotData shape.
 * Unknown keys (and profile_tier, which is staff-controlled) are dropped,
 * strings are trimmed and capped, arrays are capped and item-typed.
 * Disciplines, traditions and confessions are mapped to canonical slugs (slug,
 * then legacy alias, then name); values that do not resolve are kept raw but
 * capped so the scholar can fix them, and are reported by findUnresolved.
 * Duplicates are removed (first wins). Publication links with another scheme are cleared.
 */
export function sanitizeSnapshot(input: unknown, taxonomy?: Taxonomy): RevisionSnapshotData {
  const src = input && typeof input === 'object' && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
  const out: RevisionSnapshotData = { full_name: str(src.full_name, 200) ?? '' };

  const scalars: Array<[keyof RevisionSnapshotData, number]> = [
    ['title', 200],
    ['current_institution', 200],
    ['institutional_role', 200],
    ['location', 200],
    ['biography', 5000],
    ['doctrinal_statement_text', 10000],
    ['timezone', 100],
    ['orcid_id', 50],
    ['google_scholar_url', 500],
  ];
  for (const [key, max] of scalars) {
    if (!(key in src)) continue;
    const value = nullableStr(src[key], max);
    if (value !== undefined) {
      (out as unknown as Record<string, unknown>)[key] = value;
    }
  }

  if ('credentials' in src) {
    out.credentials = records(src.credentials).flatMap((c) => {
      const degree = str(c.degree, 200);
      const field = str(c.field_of_study, 200);
      const institution = str(c.institution_name, 200);
      if (degree === undefined || field === undefined || institution === undefined) return [];
      const year =
        typeof c.year_awarded === 'number' && Number.isInteger(c.year_awarded) ? c.year_awarded : null;
      return [
        {
          degree,
          field_of_study: field,
          institution_name: institution,
          year_awarded: year,
          is_terminal: c.is_terminal === true,
        },
      ];
    });
  }

  if ('publications' in src) {
    out.publications = records(src.publications).flatMap((p) => {
      const title = str(p.title, 500);
      if (!title || !PUBLICATION_TYPES.includes(p.publication_type as PublicationType)) return [];
      return [
        {
          title,
          publication_type: p.publication_type as PublicationType,
          publisher_or_journal: nullableStr(p.publisher_or_journal, 300) ?? null,
          year: typeof p.year === 'number' && Number.isInteger(p.year) ? p.year : null,
          doi_or_url: safeLink(nullableStr(p.doi_or_url, 500) ?? null),
          citation_text: nullableStr(p.citation_text, 2000) ?? null,
        },
      ];
    });
  }

  if ('confessions' in src) {
    const seen = new Set<string>();
    out.confessions = records(src.confessions).flatMap((c) => {
      const id = str(c.confessional_standard_id, 100);
      if (!id || !ADHERENCE_LEVELS.includes(c.adherence_level as AdherenceLevel)) return [];
      // A legacy draft may carry only a display name that resolves; try it before keeping the raw id.
      const slug =
        resolveTaxonomySlug('confession', id, taxonomy) ??
        resolveTaxonomySlug('confession', c.confessional_standard_name, taxonomy) ??
        id;
      const key = slug.toLowerCase();
      if (seen.has(key)) return [];
      seen.add(key);
      return [
        {
          confessional_standard_id: slug,
          adherence_level: c.adherence_level as AdherenceLevel,
          exception_notes: nullableStr(c.exception_notes, 2000) ?? null,
        },
      ];
    });
  }

  for (const [key, kind] of [
    ['disciplines', 'discipline'],
    ['traditions', 'tradition'],
  ] as const) {
    if (!(key in src)) continue;
    const value = src[key];
    if (!Array.isArray(value)) {
      out[key] = [];
      continue;
    }
    const seen = new Set<string>();
    out[key] = value
      .slice(0, MAX_ITEMS)
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim().slice(0, 200))
      .filter((item) => item.length > 0)
      .map((item) => toSlug(kind, item, taxonomy))
      .filter((slug) => {
        const k = slug.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
  }

  return out;
}

const TAXONOMY_TABLES = [
  ['disciplines', 'disciplines'],
  ['traditions', 'traditions'],
  ['confessions', 'confessional_standards'],
] as const;

/**
 * Loads the database taxonomy (slug and display name) for the editor and the
 * sanitiser. Throws on failure: an empty taxonomy would mark every entry
 * unresolved, which is worse than an honest error.
 */
export async function loadTaxonomy(supabase: SupabaseClient): Promise<Taxonomy> {
  const taxonomy: Taxonomy = { disciplines: [], traditions: [], confessions: [] };
  for (const [key, table] of TAXONOMY_TABLES) {
    const { data, error } = await supabase.from(table).select('slug, name').order('name', { ascending: true });
    if (error || !data) throw new Error('taxonomy_unavailable');
    taxonomy[key] = (data as Array<{ slug: string; name: string }>).map((row) => ({
      slug: row.slug,
      name: row.name,
    }));
  }
  return taxonomy;
}

export interface RevisionScholarSummary {
  id: string;
  slug: string;
  full_name: string;
  profile_status: string;
  verification_status: string;
  published_revision_id: string | null;
  draft_revision_id: string | null;
}

export interface RevisionBaseline {
  source: 'published_revision' | 'profile';
  revision_id: string | null;
  snapshot: RevisionSnapshotData;
}

export interface RevisionState {
  scholar: RevisionScholarSummary;
  /** The open (or latest rejected) revision, with legacy taxonomy values mapped to slugs. */
  revision: ScholarProfileRevision | null;
  /** Always built from the scholar's real published rows (ADR 0025), never from a stored snapshot. */
  baseline: RevisionBaseline;
  /** Database taxonomy options for the pickers; selections store the slug. */
  taxonomy: Taxonomy;
  /** Entries in the open revision that do not resolve to a taxonomy row; blocks submit until fixed. */
  unresolved: UnresolvedEntry[];
}

const SCHOLAR_COLUMNS =
  'id, slug, full_name, title, current_institution, institutional_role, biography, location, timezone, ' +
  'doctrinal_statement_text, orcid_id, google_scholar_url, profile_status, verification_status, ' +
  'published_revision_id, draft_revision_id';

const REVISION_COLUMNS =
  'id, scholar_id, revision_number, status, snapshot_data, admin_notes, submitted_at, reviewed_at, created_at, updated_at';

type ScholarRow = RevisionScholarSummary & {
  title: string | null;
  current_institution: string | null;
  institutional_role: string | null;
  biography: string | null;
  location: string | null;
  timezone: string | null;
  doctrinal_statement_text: string | null;
  orcid_id: string | null;
  google_scholar_url: string | null;
};

type LiveLists = Required<Pick<RevisionSnapshotData, 'credentials' | 'publications' | 'confessions' | 'disciplines' | 'traditions'>>;

/** A joined taxonomy row comes back as an object or a one-element array depending on the client. */
function joinedSlug(value: unknown): string | null {
  const row = Array.isArray(value) ? value[0] : value;
  const slug = row && typeof row === 'object' ? (row as { slug?: unknown }).slug : null;
  return typeof slug === 'string' ? slug : null;
}

/**
 * Reads the scholar's real published relational rows. Any read error throws:
 * a partial baseline would reintroduce the first-approval data-loss trap.
 */
async function loadLiveLists(supabase: SupabaseClient, scholarId: string): Promise<LiveLists> {
  const fail = () => new Error('live_profile_unavailable');

  const creds = await supabase
    .from('credentials')
    .select('degree, field_of_study, institution_name, year_awarded, is_terminal')
    .eq('scholar_id', scholarId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });
  const pubs = await supabase
    .from('publications')
    .select('title, publication_type, publisher_or_journal, year, doi_or_url, citation_text')
    .eq('scholar_id', scholarId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });
  const confs = await supabase
    .from('scholar_confessions')
    .select('adherence_level, exception_notes, confessional_standards(slug)')
    .eq('scholar_id', scholarId)
    .order('created_at', { ascending: true });
  const discs = await supabase
    .from('scholar_disciplines')
    .select('is_primary, disciplines(slug)')
    .eq('scholar_id', scholarId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });
  const trads = await supabase
    .from('scholar_traditions')
    .select('is_primary, traditions(slug)')
    .eq('scholar_id', scholarId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });
  if (creds.error || pubs.error || confs.error || discs.error || trads.error) throw fail();

  const slugs = (rows: unknown, key: string) =>
    ((rows ?? []) as Array<Record<string, unknown>>).flatMap((r) => {
      const slug = joinedSlug(r[key]);
      return slug ? [slug] : [];
    });

  return {
    credentials: (creds.data ?? []) as unknown as LiveLists['credentials'],
    publications: (pubs.data ?? []) as unknown as LiveLists['publications'],
    confessions: ((confs.data ?? []) as unknown as Array<Record<string, unknown>>).flatMap((r) => {
      const slug = joinedSlug(r.confessional_standards);
      return slug
        ? [
            {
              confessional_standard_id: slug,
              adherence_level: r.adherence_level as AdherenceLevel,
              exception_notes: (r.exception_notes as string | null) ?? null,
            },
          ]
        : [];
    }),
    disciplines: slugs(discs.data, 'disciplines'),
    traditions: slugs(trads.data, 'traditions'),
  };
}

function baselineFromScholar(s: ScholarRow, lists: LiveLists): RevisionSnapshotData {
  return {
    full_name: s.full_name,
    title: s.title,
    current_institution: s.current_institution,
    institutional_role: s.institutional_role,
    biography: s.biography,
    location: s.location,
    timezone: s.timezone,
    doctrinal_statement_text: s.doctrinal_statement_text,
    orcid_id: s.orcid_id,
    google_scholar_url: s.google_scholar_url,
    ...lists,
  };
}

/**
 * Builds the scholar's CURRENT live profile as a snapshot: the scalar columns
 * plus the five relational lists (ADR 0025). It is the editor start point and
 * the admin diff baseline, so a first approval never silently removes rows that
 * exist today. Returns null when the scholar row is not readable by this client;
 * throws if a list cannot be read.
 */
export async function loadLiveProfileSnapshot(
  supabase: SupabaseClient,
  scholarId: string
): Promise<RevisionSnapshotData | null> {
  const { data, error } = await supabase
    .from('scholars')
    .select(SCHOLAR_COLUMNS)
    .eq('id', scholarId)
    .maybeSingle();
  if (error || !data) return null;
  return baselineFromScholar(data as unknown as ScholarRow, await loadLiveLists(supabase, scholarId));
}

/**
 * Loads the scholar's current revision state through the caller's own
 * (RLS-scoped) client. Returns null when the scholar row is not readable.
 */
export async function loadRevisionState(
  supabase: SupabaseClient,
  scholarId: string
): Promise<RevisionState | null> {
  const { data: scholarData, error: scholarError } = await supabase
    .from('scholars')
    .select(SCHOLAR_COLUMNS)
    .eq('id', scholarId)
    .maybeSingle();
  if (scholarError || !scholarData) return null;
  const scholar = scholarData as unknown as ScholarRow;

  type PublishedRow = { id: string; revision_number: number; snapshot_data: RevisionSnapshotData };
  let published = null as PublishedRow | null;
  if (scholar.published_revision_id) {
    const { data } = await supabase
      .from('scholar_profile_revisions')
      .select('id, revision_number, snapshot_data')
      .eq('id', scholar.published_revision_id)
      .eq('scholar_id', scholarId)
      .maybeSingle();
    if (data?.snapshot_data) {
      published = data as unknown as PublishedRow;
    }
  }

  const { data: open } = await supabase
    .from('scholar_profile_revisions')
    .select(REVISION_COLUMNS)
    .eq('scholar_id', scholarId)
    .in('status', [...OPEN_REVISION_STATUSES])
    .order('revision_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  let revision = (open as unknown as ScholarProfileRevision | null) ?? null;

  if (!revision) {
    const { data: rejected } = await supabase
      .from('scholar_profile_revisions')
      .select(REVISION_COLUMNS)
      .eq('scholar_id', scholarId)
      .eq('status', 'rejected')
      .gt('revision_number', published?.revision_number ?? 0)
      .order('revision_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    revision = (rejected as unknown as ScholarProfileRevision | null) ?? null;
  }

  const taxonomy = await loadTaxonomy(supabase);
  const liveLists = await loadLiveLists(supabase, scholarId);

  // The baseline is always the live rows. `source` only says whether the scholar
  // already has a published revision (for labelling); it never selects the data.
  const baseline: RevisionBaseline = {
    source: published ? 'published_revision' : 'profile',
    revision_id: published ? published.id : null,
    snapshot: baselineFromScholar(scholar, liveLists),
  };

  let unresolved: UnresolvedEntry[] = [];
  if (revision) {
    const mapped = sanitizeSnapshot(revision.snapshot_data, taxonomy);
    unresolved = findUnresolved(mapped, taxonomy);
    revision = { ...revision, snapshot_data: mapped };
  }

  return {
    scholar: {
      id: scholar.id,
      slug: scholar.slug,
      full_name: scholar.full_name,
      profile_status: scholar.profile_status,
      verification_status: scholar.verification_status,
      published_revision_id: scholar.published_revision_id,
      draft_revision_id: scholar.draft_revision_id,
    },
    revision,
    baseline,
    taxonomy,
    unresolved,
  };
}

/**
 * Finds the scholar's single open revision (draft, submitted or changes
 * requested) by query. scholars.draft_revision_id is advisory only.
 */
export async function findOpenRevision(
  supabase: SupabaseClient,
  scholarId: string
): Promise<{ revision: ScholarProfileRevision | null; failed: boolean }> {
  const { data, error } = await supabase
    .from('scholar_profile_revisions')
    .select(REVISION_COLUMNS)
    .eq('scholar_id', scholarId)
    .in('status', [...OPEN_REVISION_STATUSES])
    .order('revision_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { revision: null, failed: true };
  return { revision: (data as unknown as ScholarProfileRevision | null) ?? null, failed: false };
}

export const REVISION_SELECT_COLUMNS = REVISION_COLUMNS;

/** Reads an optional revisionId pin from the body; malformed or empty bodies pin nothing. */
export async function readRevisionPin(req: Request): Promise<string | null> {
  try {
    const body = (await req.json()) as { revisionId?: unknown } | null;
    return body && typeof body.revisionId === 'string' ? body.revisionId : null;
  } catch {
    return null;
  }
}
