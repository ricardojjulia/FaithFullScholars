'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Play, Video, Headphones, FileText, ExternalLink, Sparkles } from 'lucide-react';
import { MediaLink } from '@/lib/domain/types';
import { validateMediaUrl, formatMediaDuration } from '@/lib/media/showcase-service';

interface ScholarMediaShowcaseProps {
  mediaLinks: MediaLink[];
  scholarName: string;
}

export function ScholarMediaShowcase({ mediaLinks, scholarName }: ScholarMediaShowcaseProps) {
  const [activeEmbedId, setActiveEmbedId] = useState<string | null>(null);

  if (!mediaLinks || mediaLinks.length === 0) {
    return null;
  }

  // Separate featured items from standard items
  const featured = mediaLinks.filter((m) => m.is_featured);
  const remaining = mediaLinks.filter((m) => !m.is_featured);
  const sorted = [...featured, ...remaining];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-400">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              Media & Lecture Showcase
            </h2>
            <p className="text-xs text-slate-500">
              Sample lectures, homilies, conference discussions, and podcasts by {scholarName}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.map((item) => {
          const validation = validateMediaUrl(item.url, item.media_type);
          const isEmbedActive = activeEmbedId === item.id;
          const duration = formatMediaDuration(item.duration_seconds);

          return (
            <div
              key={item.id}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                item.is_featured
                  ? 'border-amber-300 dark:border-amber-700/80 bg-gradient-to-b from-amber-50/30 to-white dark:from-amber-950/20 dark:to-slate-900 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs'
              }`}
            >
              <div>
                {/* Media Container (Responsive Facade with Zero CLS) */}
                {validation.embedUrl ? (
                  <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                    {isEmbedActive ? (
                      <iframe
                        src={validation.embedUrl}
                        title={item.title}
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    ) : (
                      <div
                        onClick={() => setActiveEmbedId(item.id)}
                        className="group relative w-full h-full cursor-pointer flex items-center justify-center bg-slate-900"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setActiveEmbedId(item.id);
                          }
                        }}
                        aria-label={`Play lecture: ${item.title}`}
                      >
                        {/* High resolution thumbnail if available */}
                        {validation.thumbnailUrl ? (
                          <Image
                            src={validation.thumbnailUrl}
                            alt=""
                            fill
                            unoptimized
                            className="object-cover opacity-80 group-hover:opacity-95 transition-opacity"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 opacity-90" />
                        )}

                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />

                        {/* Centered Play Button Facade */}
                        <div className="relative w-14 h-14 rounded-full bg-indigo-600/90 hover:bg-indigo-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all duration-200">
                          <Play className="w-6 h-6 fill-white ml-1" />
                        </div>

                        {/* Top pill badges */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          {item.is_featured && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/90 text-white backdrop-blur-xs">
                              <Sparkles className="w-3 h-3" />
                              Featured Lecture
                            </span>
                          )}
                        </div>

                        {/* Bottom duration indicator */}
                        {duration && (
                          <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-mono">
                            {duration}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.media_type === 'podcast' || item.media_type === 'audio_lecture' ? (
                        <Headphones className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      )}
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">
                        {item.media_type.replace('_', ' ')}
                      </span>
                    </div>
                    {item.is_featured && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200">
                        <Sparkles className="w-3 h-3" />
                        Featured
                      </span>
                    )}
                  </div>
                )}

                {/* Details */}
                <div className="p-4">
                  <h3 className="font-display font-semibold text-sm text-slate-900 dark:text-white line-clamp-2">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-4 pt-0">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Open in original source
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
