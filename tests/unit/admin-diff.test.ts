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

describe('Canonical list comparison against a live baseline (ADR 0025)', () => {
  const live: RevisionSnapshotData = {
    full_name: 'Dr. A',
    biography: null,
    credentials: [
      { degree: 'Ph.D.', field_of_study: 'NT', institution_name: 'Edinburgh', year_awarded: 2005, is_terminal: true },
    ],
    publications: [
      { title: 'Book', publication_type: 'book', publisher_or_journal: null, year: 2018, doi_or_url: null, citation_text: null },
    ],
    confessions: [{ confessional_standard_id: 'westminster-confession', adherence_level: 'full_subscription', exception_notes: null }],
    disciplines: ['systematic-theology', 'church-history'],
    traditions: ['baptist'],
  };

  it('shows no phantom changes for key order, null versus missing, blank versus null, or the legacy display name', () => {
    const draft: RevisionSnapshotData = {
      full_name: 'Dr. A',
      biography: '',
      credentials: [
        { is_terminal: true, institution_name: 'Edinburgh', field_of_study: 'NT', degree: 'Ph.D.', year_awarded: 2005 },
      ],
      publications: [{ title: 'Book', publication_type: 'book', year: 2018 }],
      confessions: [
        {
          confessional_standard_id: 'westminster-confession',
          confessional_standard_name: 'Westminster',
          adherence_level: 'full_subscription',
        },
      ],
      disciplines: ['systematic-theology', 'church-history'],
      traditions: ['baptist'],
    };
    expect(computeRevisionDiff(live, draft)).toMatchObject({ hasChanges: false, totalChanges: 0 });
  });

  it('treats a reordered confession list as unchanged but a reordered credential list as a change', () => {
    const twoConf = [
      { confessional_standard_id: 'a', adherence_level: 'full_subscription' as const },
      { confessional_standard_id: 'b', adherence_level: 'general_agreement' as const },
    ];
    expect(
      computeRevisionDiff({ full_name: 'x', confessions: twoConf }, { full_name: 'x', confessions: [...twoConf].reverse() }).hasChanges
    ).toBe(false);
    const creds = [
      { degree: 'M.Div.', field_of_study: 'Div', institution_name: 'A', is_terminal: false },
      { degree: 'Ph.D.', field_of_study: 'NT', institution_name: 'B', is_terminal: true },
    ];
    const diff = computeRevisionDiff({ full_name: 'x', credentials: creds }, { full_name: 'x', credentials: [...creds].reverse() });
    expect(diff.changes.map((c) => c.field)).toEqual(['credentials']);
  });

  it('reports a changed primary discipline or tradition even when the set is unchanged', () => {
    const diff = computeRevisionDiff(live, { ...live, disciplines: ['church-history', 'systematic-theology'] });
    expect(diff.changes.map((c) => c.field)).toEqual(['disciplines']);
    expect(diff.changes[0].kind).toBe('modified');
    const same = computeRevisionDiff(live, { ...live, traditions: ['Baptist'.toLowerCase()] });
    expect(same.hasChanges).toBe(false);
  });

  it('reports added, removed and modified list entries', () => {
    expect(computeRevisionDiff(live, { ...live, traditions: [] }).changes[0]).toMatchObject({ field: 'traditions', kind: 'removed' });
    expect(computeRevisionDiff(live, { ...live, traditions: ['baptist', 'lutheran'] }).changes[0]).toMatchObject({
      field: 'traditions',
      kind: 'modified',
    });
    expect(computeRevisionDiff({ ...live, publications: [] }, live).changes[0]).toMatchObject({ field: 'publications', kind: 'added' });
  });
});
