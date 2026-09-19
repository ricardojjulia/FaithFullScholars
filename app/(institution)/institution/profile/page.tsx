'use client';

import React, { useState } from 'react';
import { InstitutionType } from '@/lib/domain/types';

interface InstitutionProfileData {
  name: string;
  website: string;
  location: string;
  contact_email: string;
  institution_type: InstitutionType;
  theological_tradition: string;
  accreditation_details: string;
}

const DEFAULT_PROFILE: InstitutionProfileData = {
  name: 'Westminster Theological Seminary',
  website: 'https://wts.edu',
  location: 'Glenside, PA, USA',
  contact_email: 'academic.dean@wts.edu',
  institution_type: 'seminary',
  theological_tradition: 'Reformed / Presbyterian',
  accreditation_details: 'Association of Theological Schools (ATS), Middle States Commission on Higher Education (MSCHE)',
};

const INSTITUTION_TYPES: { value: InstitutionType; label: string }[] = [
  { value: 'seminary', label: 'Theological Seminary' },
  { value: 'christian_university', label: 'Christian University / College' },
  { value: 'bible_college', label: 'Bible College' },
  { value: 'ministry_institute', label: 'Ministry Institute' },
  { value: 'church', label: 'Church / Ecclesial Network' },
  { value: 'mission_org', label: 'Mission Agency' },
  { value: 'other', label: 'Other Academic Program' },
];

export default function InstitutionProfilePage() {
  const [profile, setProfile] = useState<InstitutionProfileData>(DEFAULT_PROFILE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Institution Profile & Verification
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Manage your seminary credentials, accredited contacts, and institutional identity seen by prospective faculty.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-5">
          {saved && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-200 rounded-xl">
              ✓ Institution profile changes saved successfully.
            </div>
          )}

          {/* Verification Callout */}
          <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🛡️</span>
              <div>
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Verified Academic Partner
                </span>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Accreditation validated by platform trust administrators. Verified badge active.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold">
              Active
            </span>
          </div>

          {/* Institution Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Institution Name *
            </label>
            <input
              type="text"
              required
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Type & Tradition */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Institution Type *
              </label>
              <select
                value={profile.institution_type}
                onChange={(e) => setProfile({ ...profile, institution_type: e.target.value as InstitutionType })}
                className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {INSTITUTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Theological Tradition
              </label>
              <input
                type="text"
                value={profile.theological_tradition}
                onChange={(e) => setProfile({ ...profile, theological_tradition: e.target.value })}
                className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Website & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Official Website
              </label>
              <input
                type="url"
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Location (City, State / Region)
              </label>
              <input
                type="text"
                value={profile.location}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Academic Dean / Contact Email */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Primary Academic Contact Email *
            </label>
            <input
              type="email"
              required
              value={profile.contact_email}
              onChange={(e) => setProfile({ ...profile, contact_email: e.target.value })}
              className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Scholars will see this email once an opportunity inquiry is accepted.
            </p>
          </div>

          {/* Accreditation Details */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Accreditation Agencies & Memberships
            </label>
            <textarea
              rows={3}
              value={profile.accreditation_details}
              onChange={(e) => setProfile({ ...profile, accreditation_details: e.target.value })}
              className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white font-semibold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
