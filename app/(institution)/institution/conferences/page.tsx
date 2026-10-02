'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Printer,
  ShieldCheck,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import {
  GUILD_CONFERENCES,
  getInstitutionConferenceDocket,
  recordCommitteeDeliberationNotes,
} from '@/lib/conferences/conference-service';
import {
  ScholarConferenceAppearance,
  CommitteeDeliberationNotes,
} from '@/lib/conferences/conference-types';
import { ConferenceInterviewModal } from '@/components/conferences/conference-interview-modal';

export default function InstitutionConferencesPage() {
  const [selectedConferenceSlug, setSelectedConferenceSlug] = useState<
    'ets-2026' | 'sbl-2026' | 'eps-2026'
  >('ets-2026');

  const institutionId = 'f2000000-0000-0000-0000-000000000001';
  const { conference, attendees, scheduledInterviews } =
    getInstitutionConferenceDocket(institutionId, selectedConferenceSlug);

  const [activeAppearanceForModal, setActiveAppearanceForModal] =
    useState<ScholarConferenceAppearance | null>(null);

  const [evaluationForms, setEvaluationForms] = useState<
    Record<string, CommitteeDeliberationNotes>
  >({});
  const [saveStatus, setSaveStatus] = useState<Record<string, boolean>>({});

  const handleScoreChange = (
    interviewId: string,
    field: keyof CommitteeDeliberationNotes,
    value: unknown
  ) => {
    const existing =
      evaluationForms[interviewId] ||
      scheduledInterviews.find((i) => i.id === interviewId)
        ?.deliberationNotes || {
        scholarshipScore: 5,
        pedagogyScore: 4,
        confessionalScore: 5,
        recommendation: 'strong_hire',
        evaluatorName: 'Dean of Faculty / Search Committee Chair',
        privateNotes: '',
        updatedAt: new Date().toISOString(),
      };

    setEvaluationForms((prev) => ({
      ...prev,
      [interviewId]: {
        ...existing,
        [field]: value,
      },
    }));
  };

  const handleSaveEvaluation = async (interviewId: string) => {
    const notesToSave =
      evaluationForms[interviewId] ||
      scheduledInterviews.find((i) => i.id === interviewId)?.deliberationNotes;

    if (!notesToSave) return;

    await recordCommitteeDeliberationNotes(interviewId, notesToSave);
    setSaveStatus((prev) => ({ ...prev, [interviewId]: true }));
    setTimeout(() => {
      setSaveStatus((prev) => ({ ...prev, [interviewId]: false }));
    }, 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 mb-2">
            <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Annual Guild Conventions · November 2026</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
            Search Committee Conference Suite
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Mobile interview floor docket, presenting candidate briefing, and confidential committee deliberation scoring for convention hotel suites.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Floor Docket</span>
          </button>
        </div>
      </div>

      {/* Conference Switcher Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200/80 dark:border-slate-800 print:hidden">
        {GUILD_CONFERENCES.map((conf) => {
          const isSelected = conf.slug === selectedConferenceSlug;
          return (
            <button
              key={conf.slug}
              onClick={() => setSelectedConferenceSlug(conf.slug)}
              className={`px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-indigo-900 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {conf.name} · {conf.city}
            </button>
          );
        })}
      </div>

      {/* Conference Highlight Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-amber-300 font-semibold">
              Selected Guild Meeting
            </span>
            <h2 className="text-xl sm:text-2xl font-display font-bold">
              {conference.fullTitle}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-indigo-200 pt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-300" />
                {conference.dates}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-300" />
                {conference.venue} ({conference.city})
              </span>
              {conference.theme && (
                <span className="italic text-indigo-300">
                  Theme: &ldquo;{conference.theme}&rdquo;
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-indigo-800/80 pt-3 md:pt-0 md:pl-6 shrink-0">
            <div>
              <div className="text-2xl font-bold font-display text-amber-300">
                {attendees.length}
              </div>
              <div className="text-[11px] text-indigo-200 uppercase tracking-wider">
                Attending Faculty
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold font-display text-emerald-400">
                {scheduledInterviews.length}
              </div>
              <div className="text-[11px] text-indigo-200 uppercase tracking-wider">
                Booked Interviews
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Scheduled Convention Interviews & Deliberation Scoring */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white">
              Committee Interview Floor Docket
            </h2>
            <p className="text-xs text-slate-500">
              Scheduled 30-minute screening interviews and confidential committee scoring rubrics.
            </p>
          </div>
        </div>

        {scheduledInterviews.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
            <Clock className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No Interviews Booked Yet for {conference.name}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Select any presenting scholar from the roster below to schedule a 30-minute screening interview during convention open hours.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {scheduledInterviews.map((interview) => {
              const currentNotes =
                evaluationForms[interview.id] ||
                interview.deliberationNotes || {
                  scholarshipScore: 5,
                  pedagogyScore: 4,
                  confessionalScore: 5,
                  recommendation: 'strong_hire',
                  evaluatorName: 'Dean of Faculty / Search Committee Chair',
                  privateNotes: '',
                  updatedAt: new Date().toISOString(),
                };

              return (
                <div
                  key={interview.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/scholars/${interview.scholarSlug}`}
                          className="font-display font-bold text-base text-slate-900 dark:text-white hover:text-indigo-600 transition"
                        >
                          {interview.scholarName}
                        </Link>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          {interview.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {interview.candidateFocus}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-900 dark:text-white">
                        <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        {interview.timeSlot}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {interview.locationLabel}
                      </span>
                    </div>
                  </div>

                  {/* Confidential Committee Deliberation Scoring Rubric */}
                  <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          Confidential Committee Deliberation Rubric
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Isolated to {interview.institutionName}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Scholarship & Rigor (1–5)
                        </label>
                        <select
                          value={currentNotes.scholarshipScore}
                          onChange={(e) =>
                            handleScoreChange(
                              interview.id,
                              'scholarshipScore',
                              parseInt(e.target.value, 10)
                            )
                          }
                          className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        >
                          {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>
                              {n} — {n === 5 ? 'Exceptional' : n === 4 ? 'Strong' : n === 3 ? 'Adequate' : 'Marginal'}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Pedagogical Delivery (1–5)
                        </label>
                        <select
                          value={currentNotes.pedagogyScore}
                          onChange={(e) =>
                            handleScoreChange(
                              interview.id,
                              'pedagogyScore',
                              parseInt(e.target.value, 10)
                            )
                          }
                          className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        >
                          {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>
                              {n} — {n === 5 ? 'Master Teacher' : n === 4 ? 'Effective' : n === 3 ? 'Capable' : 'Needs Mentorship'}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Confessional Alignment (1–5)
                        </label>
                        <select
                          value={currentNotes.confessionalScore}
                          onChange={(e) =>
                            handleScoreChange(
                              interview.id,
                              'confessionalScore',
                              parseInt(e.target.value, 10)
                            )
                          }
                          className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        >
                          {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>
                              {n} — {n === 5 ? 'Full Subscription' : n === 4 ? 'Standard Adherence' : n === 3 ? 'Minor Scruple' : 'Misaligned'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Deliberation Notes & Recommendation
                      </label>
                      <textarea
                        value={currentNotes.privateNotes}
                        onChange={(e) =>
                          handleScoreChange(
                            interview.id,
                            'privateNotes',
                            e.target.value
                          )
                        }
                        placeholder="Candidate responses during hotel screening interview, monograph defense feedback, search committee next steps..."
                        rows={2}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500 font-medium">Recommendation:</label>
                        <select
                          value={currentNotes.recommendation}
                          onChange={(e) =>
                            handleScoreChange(
                              interview.id,
                              'recommendation',
                              e.target.value as CommitteeDeliberationNotes['recommendation']
                            )
                          }
                          className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                        >
                          <option value="strong_hire">Advance to On-Campus Interview (Strong Hire)</option>
                          <option value="consider">Consider (Secondary Tier)</option>
                          <option value="hold">Hold for Candidate Pool</option>
                          <option value="decline">Decline Candidate</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        {saveStatus[interview.id] && (
                          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Saved to Committee Docket
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSaveEvaluation(interview.id)}
                          className="px-4 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition print:hidden"
                        >
                          Save Deliberation Notes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Presenting Faculty Roster at Selected Conference */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white">
            Presenting Faculty & Monograph Sessions
          </h2>
          <p className="text-xs text-slate-500">
            Scholars presenting academic papers at {conference.name} available for on-site convention interviews.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {attendees.map((app) => (
            <div
              key={app.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/scholars/${app.scholarSlug}`}
                      className="font-display font-bold text-base text-slate-900 dark:text-white hover:text-indigo-600 transition"
                    >
                      {app.scholarName}
                    </Link>
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {app.terminalDegree}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 shrink-0">
                    {app.primaryDiscipline}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                  <div className="font-semibold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                    &ldquo;{app.paperTitle}&rdquo;
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span>{app.sessionName}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {app.presentationTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {app.locationRoom}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between print:hidden">
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                  {app.openSlots.length} screening slots open
                </span>
                <button
                  type="button"
                  onClick={() => setActiveAppearanceForModal(app)}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Book Interview Slot</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {activeAppearanceForModal && (
        <ConferenceInterviewModal
          appearance={activeAppearanceForModal}
          isOpen={true}
          onClose={() => setActiveAppearanceForModal(null)}
          onSuccess={() => {
            // Re-render
          }}
        />
      )}
    </div>
  );
}
