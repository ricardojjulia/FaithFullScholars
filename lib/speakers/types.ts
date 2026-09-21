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

export function validateSpeakerTopicInput(input: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!input.title || typeof input.title !== 'string' || !input.title.trim()) {
    return { valid: false, error: 'Topic title is required.' };
  }
  if (input.title.length < 3 || input.title.length > 200) {
    return { valid: false, error: 'Topic title must be between 3 and 200 characters.' };
  }

  if (!input.description || typeof input.description !== 'string' || !input.description.trim()) {
    return { valid: false, error: 'Topic description is required.' };
  }
  if (input.description.length < 10 || input.description.length > 2000) {
    return { valid: false, error: 'Topic description must be between 10 and 2000 characters.' };
  }

  if (input.target_audience !== undefined && input.target_audience !== null) {
    if (
      typeof input.target_audience !== 'string' ||
      !TARGET_AUDIENCES.includes(input.target_audience as TargetAudience)
    ) {
      return { valid: false, error: 'Invalid target audience selection.' };
    }
  }

  if (input.sample_media_url !== undefined && input.sample_media_url !== null && input.sample_media_url !== '') {
    if (typeof input.sample_media_url !== 'string') {
      return { valid: false, error: 'Sample media URL must be a valid URL string.' };
    }
    const trimmedUrl = input.sample_media_url.trim();
    if (!trimmedUrl.startsWith('https://') && !trimmedUrl.startsWith('http://')) {
      return { valid: false, error: 'Sample media URL must start with http:// or https://' };
    }
  }

  if (input.display_order !== undefined && input.display_order !== null) {
    if (typeof input.display_order !== 'number' || !Number.isInteger(input.display_order)) {
      return { valid: false, error: 'Display order must be an integer.' };
    }
  }

  if (input.is_featured !== undefined && input.is_featured !== null) {
    if (typeof input.is_featured !== 'boolean') {
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
