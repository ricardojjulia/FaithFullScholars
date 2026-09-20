'use client';

import { useState } from 'react';

const OPPORTUNITY_OPTIONS = [
  { id: 'adjunct_teaching', label: 'Adjunct Faculty Appointments', desc: 'Semester or term-based teaching contracts' },
  { id: 'online_async', label: 'Online Asynchronous Courses', desc: 'Pre-recorded modules and LMS discussion grading' },
  { id: 'online_sync', label: 'Online Synchronous Classes', desc: 'Live video seminar instruction' },
  { id: 'modular_intensive', label: 'One-Week Modular Intensives', desc: 'In-person or hybrid concentrated master-level modules' },
  { id: 'guest_lecture', label: 'Guest Lectures & Chapel Addresses', desc: 'Single session or short conference series' },
  { id: 'doctoral_supervision', label: 'Doctoral Supervision & External Reader', desc: 'Ph.D./Th.D. dissertation advising and thesis review' },
  { id: 'curriculum_consulting', label: 'Curriculum & ATS Accreditation Review', desc: 'Program development and institutional assessment' }
];

export default function AvailabilityManagerPage() {
  const [status, setStatus] = useState<'available' | 'limited' | 'unavailable' | 'sabbatical'>('available');
  const [selectedOpportunities, setSelectedOpportunities] = useState<string[]>([
    'adjunct_teaching',
    'online_async',
    'modular_intensive'
  ]);
  const [availableFrom, setAvailableFrom] = useState('2026-09-01');
  const [notes, setNotes] = useState('Open to fall modular intensives and online synchronous seminars.');
  const [saved, setSaved] = useState(false);

  function toggleOpportunity(id: string) {
    if (selectedOpportunities.includes(id)) {
      setSelectedOpportunities(selectedOpportunities.filter((o) => o !== id));
    } else {
      setSelectedOpportunities([...selectedOpportunities, id]);
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

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
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 text-xs font-medium">
          ✓ Availability preferences saved to your draft revision.
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
                onClick={() => setStatus(opt.id as typeof status)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  status === opt.id
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
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Availability Scope & Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
              const active = selectedOpportunities.includes(opp.id);
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
