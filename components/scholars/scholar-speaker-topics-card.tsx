'use client';

import { useState } from 'react';
import { Mic, MapPin, DollarSign, ExternalLink, Calendar } from 'lucide-react';
import { SpeakerTopic, formatTargetAudience } from '@/lib/speakers/types';
import { StructuredInquiryModal } from '@/components/inquiries/structured-inquiry-modal';

interface ScholarSpeakerTopicsCardProps {
  scholarId: string;
  scholarName: string;
  travelPreferences?: string | null;
  speakingBio?: string | null;
  honorariumPolicy?: string | null;
  topics: SpeakerTopic[];
  initialOpenModal?: boolean;
}

export function ScholarSpeakerTopicsCard({
  scholarId,
  scholarName,
  travelPreferences,
  speakingBio,
  honorariumPolicy,
  topics,
  initialOpenModal = false,
}: ScholarSpeakerTopicsCardProps) {
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(initialOpenModal);

  if (topics.length === 0 && !travelPreferences && !speakingBio) {
    return null;
  }

  return (
    <section className="card-crisp p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/80 dark:border-amber-800/60">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display tracking-tight text-slate-900 dark:text-white">
              Speaking Bureau & Keynote Topics
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Available for academic symposiums, chapel lectures, and conferences
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsInquiryModalOpen(true)}
          className="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white transition-colors shadow-xs flex items-center gap-1.5 shrink-0"
        >
          <Calendar className="w-3.5 h-3.5" />
          Invite to Speak
        </button>
      </div>

      {/* Speaking Bio */}
      {speakingBio && (
        <p className="mt-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {speakingBio}
        </p>
      )}

      {/* Travel & Honorarium Badges */}
      {(travelPreferences || honorariumPolicy) && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {travelPreferences && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span><strong className="font-semibold text-slate-700 dark:text-slate-200">Travel Reach:</strong> {travelPreferences}</span>
            </div>
          )}
          {honorariumPolicy && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              <span><strong className="font-semibold text-slate-700 dark:text-slate-200">Honorarium Policy:</strong> {honorariumPolicy}</span>
            </div>
          )}
        </div>
      )}

      {/* Registered Keynote Topics */}
      {topics.length > 0 && (
        <div className="mt-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Available Lecture & Sermon Topics ({topics.length})
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {topic.title}
                    </h5>
                    <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60">
                      {formatTargetAudience(topic.target_audience)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                    {topic.description}
                  </p>
                </div>

                {topic.sample_media_url && (
                  <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <a
                      href={topic.sample_media_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Listen to Sample Recording
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Embedded Inquiry Modal */}
      {isInquiryModalOpen && (
        <StructuredInquiryModal
          isOpen={isInquiryModalOpen}
          onClose={() => setIsInquiryModalOpen(false)}
          scholar={{
            id: scholarId,
            fullName: scholarName,
          }}
          defaultOpportunityType="conference_speaking"
        />
      )}
    </section>
  );
}
