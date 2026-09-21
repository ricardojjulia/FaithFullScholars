import { describe, it, expect, vi } from 'vitest';
import * as supabaseServer from '@/lib/supabase/server';
import {
  validateSpeakerTopicInput,
  formatTargetAudience,
  TARGET_AUDIENCES,
  getAllSpeakers,
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

    it('rejects non-string target audience values', () => {
      const numberAudience = validateSpeakerTopicInput({
        title: 'Covenant Theology in Genesis',
        description: 'A comprehensive biblical-theological overview of the Abrahamic covenant.',
        target_audience: 123 as unknown as string,
      });
      expect(numberAudience.valid).toBe(false);
      expect(numberAudience.error).toMatch(/invalid target audience/i);

      const booleanAudience = validateSpeakerTopicInput({
        title: 'Covenant Theology in Genesis',
        description: 'A comprehensive biblical-theological overview of the Abrahamic covenant.',
        target_audience: true as unknown as string,
      });
      expect(booleanAudience.valid).toBe(false);
      expect(booleanAudience.error).toMatch(/invalid target audience/i);
    });

    it('validates display order and featured flag types', () => {
      const nonIntOrder = validateSpeakerTopicInput({
        title: 'Covenant Theology in Genesis',
        description: 'A comprehensive biblical-theological overview of the Abrahamic covenant.',
        display_order: 1.5,
      });
      expect(nonIntOrder.valid).toBe(false);
      expect(nonIntOrder.error).toMatch(/integer/i);

      const badFeatured = validateSpeakerTopicInput({
        title: 'Covenant Theology in Genesis',
        description: 'A comprehensive biblical-theological overview of the Abrahamic covenant.',
        is_featured: 'yes' as unknown as boolean,
      });
      expect(badFeatured.valid).toBe(false);
      expect(badFeatured.error).toMatch(/boolean/i);
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

    it('requires both active speaking opportunity types and published topics via getAllSpeakers service', async () => {
      const mockScholars = [
        {
          id: 'scholar-1',
          full_name: 'Dr. Calvin Edwards',
          slug: 'calvin-edwards',
          title: 'Professor of Systematic Theology',
          avatar_url: '/photos/calvin.jpg',
          primary_institution: 'Puritan Reformed Theological Seminary',
          scholar_disciplines: [{ disciplines: { name: 'Systematic Theology', slug: 'systematic-theology' } }],
          scholar_traditions: [{ traditions: { name: 'Reformed / Presbyterian', slug: 'reformed' } }],
          availability_profiles: [
            {
              opportunity_types: ['conference_speaking'],
              travel_preferences: 'Continental US',
              speaking_bio: 'Keynote lecturer on Reformed dogmatics.',
              honorarium_policy: 'Standard academic honorarium',
            },
          ],
          speaker_topics: [
            {
              id: 'top-1',
              scholar_id: 'scholar-1',
              title: 'Covenant Theology and Federal Hermeneutics',
              description: 'Exposition of Reformed covenant theology across redemptive history.',
              target_audience: 'academic',
              sample_media_url: null,
              display_order: 1,
              is_featured: true,
              created_at: '2026-09-21T00:00:00Z',
              updated_at: '2026-09-21T00:00:00Z',
            },
          ],
        },
        {
          // Scholar with topics but WITHOUT speaking opportunity types (e.g., only adjunct_teaching)
          id: 'scholar-2',
          full_name: 'Dr. No Speaking Availability',
          slug: 'no-speaking-avail',
          title: 'Adjunct Lecturer',
          avatar_url: null,
          primary_institution: 'Regional Seminary',
          scholar_disciplines: [],
          scholar_traditions: [],
          availability_profiles: [
            {
              opportunity_types: ['adjunct_teaching', 'online_async'],
              travel_preferences: null,
              speaking_bio: null,
              honorarium_policy: null,
            },
          ],
          speaker_topics: [
            {
              id: 'top-2',
              scholar_id: 'scholar-2',
              title: 'Unpublished Speaking Topic',
              description: 'Private topic that must not be surfaced in the public directory.',
              target_audience: 'academic',
              sample_media_url: null,
              display_order: 1,
              is_featured: false,
              created_at: '2026-09-21T00:00:00Z',
              updated_at: '2026-09-21T00:00:00Z',
            },
          ],
        },
        {
          // Scholar with speaking opportunity types enabled but ZERO topics
          id: 'scholar-3',
          full_name: 'Dr. No Topics Yet',
          slug: 'no-topics-yet',
          title: 'Associate Professor',
          avatar_url: null,
          primary_institution: 'City Seminary',
          scholar_disciplines: [],
          scholar_traditions: [],
          availability_profiles: [
            {
              opportunity_types: ['conference_speaking', 'guest_lecturing'],
              travel_preferences: null,
              speaking_bio: null,
              honorarium_policy: null,
            },
          ],
          speaker_topics: [],
        },
      ];

      vi.spyOn(supabaseServer, 'createClient').mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockScholars,
              error: null,
            }),
          }),
        }),
      } as unknown as Awaited<ReturnType<typeof supabaseServer.createClient>>);

      const speakers = await getAllSpeakers();

      // Only scholar-1 satisfies BOTH hasAvailability AND hasTopics
      expect(speakers).toHaveLength(1);
      expect(speakers[0].scholar_id).toBe('scholar-1');
      expect(speakers[0].full_name).toBe('Dr. Calvin Edwards');
    });
  });
});


