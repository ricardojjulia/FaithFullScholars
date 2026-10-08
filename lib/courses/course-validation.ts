/**
 * Course input validation (spec 2026-10-08-scholar-courses). Pure functions: the
 * routes call these before any database write. Allow-lists mirror the database
 * CHECK constraints and the TypeScript `DeliveryMode`, because public pages
 * render these values.
 */

import type { CourseLevel, CourseVisibility, DeliveryMode } from '@/lib/domain/types';

export const COURSE_LEVELS: readonly CourseLevel[] = [
  'undergraduate',
  'graduate',
  'doctoral',
  'certificate',
  'lay_education',
];
export const COURSE_VISIBILITIES: readonly CourseVisibility[] = ['public', 'unlisted', 'private'];
export const DELIVERY_MODES: readonly DeliveryMode[] = [
  'online_async',
  'online_sync',
  'in_person_modular',
  'in_person_semester',
];

export const TITLE_MAX = 200;
export const TEXT_MAX = 5000;
export const MAX_DISCIPLINES = 5;

export const LEVEL_LABELS: Record<CourseLevel, string> = {
  undergraduate: 'Undergraduate',
  graduate: 'Graduate',
  doctoral: 'Doctoral',
  certificate: 'Certificate',
  lay_education: 'Lay education',
};
export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  online_async: 'Online (self-paced)',
  online_sync: 'Online (live)',
  in_person_modular: 'In person (modular)',
  in_person_semester: 'In person (semester)',
};
export const VISIBILITY_LABELS: Record<CourseVisibility, string> = {
  public: 'Public',
  unlisted: 'Unlisted',
  private: 'Private',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID_RE.test(value);

export interface CourseFields {
  title: string;
  description: string | null;
  reading_list: string | null;
  level: CourseLevel;
  visibility: CourseVisibility;
  delivery_modes: DeliveryMode[];
  primary_discipline_id: string | null;
  /** Every discipline the course is tagged with (the primary one is always included). */
  discipline_ids: string[];
}

export type CourseValidation =
  | { ok: true; value: Partial<CourseFields> }
  | { ok: false; errors: Record<string, string> };

function optionalText(raw: unknown, field: string, errors: Record<string, string>): string | null | undefined {
  if (raw === null) return null;
  if (typeof raw !== 'string') {
    errors[field] = 'Must be text.';
    return undefined;
  }
  const trimmed = raw.trim();
  if (trimmed.length > TEXT_MAX) {
    errors[field] = `Must be ${TEXT_MAX} characters or fewer.`;
    return undefined;
  }
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Validates a create (`partial: false`, title and level required) or update
 * (`partial: true`, only the keys present are checked) body. Unknown keys,
 * including any `scholar_id`, are ignored: they never reach the result.
 */
export function validateCourseInput(raw: unknown, opts: { partial: boolean }): CourseValidation {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: { body: 'A JSON object is required.' } };
  }
  const body = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const value: Partial<CourseFields> = {};
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined;

  if (has('title') || !opts.partial) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (title.length < 1 || title.length > TITLE_MAX) {
      errors.title = `Title is required and must be 1 to ${TITLE_MAX} characters.`;
    } else {
      value.title = title;
    }
  }

  if (has('description')) {
    const v = optionalText(body.description, 'description', errors);
    if (v !== undefined) value.description = v;
  }
  if (has('reading_list')) {
    const v = optionalText(body.reading_list, 'reading_list', errors);
    if (v !== undefined) value.reading_list = v;
  }

  if (has('level') || !opts.partial) {
    if (typeof body.level === 'string' && (COURSE_LEVELS as readonly string[]).includes(body.level)) {
      value.level = body.level as CourseLevel;
    } else {
      errors.level = 'Choose a valid level.';
    }
  }

  if (has('visibility')) {
    if (typeof body.visibility === 'string' && (COURSE_VISIBILITIES as readonly string[]).includes(body.visibility)) {
      value.visibility = body.visibility as CourseVisibility;
    } else {
      errors.visibility = 'Choose public, unlisted or private.';
    }
  }

  if (has('delivery_modes')) {
    const modes = body.delivery_modes;
    if (
      !Array.isArray(modes) ||
      modes.length > DELIVERY_MODES.length ||
      !modes.every((m) => typeof m === 'string' && (DELIVERY_MODES as readonly string[]).includes(m))
    ) {
      errors.delivery_modes = 'Choose valid delivery modes.';
    } else {
      value.delivery_modes = Array.from(new Set(modes)) as DeliveryMode[];
    }
  }

  let primary: string | null | undefined;
  if (has('primary_discipline_id')) {
    if (body.primary_discipline_id === null || body.primary_discipline_id === '') {
      primary = null;
    } else if (isUuid(body.primary_discipline_id)) {
      primary = body.primary_discipline_id;
    } else {
      errors.primary_discipline_id = 'Choose a valid discipline.';
    }
    if (primary !== undefined) value.primary_discipline_id = primary;
  }

  let ids: string[] | undefined;
  if (has('discipline_ids')) {
    const list = body.discipline_ids;
    if (!Array.isArray(list) || !list.every(isUuid)) {
      errors.discipline_ids = 'Choose valid disciplines.';
    } else {
      ids = Array.from(new Set(list));
    }
  }
  if (ids || primary !== undefined) {
    const merged = Array.from(new Set([...(primary ? [primary] : []), ...(ids ?? [])]));
    if (merged.length > MAX_DISCIPLINES) {
      errors.discipline_ids = `Choose at most ${MAX_DISCIPLINES} disciplines.`;
    } else {
      value.discipline_ids = merged;
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value };
}

export function slugify(title: string): string {
  const base = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return base || 'course';
}

/** First free slug for this scholar: `base`, then `base-2`, `base-3`, ... (UNIQUE(scholar_id, slug)). */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; n < 10000; n += 1) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
