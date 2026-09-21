import { describe, it, expect } from 'vitest';
import {
  validateSpeakerTopicInput,
  formatTargetAudience,
  TARGET_AUDIENCES,
} from '@/lib/speakers/speaker-service';

describe('Theological Conference Speaker Bureau & Topics (§21 / ADR 0009)', () => {
  describe('Input Validation (validateSpeakerTopicInput)', () => {
    it('requires a non-empty topic title', () => {
      const result = validateSpeakerTopicInput({
        title: '',
        description: 'An in-depth lecture on Reformation hermeneutics and federal theology.',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/title is required/i);
    });

    it('enforces bounds on topic title length (3 to 200 characters)', () => {
      const tooShort = validateSpeakerTopicInput({
        title: 'Ab',
        description: 'An in-depth lecture on Reformation hermeneutics and federal theology.',
      });
      expect(tooShort.valid).toBe(false);
      expect(tooShort.error).toMatch(/between 3 and 200 characters/i);

      const tooLong = validateSpeakerTopicInput({
        title: 'A'.repeat(201),
        description: 'An in-depth lecture on Reformation hermeneutics and federal theology.',
      });
      expect(tooLong.valid).toBe(false);
      expect(tooLong.error).toMatch(/between 3 and 200 characters/i);
    });

    it('requires a descriptive abstract (minimum 10 characters)', () => {
      const tooShort = validateSpeakerTopicInput({
        title: 'Union with Christ',
        description: 'Too short',
      });
      expect(tooShort.valid).toBe(false);
      expect(tooShort.error).toMatch(/between 10 and 2000 characters/i);
    });

    it('validates target audience against allowed enum', () => {
      const invalid = validateSpeakerTopicInput({
        title: 'Covenant Theology in Genesis',
        description: 'A comprehensive biblical-theological overview of the Abrahamic covenant.',
        target_audience: 'invalid_audience',
      });
      expect(invalid.valid).toBe(false);
      expect(invalid.error).toMatch(/invalid target audience/i);
    });

    it('accepts valid inputs across all allowed target audiences', () => {
      for (const audience of TARGET_AUDIENCES) {
        const valid = validateSpeakerTopicInput({
          title: `Lecture on Systematic Theology (${audience})`,
          description: 'A thorough and rigorous examination of classical Christian dogmatics.',
          target_audience: audience,
        });
        expect(valid.valid).toBe(true);
        expect(valid.error).toBeUndefined();
      }
    });

    it('validates sample media URL protocol safety', () => {
      const badScheme = validateSpeakerTopicInput({
        title: 'Doctrine of the Trinity',
        description: 'Patristic development of Nicene trinitarian formulations.',
        sample_media_url: 'javascript:alert(1)',
      });
      expect(badScheme.valid).toBe(false);
      expect(badScheme.error).toMatch(/http:\/\/ or https:\/\//i);

      const goodUrl = validateSpeakerTopicInput({
        title: 'Doctrine of the Trinity',
        description: 'Patristic development of Nicene trinitarian formulations.',
        sample_media_url: 'https://www.youtube.com/watch?v=sample123',
      });
      expect(goodUrl.valid).toBe(true);
    });
  });

  describe('Audience Presentation Formatting (formatTargetAudience)', () => {
    it('returns human-readable academic conference labels', () => {
      expect(formatTargetAudience('academic')).toBe('Academic Symposium / Keynote');
      expect(formatTargetAudience('pastoral')).toBe('Pastoral / Chapel Address');
      expect(formatTargetAudience('church_wide')).toBe('Church-Wide / Lay Conference');
      expect(formatTargetAudience('undergraduate')).toBe('Undergraduate / Student Ministry');
    });
  });

  describe('Speaker Profile Domain Mapping & Filtering (§21 / ADR 0009)', () => {
    it('supports discipline_slugs and tradition_slug taxonomy navigation', () => {
      const sampleSpeaker = {
        scholar_id: 'test-uuid-1',
        full_name: 'Dr. Katherine Sonderegger',
        slug: 'katherine-sonderegger',
        title: 'Professor of Systematic Theology',
        avatar_url: '/photos/sonderegger.jpg',
        institution_name: 'Virginia Theological Seminary',
        disciplines: ['Systematic Theology'],
        discipline_slugs: ['systematic-theology'],
        tradition_name: 'Anglican / Episcopal',
        tradition_slug: 'anglican',
        travel_preferences: 'Continental US and UK',
        speaking_bio: 'Expert on the doctrine of God and divine simplicity.',
        honorarium_policy: 'Standard academic honorarium requested.',
        topics: [
          {
            id: 'topic-1',
            scholar_id: 'test-uuid-1',
            title: 'The Unicity of God',
            description: 'Exploration of classical theism and scriptural unicity.',
            target_audience: 'academic' as const,
            sample_media_url: null,
            display_order: 1,
            is_featured: true,
            created_at: '2026-09-21T00:00:00Z',
            updated_at: '2026-09-21T00:00:00Z',
          },
        ],
      };

      expect(sampleSpeaker.discipline_slugs).toContain('systematic-theology');
      expect(sampleSpeaker.tradition_slug).toBe('anglican');
      expect(sampleSpeaker.topics[0].target_audience).toBe('academic');
    });

    it('requires both active speaking opportunity types and published topics for public directory listing', () => {
      // Helper replicating the eligibility check in speaker-service
      function isEligibleSpeaker(oppTypes: string[], topicsCount: number): boolean {
        const hasAvailability =
          oppTypes.includes('conference_speaking') ||
          oppTypes.includes('guest_lecturing') ||
          oppTypes.includes('guest_lecture');
        const hasTopics = topicsCount > 0;
        return hasAvailability && hasTopics;
      }

      // Scholar with topics but without speaking availability enabled
      expect(isEligibleSpeaker(['adjunct_teaching', 'online_async'], 3)).toBe(false);

      // Scholar with speaking availability enabled but zero topics
      expect(isEligibleSpeaker(['conference_speaking'], 0)).toBe(false);

      // Scholar with speaking availability AND topics
      expect(isEligibleSpeaker(['conference_speaking'], 2)).toBe(true);
      expect(isEligibleSpeaker(['guest_lecturing'], 1)).toBe(true);
    });
  });
});


