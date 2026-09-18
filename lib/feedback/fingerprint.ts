import { createHash } from 'crypto';
import { FeedbackCategory } from './types';

/**
 * Normalizes text input by trimming leading/trailing whitespace,
 * converting to lowercase, and collapsing multiple internal whitespaces.
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Normalizes route path by trimming whitespace, lowercasing, and stripping trailing slashes.
 */
export function normalizeRoute(route: string | null | undefined): string {
  if (!route) return '/';
  const clean = normalizeText(route).replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
}

/**
 * Computes a deterministic SHA-256 fingerprint for deduplication.
 * - For automatic errors: route + category + normalized error message
 * - For manual feedback: route + category + normalized user note
 *
 * This ensures equivalent reports collapse into a single triaged row
 * while materially different user feedback remains distinct.
 */
export function computeFeedbackFingerprint(params: {
  route: string;
  category: FeedbackCategory;
  errorMessage?: string | null;
  note?: string | null;
}): string {
  const normRoute = normalizeRoute(params.route);
  const normCategory = params.category.trim().toUpperCase();

  let payload = '';
  if (params.category === 'ERROR') {
    const normError = normalizeText(params.errorMessage);
    payload = `${normRoute}::${normCategory}::${normError}`;
  } else {
    const normNote = normalizeText(params.note);
    payload = `${normRoute}::${normCategory}::${normNote}`;
  }

  return createHash('sha256').update(payload).digest('hex');
}
