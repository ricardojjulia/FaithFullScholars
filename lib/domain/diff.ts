/**
-- ==============================================================================
-- FaithFull Scholars — Revision Diff Engine (ADR 0005)
-- Calculates structured field-level diffs between a published revision snapshot
-- and a newly submitted revision draft for admin review.
-- ==============================================================================
 */

import { RevisionSnapshotData } from './types';

export interface FieldChange<T = unknown> {
  field: string;
  label: string;
  oldValue: T | null;
  newValue: T | null;
  kind: 'added' | 'modified' | 'removed';
}

export interface ProfileRevisionDiff {
  hasChanges: boolean;
  totalChanges: number;
  changes: FieldChange[];
}


// ---- canonical forms (avoid phantom diffs against a live baseline) ----------

const text = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
};
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function canonicalSlugs(list: string[]): string {
  return JSON.stringify([...new Set(list.map((v) => v.trim().toLowerCase()))].sort());
}

function primaryChanged(oldList: string[], newList: string[]): boolean {
  if (oldList.length === 0 || newList.length === 0) return false;
  return oldList[0].trim().toLowerCase() !== newList[0].trim().toLowerCase();
}

function canonicalConfessions(list: NonNullable<RevisionSnapshotData['confessions']>): string {
  return JSON.stringify(
    list
      .map((c) => [text(c.confessional_standard_id)?.toLowerCase() ?? null, c.adherence_level ?? null, text(c.exception_notes)])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
  );
}

function canonicalCredentials(list: NonNullable<RevisionSnapshotData['credentials']>): string {
  return JSON.stringify(
    list.map((c) => [
      text(c.degree),
      text(c.field_of_study),
      text(c.institution_name),
      num(c.year_awarded),
      c.is_terminal === true,
    ])
  );
}

function canonicalPublications(list: NonNullable<RevisionSnapshotData['publications']>): string {
  return JSON.stringify(
    list.map((p) => [
      text(p.title),
      p.publication_type ?? null,
      text(p.publisher_or_journal),
      num(p.year),
      text(p.doi_or_url),
      text(p.citation_text),
    ])
  );
}

export function computeRevisionDiff(
  published: RevisionSnapshotData | null | undefined,
  draft: RevisionSnapshotData
): ProfileRevisionDiff {
  const changes: FieldChange[] = [];

  const scalarFields: Array<{ key: keyof RevisionSnapshotData; label: string }> = [
    { key: 'full_name', label: 'Full Name' },
    { key: 'title', label: 'Academic Title' },
    { key: 'current_institution', label: 'Current Institution' },
    { key: 'institutional_role', label: 'Institutional Role' },
    { key: 'biography', label: 'Biography' },
    { key: 'location', label: 'Location' },
    { key: 'timezone', label: 'Timezone' },
    { key: 'doctrinal_statement_text', label: 'Personal Doctrinal Statement' },
    { key: 'orcid_id', label: 'ORCID Identifier' },
    { key: 'google_scholar_url', label: 'Google Scholar Profile URL' },
  ];

  for (const { key, label } of scalarFields) {
    const oldVal = published ? text(published[key]) : null;
    const newVal = text(draft[key]);

    if (oldVal !== newVal) {
      if (oldVal === null && newVal !== null) {
        changes.push({ field: key, label, oldValue: null, newValue: newVal, kind: 'added' });
      } else if (oldVal !== null && newVal === null) {
        changes.push({ field: key, label, oldValue: oldVal, newValue: null, kind: 'removed' });
      } else {
        changes.push({ field: key, label, oldValue: oldVal, newValue: newVal, kind: 'modified' });
      }
    }
  }

  // Taxonomy lists hold slugs. Membership is order-insensitive; the FIRST entry is
  // the primary one, so a changed first entry is a real change on its own.
  for (const [key, label] of [
    ['disciplines', 'Theological Disciplines'],
    ['traditions', 'Theological Traditions'],
  ] as const) {
    const oldList = published?.[key] ?? [];
    const newList = draft[key] ?? [];
    if (canonicalSlugs(oldList) !== canonicalSlugs(newList) || primaryChanged(oldList, newList)) {
      changes.push({
        field: key,
        label,
        oldValue: oldList,
        newValue: newList,
        kind: oldList.length === 0 ? 'added' : newList.length === 0 ? 'removed' : 'modified',
      });
    }
  }

  // Confessions: order-insensitive, keyed by slug; the display name is not content.
  const oldConf = published?.confessions ?? [];
  const newConf = draft.confessions ?? [];
  if (canonicalConfessions(oldConf) !== canonicalConfessions(newConf)) {
    changes.push({
      field: 'confessions',
      label: 'Confessional Standards Affirmed',
      oldValue: oldConf,
      newValue: newConf,
      kind: oldConf.length === 0 ? 'added' : newConf.length === 0 ? 'removed' : 'modified',
    });
  }

  // Credentials and publications: order is display order, so it is part of the comparison,
  // but key order, null versus missing, and blank versus null are not.
  const oldCred = published?.credentials ?? [];
  const newCred = draft.credentials ?? [];
  if (canonicalCredentials(oldCred) !== canonicalCredentials(newCred)) {
    changes.push({
      field: 'credentials',
      label: 'Academic Credentials',
      oldValue: oldCred,
      newValue: newCred,
      kind: oldCred.length === 0 ? 'added' : newCred.length === 0 ? 'removed' : 'modified',
    });
  }

  const oldPub = published?.publications ?? [];
  const newPub = draft.publications ?? [];
  if (canonicalPublications(oldPub) !== canonicalPublications(newPub)) {
    changes.push({
      field: 'publications',
      label: 'Scholarly Publications',
      oldValue: oldPub,
      newValue: newPub,
      kind: oldPub.length === 0 ? 'added' : newPub.length === 0 ? 'removed' : 'modified',
    });
  }

  return {
    hasChanges: changes.length > 0,
    totalChanges: changes.length,
    changes,
  };
}
