import { describe, it, expect } from 'vitest';
import {
  validateRevisionData,
  buildDraftSnapshot,
  inspectDraftDiff
} from '@/lib/profiles/revision-actions';
import { RevisionSnapshotData } from '@/lib/domain/types';

describe('Scholar Dashboard & Revision Staging (Phase 3 & ADR 0005)', () => {
  const publishedBaseline: RevisionSnapshotData = {
    full_name: 'Dr. Benjamin H. Edwards, Ph.D.',
    title: 'Professor of New Testament',
    current_institution: 'Westminster Theological Seminary',
    institutional_role: 'Professor',
    biography: 'Specialist in Pauline studies.',
    location: 'Glenside, PA',
    timezone: 'America/New_York',
    doctrinal_statement_text: 'I subscribe to the Westminster Confession.',
    disciplines: ['New Testament & Early Christianity'],
    traditions: ['Reformed & Presbyterian'],
    confessions: [
      {
        confessional_standard_id: 'standard-westminster',
        confessional_standard_name: 'Westminster Confession of Faith (1646)',
        adherence_level: 'full_subscription'
      }
    ],
    credentials: [
      {
        degree: 'Ph.D.',
        field_of_study: 'New Testament',
        institution_name: 'Cambridge',
        year_awarded: 2018,
        is_terminal: true
      }
    ],
    publications: [
      {
        title: 'The Gospel According to Paul',
        publication_type: 'book',
        year: 2021,
        citation_text: 'Baker Academic, 2021'
      }
    ]
  };

  it('validates revision data bounds correctly', () => {
    const invalidShort = validateRevisionData({ full_name: 'A' });
    expect(invalidShort.valid).toBe(false);
    expect(invalidShort.errors).toContain('Full name must be at least 2 characters long.');

    const invalidLong = validateRevisionData({ full_name: 'A'.repeat(105) });
    expect(invalidLong.valid).toBe(false);
    expect(invalidLong.errors).toContain('Full name cannot exceed 100 characters.');

    const valid = validateRevisionData({ full_name: 'Dr. John Frame' });
    expect(valid.valid).toBe(true);
    expect(valid.errors).toHaveLength(0);
  });

  it('correctly merges updates onto existing snapshot without mutating baseline', () => {
    const updated = buildDraftSnapshot(publishedBaseline, {
      title: 'Distinguished Professor of New Testament',
      location: 'Philadelphia, PA'
    });

    expect(updated.full_name).toBe(publishedBaseline.full_name);
    expect(updated.title).toBe('Distinguished Professor of New Testament');
    expect(updated.location).toBe('Philadelphia, PA');
    expect(publishedBaseline.title).toBe('Professor of New Testament'); // immutable
  });

  it('computes structured field-level diffs between published snapshot and draft revision', () => {
    const draftSnapshot = buildDraftSnapshot(publishedBaseline, {
      title: 'Distinguished Research Professor of New Testament',
      doctrinal_statement_text: 'Expanded statement on biblical inerrancy.',
      disciplines: ['New Testament & Early Christianity', 'Biblical Languages']
    });

    const diff = inspectDraftDiff(publishedBaseline, draftSnapshot);
    expect(diff.hasChanges).toBe(true);
    expect(diff.totalChanges).toBe(3);

    const titleChange = diff.changes.find((c) => c.field === 'title');
    expect(titleChange?.kind).toBe('modified');
    expect(titleChange?.oldValue).toBe('Professor of New Testament');
    expect(titleChange?.newValue).toBe('Distinguished Research Professor of New Testament');

    const discChange = diff.changes.find((c) => c.field === 'disciplines');
    expect(discChange?.kind).toBe('modified');
  });

  it('reports zero diff when draft matches published baseline', () => {
    const identicalDraft = buildDraftSnapshot(publishedBaseline, {});
    const diff = inspectDraftDiff(publishedBaseline, identicalDraft);
    expect(diff.hasChanges).toBe(false);
    expect(diff.totalChanges).toBe(0);
  });
});
