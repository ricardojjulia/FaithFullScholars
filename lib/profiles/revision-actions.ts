/**
 * ==============================================================================
 * FaithFull Scholars — Revision Actions & Staging Management (ADR 0005)
 * Manages draft revisions and review submissions.
 * Enforces revision isolation: draft changes are stored in snapshot_data
 * without touching the live published revision until approved by an admin.
 * ==============================================================================
 */

import { RevisionSnapshotData } from '@/lib/domain/types';
import { computeRevisionDiff, ProfileRevisionDiff } from '@/lib/domain/diff';

export interface SaveDraftResult {
  success: boolean;
  revision_id?: string;
  revision_number?: number;
  error?: string;
  diff?: ProfileRevisionDiff;
}

export interface SubmitReviewResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Validates and sanitizes revision snapshot fields before writing to draft.
 */
export function validateRevisionData(data: Partial<RevisionSnapshotData>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.full_name || data.full_name.trim().length < 2) {
    errors.push('Full name must be at least 2 characters long.');
  }

  if (data.full_name && data.full_name.length > 100) {
    errors.push('Full name cannot exceed 100 characters.');
  }

  if (data.current_institution && data.current_institution.length > 150) {
    errors.push('Institution name cannot exceed 150 characters.');
  }

  if (data.orcid_id && !/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(data.orcid_id)) {
    errors.push('Invalid ORCID format. Expected format: 0000-0000-0000-0000.');
  }

  if (data.google_scholar_url && !/^https:\/\/scholar\.google\.[a-z.]+\/citations\?.*user=/.test(data.google_scholar_url)) {
    errors.push('Invalid Google Scholar URL. Must be an official author citations profile.');
  }

  (data.credentials ?? []).forEach((c, i) => {
    if (!c.degree?.trim() || !c.field_of_study?.trim() || !c.institution_name?.trim()) {
      errors.push(`Credential ${i + 1} needs a degree, a field of study and an institution.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Prepares a structured draft snapshot payload from parsed CV suggestions or form inputs.
 */
export function buildDraftSnapshot(
  existingSnapshot: Partial<RevisionSnapshotData> | null,
  updates: Partial<RevisionSnapshotData>
): RevisionSnapshotData {
  return {
    full_name: updates.full_name ?? existingSnapshot?.full_name ?? '',
    title: updates.title ?? existingSnapshot?.title ?? null,
    current_institution: updates.current_institution ?? existingSnapshot?.current_institution ?? null,
    institutional_role: updates.institutional_role ?? existingSnapshot?.institutional_role ?? null,
    biography: updates.biography ?? existingSnapshot?.biography ?? null,
    location: updates.location ?? existingSnapshot?.location ?? null,
    timezone: updates.timezone ?? existingSnapshot?.timezone ?? 'America/New_York',
    doctrinal_statement_text: updates.doctrinal_statement_text ?? existingSnapshot?.doctrinal_statement_text ?? null,
    orcid_id: updates.orcid_id !== undefined ? updates.orcid_id : existingSnapshot?.orcid_id ?? null,
    google_scholar_url: updates.google_scholar_url !== undefined ? updates.google_scholar_url : existingSnapshot?.google_scholar_url ?? null,
    credentials: updates.credentials ?? existingSnapshot?.credentials ?? [],
    publications: updates.publications ?? existingSnapshot?.publications ?? [],
    disciplines: updates.disciplines ?? existingSnapshot?.disciplines ?? [],
    traditions: updates.traditions ?? existingSnapshot?.traditions ?? [],
    confessions: updates.confessions ?? existingSnapshot?.confessions ?? []
  };
}

/**
 * Compares current draft against live snapshot to produce diff count and preview.
 */
export function inspectDraftDiff(
  publishedSnapshot: RevisionSnapshotData | null,
  draftSnapshot: RevisionSnapshotData
): ProfileRevisionDiff {
  return computeRevisionDiff(publishedSnapshot, draftSnapshot);
}
