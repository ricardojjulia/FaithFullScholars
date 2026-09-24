/**
 * ==============================================================================
 * FaithFull Scholars — Academic Dossier Service (Phase 13 / ADR 0014)
 * Formats comprehensive SBL (Society of Biblical Literature) & Chicago Manual
 * of Style citations, compiles print-ready curriculum vitae, and aggregates
 * confessional affirmations, terminal degrees, and peer commendations.
 * ==============================================================================
 */

import { createClient } from '@/lib/supabase/server';
import {
  AcademicCredential,
  AcademicPublication,
  CourseShowcase,
  MediaLink,
  Discipline,
  Tradition,
  ConfessionalStandard,
} from '@/lib/domain/types';

export interface DossierPublicationItem {
  id: string;
  title: string;
  publication_type: string;
  publisher_or_journal: string | null;
  year: number | null;
  doi_or_url: string | null;
  sblCitation: string;
}

export interface DossierEndorsementItem {
  id: string;
  endorser_name: string;
  endorser_title: string | null;
  endorser_institution: string | null;
  relationship: string;
  commendation_text: string;
  created_at: string;
}

export interface ScholarDossierData {
  id: string;
  slug: string;
  full_name: string;
  title: string | null;
  current_institution: string | null;
  institutional_role: string | null;
  location: string | null;
  biography: string | null;
  profile_photo_path: string | null;
  profile_tier: 'standard' | 'distinguished_fellow';
  orcid_id: string | null;
  google_scholar_url: string | null;
  verification_status: string;
  doctrinal_statement_text: string | null;
  disciplines: Array<{ discipline: Discipline; is_primary: boolean }>;
  traditions: Array<{ tradition: Tradition; is_primary: boolean }>;
  confessions: Array<{
    confessional_standard: ConfessionalStandard;
    adherence_level: string;
    exception_notes: string | null;
  }>;
  credentials: AcademicCredential[];
  publications: DossierPublicationItem[];
  courses: CourseShowcase[];
  media_links: MediaLink[];
  endorsements: DossierEndorsementItem[];
  generated_at: string;
}

/**
 * Formats an academic publication into SBL 2nd edition / Chicago 17th bibliography style.
 */
export function formatSblCitation(pub: {
  title: string;
  publication_type: string;
  publisher_or_journal?: string | null;
  year?: number | null;
  doi_or_url?: string | null;
  citation_text?: string | null;
}): string {
  if (pub.citation_text && pub.citation_text.trim().length > 0) {
    return pub.citation_text.trim();
  }

  const title = pub.title.trim();
  const venue = pub.publisher_or_journal?.trim();
  const year = pub.year;
  const link = pub.doi_or_url?.trim();

  switch (pub.publication_type) {
    case 'journal_article': {
      let citation = `"${title}."`;
      if (venue) citation += ` ${venue}`;
      if (year) citation += ` (${year})`;
      if (link) citation += `. ${link}`;
      else citation += '.';
      return citation;
    }
    case 'book':
    case 'monograph': {
      let citation = `*${title}*.`;
      if (venue) citation += ` ${venue}`;
      if (year) citation += venue ? `, ${year}.` : ` ${year}.`;
      else if (venue) citation += '.';
      if (link) citation += ` ${link}`;
      return citation;
    }
    case 'book_chapter': {
      let citation = `"${title}."`;
      if (venue) citation += ` In *${venue}*`;
      if (year) citation += ` (${year}).`;
      else citation += '.';
      if (link) citation += ` ${link}`;
      return citation;
    }
    default: {
      let citation = `*${title}*.`;
      if (venue) citation += ` ${venue}`;
      if (year) citation += venue ? `, ${year}.` : ` ${year}.`;
      if (link) citation += ` ${link}`;
      return citation;
    }
  }
}

/**
 * Fetches the full academic dossier payload for a scholar by slug.
 */
export async function getScholarDossierData(slug: string): Promise<ScholarDossierData | null> {
  const supabase = await createClient();

  const { data: scholar, error } = await supabase
    .from('scholars')
    .select(`
      id,
      slug,
      full_name,
      title,
      current_institution,
      institutional_role,
      location,
      biography,
      profile_photo_path,
      profile_tier,
      orcid_id,
      google_scholar_url,
      verification_status,
      doctrinal_statement_text,
      profile_status,
      scholar_disciplines (
        is_primary,
        disciplines (*)
      ),
      scholar_traditions (
        is_primary,
        traditions (*)
      ),
      scholar_confessions (
        adherence_level,
        exception_notes,
        confessional_standards (*)
      ),
      credentials (*),
      publications (*),
      courses (*),
      media_links (*)
    `)
    .eq('slug', slug)
    .eq('profile_status', 'approved')
    .maybeSingle();

  if (error || !scholar) {
    return null;
  }

  // Fetch verified endorsements
  const { data: endorsementsData } = await supabase
    .from('scholar_endorsements')
    .select(`
      id,
      relationship,
      commendation_text,
      created_at,
      endorser:endorser_scholar_id (
        full_name,
        title,
        current_institution
      )
    `)
    .eq('recipient_scholar_id', scholar.id)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false });

  interface RawEndorsementRecord {
    id: string;
    relationship: string;
    commendation_text: string;
    created_at: string;
    endorser?: {
      full_name?: string | null;
      title?: string | null;
      current_institution?: string | null;
    } | null;
  }

  const endorsements: DossierEndorsementItem[] = (
    (endorsementsData as unknown as RawEndorsementRecord[]) || []
  ).map((e) => ({
    id: e.id,
    endorser_name: e.endorser?.full_name || 'Verified Scholar Colleague',
    endorser_title: e.endorser?.title || null,
    endorser_institution: e.endorser?.current_institution || null,
    relationship: e.relationship,
    commendation_text: e.commendation_text,
    created_at: e.created_at,
  }));

  interface RawDisciplineRelation {
    is_primary: boolean;
    disciplines: Discipline | null;
  }
  const disciplines = ((scholar.scholar_disciplines as unknown as RawDisciplineRelation[]) || [])
    .filter((d): d is RawDisciplineRelation & { disciplines: Discipline } => Boolean(d.disciplines))
    .map((d) => ({
      discipline: d.disciplines,
      is_primary: d.is_primary,
    }));

  interface RawTraditionRelation {
    is_primary: boolean;
    traditions: Tradition | null;
  }
  const traditions = ((scholar.scholar_traditions as unknown as RawTraditionRelation[]) || [])
    .filter((t): t is RawTraditionRelation & { traditions: Tradition } => Boolean(t.traditions))
    .map((t) => ({
      tradition: t.traditions,
      is_primary: t.is_primary,
    }));

  interface RawConfessionRelation {
    adherence_level: string;
    exception_notes: string | null;
    confessional_standards: ConfessionalStandard | null;
  }
  const confessions = ((scholar.scholar_confessions as unknown as RawConfessionRelation[]) || [])
    .filter((c): c is RawConfessionRelation & { confessional_standards: ConfessionalStandard } =>
      Boolean(c.confessional_standards)
    )
    .map((c) => ({
      confessional_standard: c.confessional_standards,
      adherence_level: c.adherence_level,
      exception_notes: c.exception_notes,
    }));

  const credentials: AcademicCredential[] = ((scholar.credentials as AcademicCredential[]) || []).sort(
    (a, b) => a.display_order - b.display_order
  );

  const rawPubs = (scholar.publications as AcademicPublication[]) || [];
  const publications: DossierPublicationItem[] = rawPubs
    .sort((a, b) => a.display_order - b.display_order)
    .map((p) => ({
      id: p.id,
      title: p.title,
      publication_type: p.publication_type,
      publisher_or_journal: p.publisher_or_journal ?? null,
      year: p.year ?? null,
      doi_or_url: p.doi_or_url ?? null,
      sblCitation: formatSblCitation(p),
    }));

  const courses: CourseShowcase[] = ((scholar.courses as CourseShowcase[]) || []).filter(
    (c) => c.visibility === 'public'
  );

  const media_links: MediaLink[] = ((scholar.media_links as MediaLink[]) || []).sort(
    (a, b) => a.display_order - b.display_order
  );

  return {
    id: scholar.id,
    slug: scholar.slug,
    full_name: scholar.full_name,
    title: scholar.title,
    current_institution: scholar.current_institution,
    institutional_role: scholar.institutional_role,
    location: scholar.location,
    biography: scholar.biography,
    profile_photo_path: scholar.profile_photo_path,
    profile_tier: (scholar.profile_tier as 'standard' | 'distinguished_fellow') || 'standard',
    orcid_id: scholar.orcid_id,
    google_scholar_url: scholar.google_scholar_url,
    verification_status: scholar.verification_status,
    doctrinal_statement_text: scholar.doctrinal_statement_text,
    disciplines,
    traditions,
    confessions,
    credentials,
    publications,
    courses,
    media_links,
    endorsements,
    generated_at: new Date().toISOString(),
  };
}
