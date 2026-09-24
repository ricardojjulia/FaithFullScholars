import { describe, it, expect } from 'vitest';
import { validateMediaUrl, formatMediaDuration } from '@/lib/media/showcase-service';

describe('Media Showcase Service (ADR 0014)', () => {
  describe('validateMediaUrl - YouTube', () => {
    it('accepts standard YouTube watch URL and generates embed and thumbnail', () => {
      const res = validateMediaUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube_video');
      expect(res.valid).toBe(true);
      expect(res.provider).toBe('youtube');
      expect(res.videoId).toBe('dQw4w9WgXcQ');
      expect(res.embedUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
      expect(res.thumbnailUrl).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
    });

    it('accepts short youtu.be URL', () => {
      const res = validateMediaUrl('https://youtu.be/dQw4w9WgXcQ', 'youtube_video');
      expect(res.valid).toBe(true);
      expect(res.videoId).toBe('dQw4w9WgXcQ');
      expect(res.embedUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    });

    it('accepts YouTube playlist URL', () => {
      const res = validateMediaUrl(
        'https://www.youtube.com/playlist?list=PL1234567890ABCDEF',
        'youtube_playlist'
      );
      expect(res.valid).toBe(true);
      expect(res.provider).toBe('youtube');
      expect(res.embedUrl).toContain('videoseries?list=PL1234567890ABCDEF');
    });

    it('rejects invalid YouTube URL', () => {
      const res = validateMediaUrl('https://youtube.com/invalid-path', 'youtube_video');
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe('validateMediaUrl - Vimeo', () => {
    it('accepts standard Vimeo video URL', () => {
      const res = validateMediaUrl('https://vimeo.com/123456789', 'vimeo_video');
      expect(res.valid).toBe(true);
      expect(res.provider).toBe('vimeo');
      expect(res.videoId).toBe('123456789');
      expect(res.embedUrl).toBe('https://player.vimeo.com/video/123456789?dnt=1');
    });

    it('rejects Vimeo URL without numeric ID', () => {
      const res = validateMediaUrl('https://vimeo.com/channels/staffpicks', 'vimeo_video');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('numeric video ID');
    });
  });

  describe('validateMediaUrl - Podcasts (Spotify & SoundCloud)', () => {
    it('accepts Spotify episode URL', () => {
      const res = validateMediaUrl(
        'https://open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk',
        'podcast'
      );
      expect(res.valid).toBe(true);
      expect(res.provider).toBe('spotify');
      expect(res.embedUrl).toBe(
        'https://open.spotify.com/embed/episode/4rOoJ6Egrf8K2IrywzwOMk'
      );
    });

    it('accepts SoundCloud lecture URL', () => {
      const res = validateMediaUrl(
        'https://soundcloud.com/theology-institute/reformed-dogmatics-lecture-1',
        'podcast'
      );
      expect(res.valid).toBe(true);
      expect(res.provider).toBe('soundcloud');
      expect(res.embedUrl).toContain('soundcloud.com/player');
    });
  });

  describe('validateMediaUrl - Protocol & Malformed URLs', () => {
    it('rejects non-HTTP/HTTPS URLs', () => {
      const res = validateMediaUrl('javascript:alert(1)', 'article_link');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('protocol');
    });

    it('rejects gibberish URLs', () => {
      const res = validateMediaUrl('not-a-valid-url', 'article_link');
      expect(res.valid).toBe(false);
    });
  });

  describe('formatMediaDuration', () => {
    it('formats seconds to mm:ss', () => {
      expect(formatMediaDuration(125)).toBe('2:05');
      expect(formatMediaDuration(59)).toBe('0:59');
    });

    it('formats seconds to hh:mm:ss when over an hour', () => {
      expect(formatMediaDuration(3665)).toBe('1:01:05');
    });

    it('returns empty string for zero or negative values', () => {
      expect(formatMediaDuration(0)).toBe('');
      expect(formatMediaDuration(null)).toBe('');
      expect(formatMediaDuration(-10)).toBe('');
    });
  });
});
