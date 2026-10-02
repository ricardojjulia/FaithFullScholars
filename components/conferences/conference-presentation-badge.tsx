'use client';

import { useState } from 'react';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { ScholarConferenceAppearance } from '@/lib/conferences/conference-types';
import { ConferenceInterviewModal } from './conference-interview-modal';

interface ConferencePresentationBadgeProps {
  appearances: ScholarConferenceAppearance[];
  compact?: boolean;
}

export function ConferencePresentationBadge({
  appearances,
  compact = false,
}: ConferencePresentationBadgeProps) {
  const [activeModalAppearance, setActiveModalAppearance] =
    useState<ScholarConferenceAppearance | null>(null);

  if (!appearances || appearances.length === 0) return null;

  if (compact) {
    const primary = appearances[0];
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 shadow-2xs">
        <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        <span>{primary.conferenceName} Presenter</span>
      </span>
    );
  }

  return (
    <div className="space-y-3">
      {appearances.map((app) => (
        <div
          key={app.id}
          className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/70 via-white to-slate-50 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-950 border border-amber-200/80 dark:border-amber-900/40 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                {app.conferenceName}
              </span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {app.sessionName}
              </span>
            </div>

            {app.availableForInterviews && (
              <button
                type="button"
                onClick={() => setActiveModalAppearance(app)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors shrink-0 print:hidden"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Schedule Convention Interview</span>
              </button>
            )}
          </div>

          <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug mb-2.5">
            &ldquo;{app.paperTitle}&rdquo;
          </h4>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{app.presentationTime}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{app.locationRoom}</span>
            </div>
            {app.openSlots.length > 0 && (
              <span className="text-amber-800 dark:text-amber-300 font-medium text-[11px]">
                {app.openSlots.length} interview slots open
              </span>
            )}
          </div>
        </div>
      ))}

      {activeModalAppearance && (
        <ConferenceInterviewModal
          appearance={activeModalAppearance}
          isOpen={true}
          onClose={() => setActiveModalAppearance(null)}
        />
      )}
    </div>
  );
}
