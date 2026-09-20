import { describe, it, expect } from 'vitest';
import { generateScholarAnalytics } from '@/lib/analytics/scholar-analytics';
import { RevisionSnapshotData } from '@/lib/domain/types';

describe('Scholar Profile Analytics Engine (Feature 2)', () => {
  it('computes baseline analytics metrics when given empty or minimal profile', () => {
    const analytics = generateScholarAnalytics();

    expect(analytics.overview.searchImpressions).toBeGreaterThan(0);
    expect(analytics.overview.profileViews).toBeGreaterThan(0);
    expect(analytics.overview.syllabusDownloads).toBeGreaterThan(0);
    expect(analytics.overview.inquiriesCount).toBe(4);

    expect(analytics.weeklyTimeline).toHaveLength(8);
    expect(analytics.topSearchKeywords.length).toBeGreaterThanOrEqual(3);
    expect(analytics.traditionDistribution.length).toBeGreaterThan(0);
    expect(analytics.institutionVisitorTypes.length).toBeGreaterThan(0);
    expect(analytics.actionableTips.length).toBeGreaterThan(0);
  });

  it('adapts search keywords and traditions to specific scholar profile metadata', () => {
    const profile: Partial<RevisionSnapshotData> = {
      full_name: 'Dr. John Owen',
      disciplines: ['Puritan & Reformation Studies'],
      traditions: ['Reformed & Presbyterian'],
      confessions: [
        {
          confessional_standard_id: 'standard-wcf',
          confessional_standard_name: 'Westminster Confession of Faith (1647)',
          adherence_level: 'full_subscription'
        }
      ],
      credentials: [
        {
          degree: 'D.Phil.',
          field_of_study: 'Theology',
          institution_name: 'University of Oxford',
          year_awarded: 2015,
          is_terminal: true
        }
      ],
      publications: [
        {
          title: 'The Death of Death in the Death of Christ',
          publication_type: 'book',
          year: 2020
        },
        {
          title: 'Communion with the Triune God',
          publication_type: 'book',
          year: 2022
        }
      ]
    };

    const analytics = generateScholarAnalytics(profile, 7);

    // Live inquiry count forwarded
    expect(analytics.overview.inquiriesCount).toBe(7);

    // Custom keywords include scholar's discipline, confession, and Oxford D.Phil
    const keywordNames = analytics.topSearchKeywords.map(k => k.keyword);
    expect(keywordNames).toContain('Puritan & Reformation Studies');
    expect(keywordNames).toContain('Westminster Confession of Faith (1647)');
    expect(keywordNames).toContain('D.Phil. University of Oxford');

    // Primary tradition is first in tradition distribution
    expect(analytics.traditionDistribution[0].tradition).toBe('Reformed & Presbyterian');

    // Publications increase visibility metrics
    expect(analytics.overview.syllabusDownloads).toBeGreaterThan(40);
  });

  it('guarantees weekly timeline points are non-negative and properly structured', () => {
    const analytics = generateScholarAnalytics();

    for (const point of analytics.weeklyTimeline) {
      expect(point.impressions).toBeGreaterThanOrEqual(0);
      expect(point.profileViews).toBeGreaterThanOrEqual(0);
      expect(point.syllabusDownloads).toBeGreaterThanOrEqual(0);
      expect(typeof point.week).toBe('string');
    }
  });

  it('provides actionable optimization tips with links to faculty workspace areas', () => {
    const analytics = generateScholarAnalytics();
    
    expect(analytics.actionableTips.some(t => t.actionHref.includes('/dashboard/courses'))).toBe(true);
    expect(analytics.actionableTips.some(t => t.actionHref.includes('/dashboard/availability'))).toBe(true);
    expect(analytics.actionableTips.some(t => t.actionHref.includes('/dashboard/profile'))).toBe(true);
  });
});
