import { createClient } from '@/lib/supabase/server';
import {
  SpeakerTopic,
  SpeakerProfile,
} from './types';

export * from './types';

interface ScholarDbRow {
  id: string;
  full_name: string;
  slug: string;
  title: string | null;
  profile_photo_path: string | null;
  current_institution: string | null;
  scholar_disciplines: { disciplines: { name: string; slug: string } | null }[];
  scholar_traditions: { traditions: { name: string; slug: string } | null }[];
  availability_profiles:
    | {
        opportunity_types: string[] | null;
        travel_preferences: string | null;
        speaking_bio: string | null;
        honorarium_policy: string | null;
      }
    | {
        opportunity_types: string[] | null;
        travel_preferences: string | null;
        speaking_bio: string | null;
        honorarium_policy: string | null;
      }[]
    | null;
  speaker_topics: SpeakerTopic[];
}

export async function getAllSpeakers(filters?: {
  audience?: string;
  disciplineSlug?: string;
  traditionSlug?: string;
  query?: string;
}): Promise<SpeakerProfile[]> {
  const supabase = await createClient();

  const query = supabase
    .from('scholars')
    .select(`
      id,
      full_name,
      slug,
      title,
      profile_photo_path,
      current_institution,
      scholar_disciplines(disciplines(name, slug)),
      scholar_traditions(traditions(name, slug)),
      availability_profiles(
        opportunity_types,
        travel_preferences,
        speaking_bio,
        honorarium_policy
      ),
      speaker_topics(*)
    `)
    .eq('profile_status', 'approved');

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  // Filter scholars with active speaking availability
  const typedData = data as unknown as ScholarDbRow[];
  let speakers: SpeakerProfile[] = typedData
    .filter((row: ScholarDbRow) => {
      const avail = Array.isArray(row.availability_profiles)
        ? row.availability_profiles[0]
        : row.availability_profiles;
      const oppTypes: string[] = avail?.opportunity_types || [];
      const hasAvailability =
        oppTypes.includes('conference_speaking') ||
        oppTypes.includes('guest_lecturing') ||
        oppTypes.includes('guest_lecture');
      const hasTopics = Array.isArray(row.speaker_topics) && row.speaker_topics.length > 0;
      return hasAvailability && hasTopics;
    })
    .map((row: ScholarDbRow) => {
      const avail = Array.isArray(row.availability_profiles)
        ? row.availability_profiles[0]
        : row.availability_profiles;

      const disciplines: string[] = (row.scholar_disciplines || [])
        .map((sd) => sd.disciplines?.name)
        .filter((name): name is string => Boolean(name));

      const disciplineSlugs: string[] = (row.scholar_disciplines || [])
        .map((sd) => sd.disciplines?.slug)
        .filter((slug): slug is string => Boolean(slug));

      const traditionName: string | null =
        row.scholar_traditions?.[0]?.traditions?.name || null;

      const traditionSlug: string | null =
        row.scholar_traditions?.[0]?.traditions?.slug || null;

      const topics: SpeakerTopic[] = (row.speaker_topics || []).sort(
        (a: SpeakerTopic, b: SpeakerTopic) => a.display_order - b.display_order
      );

      return {
        scholar_id: row.id,
        full_name: row.full_name,
        slug: row.slug,
        title: row.title,
        avatar_url: row.profile_photo_path,
        institution_name: row.current_institution || null,
        disciplines,
        discipline_slugs: disciplineSlugs,
        tradition_name: traditionName,
        tradition_slug: traditionSlug,
        travel_preferences: avail?.travel_preferences || null,
        speaking_bio: avail?.speaking_bio || null,
        honorarium_policy: avail?.honorarium_policy || null,
        topics,
      };
    });

  // In-memory filter for audience
  if (filters?.audience) {
    speakers = speakers.filter((s) =>
      s.topics.some((t) => t.target_audience === filters.audience)
    );
  }

  // In-memory filter for discipline slug
  if (filters?.disciplineSlug) {
    speakers = speakers.filter((s) =>
      s.discipline_slugs?.includes(filters.disciplineSlug!)
    );
  }

  // In-memory filter for tradition slug
  if (filters?.traditionSlug) {
    speakers = speakers.filter((s) =>
      s.tradition_slug === filters.traditionSlug
    );
  }

  // In-memory search query
  if (filters?.query) {
    const q = filters.query.toLowerCase();
    speakers = speakers.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.disciplines.some((d) => d.toLowerCase().includes(q)) ||
        s.topics.some(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q)
        )
    );
  }

  return speakers;
}

export async function getSpeakerTopicsByScholarId(scholarId: string): Promise<SpeakerTopic[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('speaker_topics')
    .select('*')
    .eq('scholar_id', scholarId)
    .order('display_order', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as SpeakerTopic[];
}
