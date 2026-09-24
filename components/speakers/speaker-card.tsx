'use client';

import Link from 'next/link';
import { Mic, MapPin, Building, Award, Calendar, ExternalLink } from 'lucide-react';
import { SpeakerProfile, formatTargetAudience } from '@/lib/speakers/types';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface SpeakerCardProps {
  speaker: SpeakerProfile;
}

export function SpeakerCard({ speaker }: SpeakerCardProps) {
  const { t } = useTranslation();
  const initials = speaker.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        {/* Header: Avatar, Name, Affiliation */}
        <div className="flex items-start gap-4">
          <Link href={`/scholars/${speaker.slug}`} className="shrink-0">
            {speaker.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={speaker.avatar_url}
                alt={speaker.full_name}
                className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-indigo-950 text-amber-300 font-display font-bold text-lg flex items-center justify-center border border-indigo-900 group-hover:scale-105 transition-transform shadow-xs">
                {initials}
              </div>
            )}
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/scholars/${speaker.slug}`}
                className="text-base font-bold font-display text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate"
              >
                {speaker.full_name}
              </Link>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60">
                <Mic className="w-3 h-3" />
                {t('speakers.title')}
              </span>
            </div>

            {speaker.title && (
              <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5">
                {speaker.title}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500 dark:text-slate-400">
              {speaker.institution_name && (
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{speaker.institution_name}</span>
                </span>
              )}
              {speaker.tradition_name && (
                <span className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>{speaker.tradition_name}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Travel Preferences / Bio */}
        {speaker.travel_preferences && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{speaker.travel_preferences}</span>
          </div>
        )}

        {/* Featured Keynote & Lecture Topics */}
        {speaker.topics.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t('speakers.keynote_topics')}
            </h4>
            <div className="space-y-2">
              {speaker.topics.slice(0, 3).map((topic) => (
                <div
                  key={topic.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {topic.title}
                    </h5>
                    <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60">
                      {topic.target_audience === 'pastoral'
                        ? t('speakers.pastoral')
                        : topic.target_audience === 'academic'
                        ? t('speakers.academic')
                        : topic.target_audience === 'general'
                        ? t('speakers.general')
                        : topic.target_audience === 'youth'
                        ? t('speakers.youth')
                        : formatTargetAudience(topic.target_audience)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {topic.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <Link
          href={`/scholars/${speaker.slug}`}
          className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors flex items-center gap-1"
        >
          {t('directory.view_profile')}
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>

        <Link
          href={`/scholars/${speaker.slug}?action=invite_speaker`}
          className="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white transition-colors shadow-xs flex items-center gap-1.5"
        >
          <Calendar className="w-3.5 h-3.5" />
          {t('speakers.book_speaker')}
        </Link>
      </div>
    </div>
  );
}
