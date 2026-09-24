/**
 * ==============================================================================
 * FaithFull Scholars — Media Showcase Service (Phase 13 / ADR 0014)
 * Sanitization, safe embed URL extraction, and thumbnail resolution for
 * theological lectures, sermons, conference debates, and scholarly podcasts.
 * ==============================================================================
 */

import { MediaType } from '@/lib/domain/types';

export interface MediaValidationResult {
  valid: boolean;
  provider?: 'youtube' | 'vimeo' | 'spotify' | 'soundcloud' | 'audio' | 'article' | 'podcast';
  embedUrl?: string | null;
  thumbnailUrl?: string | null;
  videoId?: string;
  error?: string;
}

const YOUTUBE_REGEX =
  /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const YOUTUBE_PLAYLIST_REGEX =
  /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/;
const VIMEO_REGEX =
  /^(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/;
const SPOTIFY_REGEX =
  /^https?:\/\/open\.spotify\.com\/(episode|show|track)\/([a-zA-Z0-9]+)/;
const SOUNDCLOUD_REGEX =
  /^https?:\/\/(?:www\.)?soundcloud\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/;

/**
 * Validates and extracts embedding metadata from an external media link.
 */
export function validateMediaUrl(url: string, mediaType: MediaType): MediaValidationResult {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  const trimmed = url.trim();

  // Basic URL shape check
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'URL must use HTTP or HTTPS protocol' };
    }
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Type-specific validation
  if (mediaType === 'youtube_video') {
    const match = trimmed.match(YOUTUBE_REGEX);
    if (!match) {
      return { valid: false, error: 'Invalid YouTube video URL. Must be a valid youtube.com or youtu.be link.' };
    }
    const videoId = match[1];
    return {
      valid: true,
      provider: 'youtube',
      videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }

  if (mediaType === 'youtube_playlist') {
    const match = trimmed.match(YOUTUBE_PLAYLIST_REGEX);
    if (!match) {
      return { valid: false, error: 'Invalid YouTube playlist URL.' };
    }
    const playlistId = match[1];
    return {
      valid: true,
      provider: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}`,
      thumbnailUrl: null,
    };
  }

  if (mediaType === 'vimeo_video') {
    const match = trimmed.match(VIMEO_REGEX);
    if (!match) {
      return { valid: false, error: 'Invalid Vimeo video URL. Must contain a numeric video ID.' };
    }
    const videoId = match[1];
    return {
      valid: true,
      provider: 'vimeo',
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}?dnt=1`,
      thumbnailUrl: null,
    };
  }

  if (mediaType === 'podcast') {
    if (SPOTIFY_REGEX.test(trimmed)) {
      const match = trimmed.match(SPOTIFY_REGEX)!;
      return {
        valid: true,
        provider: 'spotify',
        embedUrl: `https://open.spotify.com/embed/${match[1]}/${match[2]}`,
        thumbnailUrl: null,
      };
    }
    if (SOUNDCLOUD_REGEX.test(trimmed)) {
      return {
        valid: true,
        provider: 'soundcloud',
        embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(trimmed)}&color=%231e3a8a&auto_play=false&hide_related=true`,
        thumbnailUrl: null,
      };
    }
    // Apple Podcasts or generic podcast URL
    return {
      valid: true,
      provider: 'podcast',
      embedUrl: null,
      thumbnailUrl: null,
    };
  }

  if (mediaType === 'audio_lecture') {
    return {
      valid: true,
      provider: 'audio',
      embedUrl: null,
      thumbnailUrl: null,
    };
  }

  if (mediaType === 'article_link') {
    return {
      valid: true,
      provider: 'article',
      embedUrl: null,
      thumbnailUrl: null,
    };
  }

  return { valid: false, error: `Unsupported media type: ${mediaType}` };
}

/**
 * Formats duration in seconds to mm:ss or hh:mm:ss.
 */
export function formatMediaDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
