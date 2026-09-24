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
    const oldVal = published ? (published[key] as string | undefined | null) ?? null : null;
    const newVal = (draft[key] as string | undefined | null) ?? null;

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

  // Compare array of disciplines
  const oldDisc = published?.disciplines ?? [];
  const newDisc = draft.disciplines ?? [];
  if (JSON.stringify(oldDisc.slice().sort()) !== JSON.stringify(newDisc.slice().sort())) {
    changes.push({
      field: 'disciplines',
      label: 'Theological Disciplines',
      oldValue: oldDisc,
      newValue: newDisc,
      kind: oldDisc.length === 0 ? 'added' : newDisc.length === 0 ? 'removed' : 'modified',
    });
  }

  // Compare array of traditions
  const oldTrad = published?.traditions ?? [];
  const newTrad = draft.traditions ?? [];
  if (JSON.stringify(oldTrad.slice().sort()) !== JSON.stringify(newTrad.slice().sort())) {
    changes.push({
      field: 'traditions',
      label: 'Theological Traditions',
      oldValue: oldTrad,
      newValue: newTrad,
      kind: oldTrad.length === 0 ? 'added' : newTrad.length === 0 ? 'removed' : 'modified',
    });
  }

  // Compare confessions
  const oldConf = published?.confessions ?? [];
  const newConf = draft.confessions ?? [];
  if (JSON.stringify(oldConf) !== JSON.stringify(newConf)) {
    changes.push({
      field: 'confessions',
      label: 'Confessional Standards Affirmed',
      oldValue: oldConf,
      newValue: newConf,
      kind: oldConf.length === 0 ? 'added' : newConf.length === 0 ? 'removed' : 'modified',
    });
  }

  // Compare credentials
  const oldCred = published?.credentials ?? [];
  const newCred = draft.credentials ?? [];
  if (JSON.stringify(oldCred) !== JSON.stringify(newCred)) {
    changes.push({
      field: 'credentials',
      label: 'Academic Credentials',
      oldValue: oldCred,
      newValue: newCred,
      kind: oldCred.length === 0 ? 'added' : newCred.length === 0 ? 'removed' : 'modified',
    });
  }

  // Compare publications
  const oldPub = published?.publications ?? [];
  const newPub = draft.publications ?? [];
  if (JSON.stringify(oldPub) !== JSON.stringify(newPub)) {
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
