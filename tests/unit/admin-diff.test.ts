import { describe, it, expect } from 'vitest';
import { computeRevisionDiff } from '@/lib/domain/diff';
import { RevisionSnapshotData } from '@/lib/domain/types';

describe('Admin Revision Diff Calculation (ADR 0003 & ADR 0005)', () => {
  it('computes diff when baseline is null (initial brand-new profile submission)', () => {
    const draft: RevisionSnapshotData = {
      full_name: 'Dr. Gregory Beale, Ph.D.',
      title: 'Professor of Biblical Theology',
      current_institution: 'Reformed Theological Seminary',
      credentials: [
        {
          degree: 'Ph.D.',
          field_of_study: 'New Testament',
          institution_name: 'University of Cambridge',
          year_awarded: 1985,
          is_terminal: true,
        },
      ],
      publications: [
        {
          title: 'The Book of Revelation: A Commentary on the Greek Text',
          publication_type: 'book',
          year: 1998,
        },
      ],
    };

    const diff = computeRevisionDiff(null, draft);
    expect(diff.hasChanges).toBe(true);
    expect(diff.totalChanges).toBeGreaterThanOrEqual(4);

    const credChange = diff.changes.find((c) => c.field === 'credentials');
    expect(credChange).toBeDefined();
    expect(credChange?.kind).toBe('added');

    const pubChange = diff.changes.find((c) => c.field === 'publications');
    expect(pubChange).toBeDefined();
    expect(pubChange?.kind).toBe('added');
  });

  it('detects credential and publication additions and modifications against published baseline', () => {
    const published: RevisionSnapshotData = {
      full_name: 'Dr. Gregory Beale, Ph.D.',
      title: 'Professor of New Testament',
      current_institution: 'Westminster Theological Seminary',
      credentials: [
        {
          degree: 'Th.M.',
          field_of_study: 'Theology',
          institution_name: 'Dallas Theological Seminary',
          year_awarded: 1976,
          is_terminal: false,
        },
      ],
      publications: [
        {
          title: 'Early Monograph',
          publication_type: 'monograph',
          year: 1990,
        },
      ],
    };

    const draft: RevisionSnapshotData = {
      full_name: 'Dr. Gregory Beale, Ph.D.',
      title: 'Distinguished Professor of New Testament',
      current_institution: 'Reformed Theological Seminary',
      credentials: [
        {
          degree: 'Th.M.',
          field_of_study: 'Theology',
          institution_name: 'Dallas Theological Seminary',
          year_awarded: 1976,
          is_terminal: false,
        },
        {
          degree: 'Ph.D.',
          field_of_study: 'New Testament',
          institution_name: 'University of Cambridge',
          year_awarded: 1985,
          is_terminal: true,
        },
      ],
      publications: [
        {
          title: 'Early Monograph',
          publication_type: 'monograph',
          year: 1990,
        },
        {
          title: 'A New Testament Biblical Theology',
          publication_type: 'book',
          year: 2011,
        },
      ],
    };

    const diff = computeRevisionDiff(published, draft);
    expect(diff.hasChanges).toBe(true);

    const titleChange = diff.changes.find((c) => c.field === 'title');
    expect(titleChange?.kind).toBe('modified');
    expect(titleChange?.oldValue).toBe('Professor of New Testament');
    expect(titleChange?.newValue).toBe('Distinguished Professor of New Testament');

    const credChange = diff.changes.find((c) => c.field === 'credentials');
    expect(credChange?.kind).toBe('modified');
    expect(Array.isArray(credChange?.newValue)).toBe(true);
    expect((credChange?.newValue as unknown[]).length).toBe(2);

    const pubChange = diff.changes.find((c) => c.field === 'publications');
    expect(pubChange?.kind).toBe('modified');
    expect(Array.isArray(pubChange?.newValue)).toBe(true);
    expect((pubChange?.newValue as unknown[]).length).toBe(2);
  });
});
