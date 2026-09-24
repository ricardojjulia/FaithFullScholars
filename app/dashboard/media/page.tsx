'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Video,
  Plus,
  Trash2,
  ExternalLink,
  Sparkles,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react';
import { MediaType, MediaLink } from '@/lib/domain/types';
import { validateMediaUrl, formatMediaDuration } from '@/lib/media/showcase-service';

export default function MediaManagerPage() {
  const [mediaList, setMediaList] = useState<MediaLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New item form state
  const [isAdding, setIsAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('youtube_video');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  // Live validation feedback
  const urlValidation = url ? validateMediaUrl(url, mediaType) : null;

  useEffect(() => {
    let active = true;
    fetch('/api/scholars/media')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then((data) => {
        if (active) {
          setMediaList(data.mediaLinks || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError('Network error loading media showcase');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleAddMedia(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    if (urlValidation && !urlValidation.valid) {
      setError(urlValidation.error || 'Please provide a valid media URL');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/scholars/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          media_type: mediaType,
          url: url.trim(),
          description: description.trim() || null,
          is_featured: isFeatured,
          duration_seconds: durationSeconds ? parseInt(durationSeconds, 10) : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMediaList((prev) => [...prev, data.mediaLink]);
        setSuccess('Media item added to your public showcase.');
        setTitle('');
        setUrl('');
        setDescription('');
        setDurationSeconds('');
        setIsFeatured(false);
        setIsAdding(false);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to add media link');
      }
    } catch {
      setError('An error occurred while saving.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to remove this media link?')) return;

    try {
      const res = await fetch(`/api/scholars/media/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMediaList((prev) => prev.filter((m) => m.id !== id));
        setSuccess('Media item removed.');
      } else {
        setError('Failed to delete media item.');
      }
    } catch {
      setError('Network error deleting media item.');
    }
  }

  async function handleToggleFeatured(item: MediaLink) {
    try {
      const res = await fetch(`/api/scholars/media/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: !item.is_featured }),
      });

      if (res.ok) {
        const data = await res.json();
        setMediaList((prev) =>
          prev.map((m) => (m.id === item.id ? data.mediaLink : m))
        );
      }
    } catch {
      setError('Failed to update featured status.');
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb & Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Faculty Dashboard</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="card-crisp p-6 sm:p-8 mb-8 bg-gradient-to-br from-indigo-950/10 via-transparent to-transparent border-indigo-100 dark:border-indigo-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
              <Video className="w-3 h-3" />
              <span>Teaching Portfolio</span>
            </div>
            <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-white">
              Media & Lecture Showcase
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              Curate high-impact audio, video, podcast lectures, and conference presentations to exhibit your homiletic and pedagogical delivery to hiring search committees.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-900 hover:bg-indigo-800 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{isAdding ? 'Cancel' : 'Add Media / Lecture'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-200 border border-red-200 dark:border-red-900 flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2 text-xs">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Add New Media Form Modal/Accordion */}
      {isAdding && (
        <form
          onSubmit={handleAddMedia}
          className="card-crisp p-6 mb-8 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 space-y-4"
        >
          <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
            Add New Media Item
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Lecture / Episode Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. The Covenant of Works in Reformed Dogmatics"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Media Format *
              </label>
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as MediaType)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="youtube_video">YouTube Video</option>
                <option value="youtube_playlist">YouTube Course Playlist</option>
                <option value="vimeo_video">Vimeo Video</option>
                <option value="podcast">Podcast Episode (Spotify / SoundCloud / RSS)</option>
                <option value="audio_lecture">Audio Lecture File</option>
                <option value="article_link">Academic Article / Essay Link</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Media URL *
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g. https://www.youtube.com/watch?v=... or https://open.spotify.com/episode/..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
            {urlValidation && (
              <p
                className={`mt-1 text-[11px] ${
                  urlValidation.valid ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {urlValidation.valid
                  ? `✓ Valid ${urlValidation.provider || ''} URL recognized.`
                  : `⚠ ${urlValidation.error}`}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Context / Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Delivered at the 2025 Annual Seminary Symposium on Covenant Theology..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Duration (in Seconds, Optional)
              </label>
              <input
                type="number"
                min="0"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(e.target.value)}
                placeholder="e.g. 2700 (for 45 mins)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="pt-4">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Pin as Featured Showcase Lecture
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-xs rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (urlValidation ? !urlValidation.valid : false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-900 text-white hover:bg-indigo-800 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Media Link'}
            </button>
          </div>
        </form>
      )}

      {/* Media Items List */}
      {loading ? (
        <div className="text-center py-12 text-xs text-slate-500">
          Loading your media showcase...
        </div>
      ) : mediaList.length === 0 ? (
        <div className="card-crisp p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 mx-auto flex items-center justify-center text-indigo-700 dark:text-indigo-400">
            <Video className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
            No Media Links Added Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Adding sample lectures, sermon recordings, and podcast discussions helps prospective deans and provosts evaluate your classroom presentation and theological clarity.
          </p>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-900 text-white hover:bg-indigo-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add First Lecture</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mediaList.map((item) => {
            const duration = formatMediaDuration(item.duration_seconds);

            return (
              <div
                key={item.id}
                className={`card-crisp p-4 flex flex-col justify-between ${
                  item.is_featured ? 'border-amber-300 dark:border-amber-700/80 bg-amber-50/20' : ''
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {item.media_type.replace('_', ' ')}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleFeatured(item)}
                      title={item.is_featured ? 'Unpin from featured' : 'Pin as featured'}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                        item.is_featured
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300'
                          : 'text-slate-400 hover:text-amber-600'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{item.is_featured ? 'Featured' : 'Make Featured'}</span>
                    </button>
                  </div>

                  <h3 className="font-display font-semibold text-sm text-slate-900 dark:text-white line-clamp-2">
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {duration && (
                    <div className="mt-2 text-[10px] font-mono text-slate-500">
                      Duration: {duration}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <span>Inspect Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="text-slate-400 hover:text-red-600 transition-colors p-1"
                    title="Delete media link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
