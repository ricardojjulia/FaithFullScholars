export type TargetAudience = 'academic' | 'pastoral' | 'church_wide' | 'undergraduate';

export const TARGET_AUDIENCES: TargetAudience[] = [
  'academic',
  'pastoral',
  'church_wide',
  'undergraduate',
];

export function formatTargetAudience(audience: TargetAudience): string {
  switch (audience) {
    case 'academic':
      return 'Academic Symposium / Keynote';
    case 'pastoral':
      return 'Pastoral / Chapel Address';
    case 'church_wide':
      return 'Church-Wide / Lay Conference';
    case 'undergraduate':
      return 'Undergraduate / Student Ministry';
    default:
      return audience;
  }
}

export interface SpeakerTopic {
  id: string;
  scholar_id: string;
  title: string;
  description: string;
  target_audience: TargetAudience;
  sample_media_url: string | null;
  display_order: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface SpeakerTopicInput {
  title?: string;
  description?: string;
  target_audience?: string;
  sample_media_url?: string | null;
  display_order?: number;
  is_featured?: boolean;
}

export function validateSpeakerTopicInput(input: unknown): { valid: boolean; error?: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, error: 'Topic input must be a valid JSON object.' };
  }
  const typedInput = input as Record<string, unknown>;

  if (!typedInput.title || typeof typedInput.title !== 'string' || !typedInput.title.trim()) {
    return { valid: false, error: 'Topic title is required.' };
  }
  if (typedInput.title.length < 3 || typedInput.title.length > 200) {
    return { valid: false, error: 'Topic title must be between 3 and 200 characters.' };
  }

  if (!typedInput.description || typeof typedInput.description !== 'string' || !typedInput.description.trim()) {
    return { valid: false, error: 'Topic description is required.' };
  }
  if (typedInput.description.length < 10 || typedInput.description.length > 2000) {
    return { valid: false, error: 'Topic description must be between 10 and 2000 characters.' };
  }

  if (typedInput.target_audience !== undefined && typedInput.target_audience !== null) {
    if (
      typeof typedInput.target_audience !== 'string' ||
      !TARGET_AUDIENCES.includes(typedInput.target_audience as TargetAudience)
    ) {
      return { valid: false, error: 'Invalid target audience selection.' };
    }
  }

  if (typedInput.sample_media_url !== undefined && typedInput.sample_media_url !== null && typedInput.sample_media_url !== '') {
    if (typeof typedInput.sample_media_url !== 'string') {
      return { valid: false, error: 'Sample media URL must be a valid URL string.' };
    }
    const trimmedUrl = typedInput.sample_media_url.trim();
    if (!trimmedUrl.startsWith('https://') && !trimmedUrl.startsWith('http://')) {
      return { valid: false, error: 'Sample media URL must start with http:// or https://' };
    }
  }

  if (typedInput.display_order !== undefined && typedInput.display_order !== null) {
    if (typeof typedInput.display_order !== 'number' || !Number.isInteger(typedInput.display_order)) {
      return { valid: false, error: 'Display order must be an integer.' };
    }
  }

  if (typedInput.is_featured !== undefined && typedInput.is_featured !== null) {
    if (typeof typedInput.is_featured !== 'boolean') {
      return { valid: false, error: 'Featured flag must be a boolean.' };
    }
  }

  return { valid: true };
}

export interface SpeakerProfile {
  scholar_id: string;
  full_name: string;
  slug: string;
  title: string | null;
  avatar_url: string | null;
  institution_name: string | null;
  disciplines: string[];
  discipline_slugs?: string[];
  tradition_name: string | null;
  tradition_slug?: string | null;
  travel_preferences: string | null;
  speaking_bio: string | null;
  honorarium_policy: string | null;
  topics: SpeakerTopic[];
}
