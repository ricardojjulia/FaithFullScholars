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
});
