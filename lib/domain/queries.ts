/**
-- ==============================================================================
-- FaithFull Scholars — Public Discovery Queries
-- Server-side loaders for public scholar directory, academic profile details,
-- course showcases, and theological taxonomies.
-- ==============================================================================
 */

import { createClient } from '@/lib/supabase/server';
import {
  AcademicCredential,
  AcademicPublication,
  CourseShowcase,
  MediaLink,
  AvailabilityProfile,
  ScholarProfile,
  Discipline,
  Tradition,
  ConfessionalStandard,
} from './types';

export interface ScholarFilters {
  search?: string;
  discipline?: string;
  tradition?: string;
  confession?: string;
  availableForHire?: boolean;
  deliveryMode?: string;
}

export interface PublicScholarCard {
  id: string;
  slug: string;
  full_name: string;
  title: string | null;
  current_institution: string | null;
  institutional_role: string | null;
  location: string | null;
  biography: string | null;
  profile_photo_path: string | null;
  disciplines: Array<{ name: string; slug: string; is_primary: boolean }>;
  traditions: Array<{ name: string; slug: string; is_primary: boolean }>;
  confessions: Array<{ name: string; slug: string; adherence_level: string }>;
  is_available_for_hire: boolean;
  opportunity_types: string[];
}

export interface FullPublicScholarProfile extends ScholarProfile {
  disciplines: Array<{ discipline: Discipline; is_primary: boolean }>;
  traditions: Array<{ tradition: Tradition; is_primary: boolean }>;
  confessions: Array<{
    confessional_standard: ConfessionalStandard;
    adherence_level: string;
    exception_notes: string | null;
  }>;
  credentials: AcademicCredential[];
  publications: AcademicPublication[];
  courses: CourseShowcase[];
  media_links: MediaLink[];
  availability: AvailabilityProfile | null;
}

export interface CourseFilters {
  search?: string;
  discipline?: string;
  level?: string;
  deliveryMode?: string;
}

export interface PublicCourseCard extends CourseShowcase {
  scholar: {
    id: string;
    slug: string;
    full_name: string;
    title: string | null;
    current_institution: string | null;
  };
  discipline: Discipline | null;
}

interface ScholarDisciplineJoin {
  is_primary: boolean;
  disciplines: { id: string; name: string; slug: string } | null;
}

interface ScholarTraditionJoin {
  is_primary: boolean;
  traditions: { id: string; name: string; slug: string } | null;
}

interface ScholarConfessionJoin {
  adherence_level: string;
  confessional_standards: { id: string; name: string; slug: string } | null;
}

interface ScholarAvailabilityJoin {
  is_available_for_hire: boolean;
  opportunity_types: string[];
  preferred_delivery_modes: string[];
}

interface PublicScholarDbRow {
  id: string;
  slug: string;
  full_name: string;
  title: string | null;
  current_institution: string | null;
  institutional_role: string | null;
  location: string | null;
  biography: string | null;
  profile_photo_path: string | null;
  scholar_disciplines?: ScholarDisciplineJoin[] | null;
  scholar_traditions?: ScholarTraditionJoin[] | null;
  scholar_confessions?: ScholarConfessionJoin[] | null;
  availability_profiles?: ScholarAvailabilityJoin | ScholarAvailabilityJoin[] | null;
}

/**
 * Fetch all approved scholars matching search & filter criteria.
 */
export async function getPublicScholars(
  filters: ScholarFilters = {}
): Promise<PublicScholarCard[]> {
  const supabase = await createClient();

  let query = supabase
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
      scholar_disciplines (
        is_primary,
        disciplines (id, name, slug)
      ),
      scholar_traditions (
        is_primary,
        traditions (id, name, slug)
      ),
      scholar_confessions (
        adherence_level,
        confessional_standards (id, name, slug)
      ),
      availability_profiles (
        is_available_for_hire,
        opportunity_types,
        preferred_delivery_modes
      )
    `)
    .eq('profile_status', 'approved');

  if (filters.search && filters.search.trim() !== '') {
    const term = `%${filters.search.trim()}%`;
    query = query.or(
      `full_name.ilike.${term},title.ilike.${term},biography.ilike.${term},current_institution.ilike.${term}`
    );
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error('Error fetching public scholars:', error);
    return [];
  }

  const rows = data as unknown as PublicScholarDbRow[];

  // Transform and filter associations in memory for rich multi-criteria match
  let results: PublicScholarCard[] = rows.map((row) => {
    const rawDisc = row.scholar_disciplines || [];
    const disciplines = rawDisc
      .filter((d): d is ScholarDisciplineJoin & { disciplines: { id: string; name: string; slug: string } } => Boolean(d.disciplines))
      .map((d) => ({
        name: d.disciplines.name,
        slug: d.disciplines.slug,
        is_primary: d.is_primary,
      }));

    const rawTrad = row.scholar_traditions || [];
    const traditions = rawTrad
      .filter((t): t is ScholarTraditionJoin & { traditions: { id: string; name: string; slug: string } } => Boolean(t.traditions))
      .map((t) => ({
        name: t.traditions.name,
        slug: t.traditions.slug,
        is_primary: t.is_primary,
      }));

    const rawConf = row.scholar_confessions || [];
    const confessions = rawConf
      .filter((c): c is ScholarConfessionJoin & { confessional_standards: { id: string; name: string; slug: string } } => Boolean(c.confessional_standards))
      .map((c) => ({
        name: c.confessional_standards.name,
        slug: c.confessional_standards.slug,
        adherence_level: c.adherence_level,
      }));

    const avail = Array.isArray(row.availability_profiles)
      ? row.availability_profiles[0]
      : row.availability_profiles;

    return {
      id: row.id,
      slug: row.slug,
      full_name: row.full_name,
      title: row.title,
      current_institution: row.current_institution,
      institutional_role: row.institutional_role,
      location: row.location,
      biography: row.biography,
      profile_photo_path: row.profile_photo_path,
      disciplines,
      traditions,
      confessions,
      is_available_for_hire: avail?.is_available_for_hire ?? false,
      opportunity_types: avail?.opportunity_types ?? [],
    };
  });

  if (filters.discipline) {
    results = results.filter((s) =>
      s.disciplines.some((d) => d.slug === filters.discipline)
    );
  }

  if (filters.tradition) {
    results = results.filter((s) =>
      s.traditions.some((t) => t.slug === filters.tradition)
    );
  }

  if (filters.confession) {
    results = results.filter((s) =>
      s.confessions.some((c) => c.slug === filters.confession)
    );
  }

  if (filters.availableForHire) {
    results = results.filter((s) => s.is_available_for_hire);
  }

  return results;
}

/**
 * Fetch a single approved scholar by slug with complete academic portfolio.
 * Returns null if not found or not approved.
 */
export async function getPublicScholarBySlug(
  slug: string
): Promise<FullPublicScholarProfile | null> {
  const supabase = await createClient();

  const { data: scholar, error } = await supabase
    .from('scholars')
    .select(`
      *,
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
      media_links (*),
      availability_profiles (*)
    `)
    .eq('slug', slug)
    .eq('profile_status', 'approved')
    .maybeSingle();

  if (error || !scholar) {
    return null;
  }

  const scholarRow = scholar as unknown as FullPublicScholarProfile;

  // Filter courses to public visibility only
  const courses = (scholarRow.courses || []).filter(
    (c) => c.visibility === 'public'
  );

  // Sort credentials & publications
  const credentials = (scholarRow.credentials || []).sort(
    (a, b) => a.display_order - b.display_order
  );
  const publications = (scholarRow.publications || []).sort(
    (a, b) => a.display_order - b.display_order
  );
  const media_links = (scholarRow.media_links || []).sort(
    (a, b) => a.display_order - b.display_order
  );

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
    .filter((c): c is RawConfessionRelation & { confessional_standards: ConfessionalStandard } => Boolean(c.confessional_standards))
    .map((c) => ({
      confessional_standard: c.confessional_standards,
      adherence_level: c.adherence_level,
      exception_notes: c.exception_notes,
    }));

  const availability = Array.isArray(scholar.availability_profiles)
    ? (scholar.availability_profiles[0] as AvailabilityProfile | undefined) ?? null
    : (scholar.availability_profiles as AvailabilityProfile | null) ?? null;

  return {
    ...scholarRow,
    disciplines,
    traditions,
    confessions,
    credentials,
    publications,
    courses,
    media_links,
    availability,
  };
}

interface RawCourseDbRow extends CourseShowcase {
  scholars: {
    id: string;
    slug: string;
    full_name: string;
    title: string | null;
    current_institution: string | null;
    profile_status: string;
  };
  disciplines: Discipline | null;
}

/**
 * Fetch all public courses offered by approved faculty.
 */
export async function getPublicCourses(
  filters: CourseFilters = {}
): Promise<PublicCourseCard[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      scholars!inner (
        id,
        slug,
        full_name,
        title,
        current_institution,
        profile_status
      ),
      disciplines:primary_discipline_id (
        id,
        name,
        slug,
        category,
        description,
        created_at
      )
    `)
    .eq('visibility', 'public')
    .eq('scholars.profile_status', 'approved');

  if (error || !data) {
    console.error('Error fetching public courses:', error);
    return [];
  }

  const rawCourses = data as unknown as RawCourseDbRow[];

  let results: PublicCourseCard[] = rawCourses.map((row) => ({
    ...row,
    scholar: row.scholars,
    discipline: row.disciplines ?? null,
  }));

  if (filters.search && filters.search.trim() !== '') {
    const term = filters.search.trim().toLowerCase();
    results = results.filter(
      (c) =>
        c.title.toLowerCase().includes(term) ||
        (c.description && c.description.toLowerCase().includes(term)) ||
        c.scholar.full_name.toLowerCase().includes(term)
    );
  }

  if (filters.discipline) {
    results = results.filter((c) => c.discipline?.slug === filters.discipline);
  }

  if (filters.level) {
    results = results.filter((c) => c.level === filters.level);
  }

  if (filters.deliveryMode) {
    results = results.filter((c) =>
      (c.delivery_modes as string[]).includes(filters.deliveryMode!)
    );
  }

  return results;
}

/**
 * Fetch a single course by slug with instructor metadata and reading list.
 */
export async function getPublicCourseBySlug(
  slug: string
): Promise<PublicCourseCard | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      scholars!inner (
        id,
        slug,
        full_name,
        title,
        current_institution,
        profile_status
      ),
      disciplines:primary_discipline_id (
        id,
        name,
        slug,
        category,
        description,
        created_at
      )
    `)
    .eq('slug', slug)
    .eq('visibility', 'public')
    .eq('scholars.profile_status', 'approved')
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    ...data,
    scholar: data.scholars,
    discipline: data.disciplines ?? null,
  };
}

/**
 * Fetch active taxonomies for search filter dropdowns.
 */
export async function getTaxonomies() {
  const supabase = await createClient();

  const [discRes, tradRes, confRes] = await Promise.all([
    supabase.from('disciplines').select('id, name, slug, category').order('category'),
    supabase.from('traditions').select('id, name, slug').order('name'),
    supabase.from('confessional_standards').select('id, name, slug, year').order('year'),
  ]);

  return {
    disciplines: discRes.data || [],
    traditions: tradRes.data || [],
    confessionalStandards: confRes.data || [],
  };
}
