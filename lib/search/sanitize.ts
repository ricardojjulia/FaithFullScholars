/**
-- ==============================================================================
-- FaithFull Scholars — Search Input Sanitization & Anti-Abuse
-- ADR 0008: Search Abuse Gating, Anti-Scraping Defenses & PII Protection
-- ==============================================================================
 */

export interface SanitizedSearch {
  raw: string;
  sanitized: string;
  isValid: boolean;
  isTruncated: boolean;
}

const MAX_QUERY_LENGTH = 100;

/**
 * Sanitizes an incoming search term from URL searchParams or API payloads.
 * Strips raw SQL wildcards, bounds length, and removes control characters.
 */
export function sanitizeSearchQuery(input: unknown): SanitizedSearch {
  if (typeof input !== 'string') {
    return {
      raw: '',
      sanitized: '',
      isValid: false,
      isTruncated: false,
    };
  }

  const raw = input.trim();
  if (raw === '') {
    return {
      raw: '',
      sanitized: '',
      isValid: false,
      isTruncated: false,
    };
  }

  let isTruncated = false;
  let text = raw;

  if (text.length > MAX_QUERY_LENGTH) {
    text = text.slice(0, MAX_QUERY_LENGTH);
    isTruncated = true;
  }

  // Remove control characters (ASCII 0-31 and 127)
  text = text.replace(/[\x00-\x1F\x7F]/g, '');

  // Strip unescaped percent and underscore wildcards to prevent query explosion
  text = text.replace(/[%_\\]/g, ' ');

  // Collapse multiple spaces
  text = text.replace(/\s+/g, ' ').trim();

  return {
    raw,
    sanitized: text,
    isValid: text.length > 0,
    isTruncated,
  };
}
