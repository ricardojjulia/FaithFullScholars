'use client';

import { useState } from 'react';
import { Calendar, Clock, MapPin, X, Check, Award, AlertCircle } from 'lucide-react';
import { ScholarConferenceAppearance } from '@/lib/conferences/conference-types';
import { scheduleConferenceInterview, CONFERENCE_PREVIEW_INSTITUTION } from '@/lib/conferences/conference-service';

interface ConferenceInterviewModalProps {
  appearance: ScholarConferenceAppearance;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ConferenceInterviewModal({
  appearance,
  isOpen,
  onClose,
  onSuccess,
}: ConferenceInterviewModalProps) {
  const [selectedSlot, setSelectedSlot] = useState(appearance.openSlots[0] || '');
  const [locationLabel, setLocationLabel] = useState('');
  const [candidateFocus, setCandidateFocus] = useState('Faculty Search Committee Preliminary Screening');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await scheduleConferenceInterview({
        conferenceSlug: appearance.conferenceSlug,
        scholarId: appearance.scholarId,
        institutionId: CONFERENCE_PREVIEW_INSTITUTION.id,
        institutionName: CONFERENCE_PREVIEW_INSTITUTION.name,
        timeSlot: selectedSlot,
        locationLabel,
        candidateFocus,
      });

      if (!result.success) {
        setError(result.error || 'Failed to schedule convention interview.');
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch {
      setError('An error occurred while booking the interview.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal={true}
        aria-labelledby="conf-interview-title"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Close interview scheduling modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/50 dark:border-amber-800/50 flex items-center justify-center text-amber-700 dark:text-amber-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 id="conf-interview-title" className="text-base font-display font-bold text-slate-900 dark:text-white">
              Schedule Convention Interview
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {appearance.conferenceName} · {appearance.scholarName}
            </p>
          </div>
        </div>

        {isSuccess ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h4 className="font-display font-bold text-slate-900 dark:text-white text-base">
              Interview Slot Booked
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Preview: this booking exists only in this demo and nobody is notified. Nothing is saved.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p
              data-testid="conference-modal-preview-note"
              className="text-[11px] font-semibold text-amber-800 dark:text-amber-300"
            >
              Preview: this booking exists only in this demo and nobody is notified.
            </p>

            <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-950 dark:text-indigo-200">
              <div className="font-semibold">{appearance.paperTitle}</div>
              <div className="text-indigo-700 dark:text-indigo-300 text-[11px] mt-0.5">
                Session: {appearance.sessionName} ({appearance.presentationTime})
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="slot-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Available 30-Minute Interview Slots</span>
              </label>
              <select
                id="slot-select"
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                required
              >
                {appearance.openSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="location-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>Convention Meeting Location (demo)</span>
              </label>
              <input
                id="location-input"
                type="text"
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                placeholder="e.g. Hotel suite or convention center cafe"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label htmlFor="focus-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-slate-500" />
                <span>Position / Screening Focus</span>
              </label>
              <input
                id="focus-input"
                type="text"
                value={candidateFocus}
                onChange={(e) => setCandidateFocus(e.target.value)}
                placeholder="e.g. Assistant Professor of New Testament search"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition disabled:opacity-50"
              >
                {isSubmitting ? 'Booking Slot...' : 'Confirm Interview'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
