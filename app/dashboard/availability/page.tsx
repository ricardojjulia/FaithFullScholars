'use client';

import { useState } from 'react';
import { Check, Mic, Plus, Trash2, Video, Star, Sparkles } from 'lucide-react';
import {
  TargetAudience,
  TARGET_AUDIENCES,
  formatTargetAudience,
  validateSpeakerTopicInput,
} from '@/lib/speakers/types';

const OPPORTUNITY_OPTIONS = [
  { id: 'adjunct_teaching', label: 'Adjunct Faculty Appointments', desc: 'Semester or term-based teaching contracts' },
  { id: 'online_async', label: 'Online Asynchronous Courses', desc: 'Pre-recorded modules and LMS discussion grading' },
  { id: 'online_sync', label: 'Online Synchronous Classes', desc: 'Live video seminar instruction' },
  { id: 'modular_intensive', label: 'One-Week Modular Intensives', desc: 'In-person or hybrid concentrated master-level modules' },
  { id: 'conference_speaking', label: 'Conference Keynotes & Speaking Bureau', desc: 'Keynote addresses, plenary symposium lectures, and conference presentations (ADR 0009)' },
  { id: 'guest_lecturing', label: 'Guest Lectures & Chapel Addresses', desc: 'Single session or short conference series' },
  { id: 'doctoral_supervision', label: 'Doctoral Supervision & External Reader', desc: 'Ph.D./Th.D. dissertation advising and thesis review' },
  { id: 'curriculum_consulting', label: 'Curriculum & ATS Accreditation Review', desc: 'Program development and institutional assessment' }
];

export interface SpeakerTopicItem {
  id: string;
  title: string;
  description: string;
  target_audience: TargetAudience;
  sample_media_url: string | null;
  is_featured: boolean;
}

interface AvailabilityState {
  status: 'available' | 'limited' | 'unavailable' | 'sabbatical';
  selectedOpportunities: string[];
  availableFrom: string;
  notes: string;
  travelPreferences: string;
  honorariumPolicy: string;
  speakingBio: string;
  topics: SpeakerTopicItem[];
}

const DEFAULT_AVAILABILITY: AvailabilityState = {
  status: 'available',
  selectedOpportunities: [
    'adjunct_teaching',
    'online_async',
    'modular_intensive',
    'conference_speaking'
  ],
  availableFrom: '2026-09-01',
  notes: 'Open to fall modular intensives and online synchronous seminars.',
  travelPreferences: 'Domestic & Virtual preferred (willing to travel for multi-day conferences)',
  honorariumPolicy: 'Standard institutional honorarium + lodging and travel reimbursement',
  speakingBio: 'Experienced keynote speaker for academic symposiums, pastoral training conferences, and seminary chapels. Regular contributor to regional ETS and theological society meetings.',
  topics: [
    {
      id: 'demo-topic-1',
      title: 'Justification by Faith & Federal Theology in the Reformation',
      description: 'An academic keynote examining the development of covenantal structures in early Reformed dogmatics.',
      target_audience: 'academic',
      sample_media_url: 'https://youtube.com/watch?v=sample-keynote',
      is_featured: true,
    }
  ]
};

function getInitialAvailability(): AvailabilityState {
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('fs_availability_preferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_AVAILABILITY,
          ...parsed,
          selectedOpportunities: Array.isArray(parsed.selectedOpportunities)
            ? parsed.selectedOpportunities
            : DEFAULT_AVAILABILITY.selectedOpportunities,
          topics: Array.isArray(parsed.topics)
            ? parsed.topics
            : DEFAULT_AVAILABILITY.topics,
        };
      }
    } catch {
      // fallback
    }
  }
  return DEFAULT_AVAILABILITY;
}

export default function AvailabilityManagerPage() {
  const [form, setForm] = useState<AvailabilityState>(getInitialAvailability);
  const [saved, setSaved] = useState(false);

  // New topic form state
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [newTopicAudience, setNewTopicAudience] = useState<TargetAudience>('academic');
  const [newTopicMedia, setNewTopicMedia] = useState('');
  const [newTopicFeatured, setNewTopicFeatured] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);

  function toggleOpportunity(id: string) {
    setForm((prev) => ({
      ...prev,
      selectedOpportunities: prev.selectedOpportunities.includes(id)
        ? prev.selectedOpportunities.filter((o) => o !== id)
        : [...prev.selectedOpportunities, id],
    }));
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      sessionStorage.setItem(
        'fs_availability_preferences',
        JSON.stringify({ ...form, updatedAt: new Date().toISOString() })
      );
    } catch {
      // ignore
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleAddTopic(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      title: newTopicTitle,
      description: newTopicDesc,
      target_audience: newTopicAudience,
      sample_media_url: newTopicMedia.trim() ? newTopicMedia.trim() : null,
      is_featured: newTopicFeatured,
    };
    const validation = validateSpeakerTopicInput(input);
    if (!validation.valid) {
      setTopicError(validation.error || 'Invalid topic input');
      return;
    }
    setTopicError(null);

    const created: SpeakerTopicItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `topic-${Date.now()}`,
      title: newTopicTitle.trim(),
      description: newTopicDesc.trim(),
      target_audience: newTopicAudience,
      sample_media_url: newTopicMedia.trim() ? newTopicMedia.trim() : null,
      is_featured: newTopicFeatured,
    };

    setForm((prev) => {
      const updatedTopics = [...(prev.topics || []), created];
      try {
        sessionStorage.setItem(
          'fs_availability_preferences',
          JSON.stringify({ ...prev, topics: updatedTopics, updatedAt: new Date().toISOString() })
        );
      } catch {
        // ignore
      }
      return { ...prev, topics: updatedTopics };
    });

    setNewTopicTitle('');
    setNewTopicDesc('');
    setNewTopicAudience('academic');
    setNewTopicMedia('');
    setNewTopicFeatured(false);
    setShowAddTopic(false);
  }

  function handleDeleteTopic(id: string) {
    setForm((prev) => {
      const updatedTopics = (prev.topics || []).filter((t) => t.id !== id);
      try {
        sessionStorage.setItem(
          'fs_availability_preferences',
          JSON.stringify({ ...prev, topics: updatedTopics, updatedAt: new Date().toISOString() })
        );
      } catch {
        // ignore
      }
      return { ...prev, topics: updatedTopics };
    });
  }

  const isSpeakingBureauActive =
    form.selectedOpportunities.includes('conference_speaking') ||
    form.selectedOpportunities.includes('guest_lecturing');

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-display font-bold tracking-tight text-slate-900 dark:text-white">
          Teaching Availability & Opportunities
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Signal your teaching capacity to colleges, seminaries, and ministry programs looking for qualified professors.
        </p>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Availability preferences and speaking bureau settings saved to your draft profile.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Availability Status Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp space-y-4">
          <h2 className="text-sm font-display font-bold tracking-tight text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
            General Availability Status
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              { id: 'available', label: 'Available', color: 'border-emerald-500 bg-emerald-50/40 text-emerald-900 dark:text-emerald-300' },
              { id: 'limited', label: 'Limited Capacity', color: 'border-amber-500 bg-amber-50/40 text-amber-900 dark:text-amber-300' },
              { id: 'sabbatical', label: 'On Sabbatical', color: 'border-indigo-500 bg-indigo-50/40 text-indigo-900 dark:text-indigo-300' },
              { id: 'unavailable', label: 'Unavailable', color: 'border-slate-400 bg-slate-50 text-slate-700 dark:text-slate-300' }
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, status: opt.id as AvailabilityState['status'] }))}
                className={`p-3 rounded-xl border text-left transition-all ${
                  form.status === opt.id
                    ? `${opt.color} ring-2 ring-indigo-500/20 shadow-xs font-bold`
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <span className="text-xs block">{opt.label}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Available Beginning From
              </label>
              <input
                type="date"
                name="availableFrom"
                value={form.availableFrom}
                onChange={(e) => setForm((prev) => ({ ...prev, availableFrom: e.target.value }))}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Availability Scope & Notes
              </label>
              <input
                type="text"
                name="notes"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="e.g. Open to 1 modular intensive per semester..."
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Opportunity Types */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp space-y-4">
          <h2 className="text-sm font-display font-bold tracking-tight text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
            Desired Opportunity Types
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {OPPORTUNITY_OPTIONS.map((opp) => {
              const active = form.selectedOpportunities.includes(opp.id);
              return (
                <label
                  key={opp.id}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    active
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    name={`opp_${opp.id}`}
                    checked={active}
                    onChange={() => toggleOpportunity(opp.id)}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                      {opp.label}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {opp.desc}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Speaking Bureau & Keynote Topics (§21 / ADR 0009) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-center">
                <Mic className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-sm font-display font-bold tracking-tight text-slate-900 dark:text-white">
                  Theological Speaking Bureau & Keynote Portfolio
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Manage keynote lectures, target audiences, and travel parameters for event committees.
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                isSpeakingBureauActive
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
            >
              {isSpeakingBureauActive ? 'Directory Active' : 'Speaking Inactive'}
            </span>
          </div>

          {!isSpeakingBureauActive && (
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
              <span>Speaking Bureau is currently disabled. Check <strong>Conference Keynotes</strong> above to list topics in the directory.</span>
              <button
                type="button"
                onClick={() => toggleOpportunity('conference_speaking')}
                className="px-2.5 py-1 text-[11px] font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
              >
                Enable Speaking
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Travel & Geographic Reach
              </label>
              <input
                type="text"
                name="travelPreferences"
                value={form.travelPreferences}
                onChange={(e) => setForm((prev) => ({ ...prev, travelPreferences: e.target.value }))}
                placeholder="e.g. Regional driving distance or virtual..."
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Honorarium & Travel Expenses Policy
              </label>
              <input
                type="text"
                name="honorariumPolicy"
                value={form.honorariumPolicy}
                onChange={(e) => setForm((prev) => ({ ...prev, honorariumPolicy: e.target.value }))}
                placeholder="e.g. Standard institutional honorarium..."
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Speaker Profile & Preaching Background
            </label>
            <textarea
              rows={3}
              name="speakingBio"
              value={form.speakingBio}
              onChange={(e) => setForm((prev) => ({ ...prev, speakingBio: e.target.value }))}
              placeholder="Describe your speaking ministry, style, and preferred contexts..."
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Keynote Topics Management Section */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Keynote Lectures & Presentation Topics ({form.topics?.length || 0})
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Topics listed below appear on your scholar dossier and in the speaking bureau directory.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTopic(!showAddTopic)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddTopic ? 'Cancel' : 'Add Topic'}</span>
              </button>
            </div>

            {/* Add Topic Inline Form */}
            {showAddTopic && (
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>New Lecture Topic</span>
                </div>

                {topicError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 font-medium">
                    {topicError}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Topic Title *
                    </label>
                    <input
                      type="text"
                      value={newTopicTitle}
                      onChange={(e) => setNewTopicTitle(e.target.value)}
                      placeholder="e.g. The Doctrine of Justification in the Early Reformers"
                      className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Target Audience *
                      </label>
                      <select
                        value={newTopicAudience}
                        onChange={(e) => setNewTopicAudience(e.target.value as TargetAudience)}
                        className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      >
                        {TARGET_AUDIENCES.map((aud) => (
                          <option key={aud} value={aud}>
                            {formatTargetAudience(aud)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Sample Media Link (Audio / Video URL)
                      </label>
                      <input
                        type="url"
                        value={newTopicMedia}
                        onChange={(e) => setNewTopicMedia(e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Lecture Abstract / Description *
                    </label>
                    <textarea
                      rows={3}
                      value={newTopicDesc}
                      onChange={(e) => setNewTopicDesc(e.target.value)}
                      placeholder="Detailed abstract summarizing the theological argument, methodology, and primary audience appeal..."
                      className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300 font-medium">
                      <input
                        type="checkbox"
                        checked={newTopicFeatured}
                        onChange={(e) => setNewTopicFeatured(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Feature this topic prominently on scholar card</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleAddTopic}
                      className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                    >
                      Save Topic to Roster
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* List of current topics */}
            <div className="space-y-3">
              {(form.topics || []).length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                  No speaking topics added yet. Click &ldquo;Add Topic&rdquo; to showcase your keynote addresses.
                </div>
              ) : (
                (form.topics || []).map((topic) => (
                  <div
                    key={topic.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-3 group hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60">
                          {formatTargetAudience(topic.target_audience)}
                        </span>
                        {topic.is_featured && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            Featured
                          </span>
                        )}
                        {topic.sample_media_url && (
                          <a
                            href={topic.sample_media_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium underline"
                          >
                            <Video className="w-3 h-3" />
                            Sample Recording
                          </a>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {topic.title}
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                        {topic.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteTopic(topic.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Remove topic"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            Save Availability Settings
          </button>
        </div>
      </form>
    </div>
  );
}
