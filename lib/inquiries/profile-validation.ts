/**
 * Input validation for the institution's self-service profile edit. Allow-list
 * only: trust columns (status, slug, accreditation_*) are never accepted here,
 * and the database guard trigger (ADR 0023) enforces the same independently.
 */
import type { InstitutionType } from '@/lib/domain/types';

export const INSTITUTION_TYPES: readonly InstitutionType[] = [
  'seminary',
  'bible_college',
  'theological_college',
  'christian_university',
  'ministry_institute',
  'church',
  'mission_org',
  'other',
];

export interface InstitutionProfileInput {
  name?: string;
  website?: string | null;
  location?: string | null;
  contact_email?: string;
  institution_type?: InstitutionType;
}

export type ProfileValidation =
  | { ok: true; value: InstitutionProfileInput }
  | { ok: false; errors: Partial<Record<keyof InstitutionProfileInput, string>> };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Validates only the keys present; unknown keys are dropped. Values are trimmed. */
export function validateInstitutionProfile(raw: unknown): ProfileValidation {
  const errors: Partial<Record<keyof InstitutionProfileInput, string>> = {};
  const value: InstitutionProfileInput = {};

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: { name: 'Invalid request.' } };
  }
  const input = raw as Record<string, unknown>;

  if (input.name !== undefined) {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name) errors.name = 'Institution name is required.';
    else if (name.length > 200) errors.name = 'Institution name must be 200 characters or fewer.';
    else value.name = name;
  }

  if (input.website !== undefined && input.website !== null) {
    const website = typeof input.website === 'string' ? input.website.trim() : null;
    if (website === null) errors.website = 'Website must be text.';
    else if (website === '') value.website = null;
    else if (website.length > 300 || !isHttpUrl(website)) errors.website = 'Enter a full web address starting with http:// or https://.';
    else value.website = website;
  } else if (input.website === null) {
    value.website = null;
  }

  if (input.location !== undefined && input.location !== null) {
    const location = typeof input.location === 'string' ? input.location.trim() : null;
    if (location === null) errors.location = 'Location must be text.';
    else if (location.length > 200) errors.location = 'Location must be 200 characters or fewer.';
    else value.location = location === '' ? null : location;
  } else if (input.location === null) {
    value.location = null;
  }

  if (input.contact_email !== undefined) {
    const email = typeof input.contact_email === 'string' ? input.contact_email.trim() : '';
    if (!email || email.length > 254 || !EMAIL.test(email)) errors.contact_email = 'Enter a valid contact email address.';
    else value.contact_email = email;
  }

  if (input.institution_type !== undefined) {
    if (typeof input.institution_type === 'string' && (INSTITUTION_TYPES as readonly string[]).includes(input.institution_type)) {
      value.institution_type = input.institution_type as InstitutionType;
    } else {
      errors.institution_type = 'Choose a valid institution type.';
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value };
}
