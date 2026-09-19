import { describe, it, expect } from 'vitest';
import { computeRevisionDiff } from '@/lib/domain/diff';
import { formatAdherenceLevel, formatOpportunityType, formatDeliveryMode } from '@/lib/domain/taxonomies';
import { RevisionSnapshotData } from '@/lib/domain/types';

describe('Domain Models & Revision Diff Engine (ADR 0005)', () => {
  it('detects zero changes between identical snapshots', () => {
    const published: RevisionSnapshotData = {
      full_name: 'Dr. Calvin Edwards',
      title: 'Professor of Historical Theology',
      biography: 'Specializing in 17th century dogmatics.',
      disciplines: ['church-history'],
      traditions: ['reformed-presbyterian'],
    };

    const draft: RevisionSnapshotData = {
      full_name: 'Dr. Calvin Edwards',
      title: 'Professor of Historical Theology',
      biography: 'Specializing in 17th century dogmatics.',
      disciplines: ['church-history'],
      traditions: ['reformed-presbyterian'],
    };

    const diff = computeRevisionDiff(published, draft);
    expect(diff.hasChanges).toBe(false);
    expect(diff.totalChanges).toBe(0);
    expect(diff.changes).toHaveLength(0);
  });

  it('detects modified fields and newly added doctrinal statement', () => {
    const published: RevisionSnapshotData = {
      full_name: 'Dr. Calvin Edwards',
      title: 'Associate Professor',
      biography: 'Specializing in 17th century dogmatics.',
      disciplines: ['church-history'],
    };

    const draft: RevisionSnapshotData = {
      full_name: 'Dr. Calvin Edwards',
      title: 'Full Professor of Historical Theology',
      biography: 'Specializing in 17th century dogmatics.',
      doctrinal_statement_text: 'I subscribe ex animo to the Westminster Confession.',
      disciplines: ['church-history', 'systematic-theology'],
    };

    const diff = computeRevisionDiff(published, draft);
    expect(diff.hasChanges).toBe(true);
    expect(diff.totalChanges).toBe(3);

    const titleChange = diff.changes.find((c) => c.field === 'title');
    expect(titleChange).toBeDefined();
    expect(titleChange?.kind).toBe('modified');
    expect(titleChange?.oldValue).toBe('Associate Professor');
    expect(titleChange?.newValue).toBe('Full Professor of Historical Theology');

    const statementChange = diff.changes.find((c) => c.field === 'doctrinal_statement_text');
    expect(statementChange).toBeDefined();
    expect(statementChange?.kind).toBe('added');
    expect(statementChange?.oldValue).toBeNull();

    const discChange = diff.changes.find((c) => c.field === 'disciplines');
    expect(discChange).toBeDefined();
    expect(discChange?.kind).toBe('modified');
  });

  it('handles brand new draft revision with no prior published snapshot', () => {
    const draft: RevisionSnapshotData = {
      full_name: 'Dr. Sarah MacArthur',
      title: 'Assistant Professor',
      biography: 'Johannine scholar.',
    };

    const diff = computeRevisionDiff(null, draft);
    expect(diff.hasChanges).toBe(true);
    expect(diff.changes.length).toBeGreaterThan(0);
    expect(diff.changes.every((c) => c.kind === 'added')).toBe(true);
  });
});

describe('Taxonomy Formatting Helpers', () => {
  it('formats historic theological confessional adherence levels correctly', () => {
    expect(formatAdherenceLevel('full_subscription')).toBe('Full Subscription (Ex animo)');
    expect(formatAdherenceLevel('strict_subscription')).toBe('Strict Subscription');
    expect(formatAdherenceLevel('general_agreement')).toBe('General Agreement');
    expect(formatAdherenceLevel('substantial_agreement')).toBe('Substantial Agreement');
    expect(formatAdherenceLevel('with_exceptions')).toBe('Subscription with Exceptions');
  });

  it('formats academic opportunity types and delivery modes cleanly', () => {
    expect(formatOpportunityType('adjunct_teaching')).toBe('Adjunct Teaching');
    expect(formatOpportunityType('intensives_modular')).toBe('Modular Intensives');
    expect(formatDeliveryMode('online_async')).toBe('Online (Asynchronous)');
    expect(formatDeliveryMode('in_person_modular')).toBe('In-Person (Modular Intensive)');
  });
});
