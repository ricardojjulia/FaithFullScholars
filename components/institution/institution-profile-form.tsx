'use client';

import React, { useState } from 'react';
import { Check, Clock, ShieldCheck } from 'lucide-react';
import type { InstitutionType } from '@/lib/domain/types';
import { accreditationLabel } from '@/lib/inquiries/labels';
import type { InstitutionEditableProfile } from '@/lib/inquiries/queries';

const INSTITUTION_TYPE_OPTIONS: { value: InstitutionType; label: string }[] = [
  { value: 'seminary', label: 'Theological Seminary' },
  { value: 'theological_college', label: 'Theological College' },
  { value: 'christian_university', label: 'Christian University / College' },
  { value: 'bible_college', label: 'Bible College' },
  { value: 'ministry_institute', label: 'Ministry Institute' },
  { value: 'church', label: 'Church / Ecclesial Network' },
  { value: 'mission_org', label: 'Mission Agency' },
  { value: 'other', label: 'Other Academic Program' },
];

const INPUT_CLASS =
  'w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';
const LABEL_CLASS = 'block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5';

type FieldErrors = Partial<Record<'name' | 'website' | 'location' | 'contact_email' | 'institution_type', string>>;

export function InstitutionProfileForm({
  profile,
  canEdit = false,
}: {
  profile: InstitutionEditableProfile;
  /** Owners and admins only. Defaults to read-only (fail closed). */
  canEdit?: boolean;
}) {
  const [values, setValues] = useState({
    name: profile.name,
    institution_type: profile.institution_type,
    website: profile.website ?? '',
    location: profile.location ?? '',
    contact_email: profile.contact_email,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const approved = profile.status === 'approved';
  const accreditation = accreditationLabel(profile.accreditation_body, profile.accreditation_status);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setMessage(null);
    setFieldErrors({});
    try {
      // Only identity fields are sent. The institution comes from the session on the server.
      const res = await fetch('/api/institution/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        setMessage({ kind: 'success', text: 'Institution profile changes saved.' });
        return;
      }
      const body = (await res.json().catch(() => null)) as { error?: string; errors?: FieldErrors } | null;
      if (res.status === 400 && body?.errors) setFieldErrors(body.errors);
      setMessage({
        kind: 'error',
        text:
          res.status === 400
            ? 'Some fields need attention. Nothing was saved.'
            : 'We could not save your changes. Nothing was changed; please try again.',
      });
    } catch {
      setMessage({ kind: 'error', text: 'We could not save your changes. Please check your connection and try again.' });
    } finally {
      setSaving(false);
    }
  };

  const errorId = (field: keyof FieldErrors) => (fieldErrors[field] ? `profile-${field}-error` : undefined);
  const fieldError = (field: keyof FieldErrors) =>
    fieldErrors[field] ? (
      <p id={`profile-${field}-error`} className="text-xs font-semibold text-rose-700 dark:text-rose-300 mt-1">
        {fieldErrors[field]}
      </p>
    ) : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Institution Profile &amp; Verification</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Manage your institution&rsquo;s identity and contact details as prospective faculty see them.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {!canEdit && (
            <div
              data-testid="profile-read-only"
              className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-xl"
            >
              You can view this profile, but only institution owners and admins can edit it. Ask an owner or admin to
              make changes.
            </div>
          )}
          <div role="status" aria-live="polite">
            {message?.kind === 'success' && (
              <div
                data-testid="profile-save-success"
                className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-200 rounded-xl flex items-center gap-2"
              >
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span>{message.text}</span>
              </div>
            )}
          </div>
          {message?.kind === 'error' && (
            <div
              role="alert"
              data-testid="profile-save-error"
              className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs font-semibold text-amber-900 dark:text-amber-200 rounded-xl"
            >
              {message.text}
            </div>
          )}

          {/* Verification status: read from the real institution record, never editable here. */}
          <div
            data-testid="profile-verification"
            className={`p-4 border rounded-2xl flex items-center space-x-3 ${
              approved
                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                approved
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {approved ? <ShieldCheck className="w-5 h-5" aria-hidden="true" /> : <Clock className="w-5 h-5" aria-hidden="true" />}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {approved
                  ? 'Verified Academic Partner'
                  : profile.status === 'pending'
                    ? 'Pending verification'
                    : profile.status === 'rejected'
                      ? 'Verification declined'
                      : 'Account suspended'}
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {accreditation ? `${accreditation}. ` : ''}
                Verification and accreditation are set by platform administrators and cannot be edited here.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="profile-name" className={LABEL_CLASS}>Institution Name *</label>
            <input
              id="profile-name"
              type="text"
              required
              maxLength={200}
              value={values.name}
              aria-invalid={!!fieldErrors.name}
              aria-describedby={errorId('name')}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
              readOnly={!canEdit}
              className={INPUT_CLASS}
            />
            {fieldError('name')}
          </div>

          <div>
            <label htmlFor="profile-type" className={LABEL_CLASS}>Institution Type *</label>
            <select
              id="profile-type"
              disabled={!canEdit}
              value={values.institution_type}
              aria-invalid={!!fieldErrors.institution_type}
              aria-describedby={errorId('institution_type')}
              onChange={(e) => setValues({ ...values, institution_type: e.target.value as InstitutionType })}
              className={INPUT_CLASS}
            >
              {INSTITUTION_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldError('institution_type')}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="profile-website" className={LABEL_CLASS}>Official Website</label>
              <input
                id="profile-website"
                type="url"
                maxLength={300}
                value={values.website}
                aria-invalid={!!fieldErrors.website}
                aria-describedby={errorId('website')}
                onChange={(e) => setValues({ ...values, website: e.target.value })}
                readOnly={!canEdit}
              className={INPUT_CLASS}
              />
              {fieldError('website')}
            </div>

            <div>
              <label htmlFor="profile-location" className={LABEL_CLASS}>Location (City, State / Region)</label>
              <input
                id="profile-location"
                type="text"
                maxLength={200}
                value={values.location}
                aria-invalid={!!fieldErrors.location}
                aria-describedby={errorId('location')}
                onChange={(e) => setValues({ ...values, location: e.target.value })}
                readOnly={!canEdit}
              className={INPUT_CLASS}
              />
              {fieldError('location')}
            </div>
          </div>

          <div>
            <label htmlFor="profile-contact-email" className={LABEL_CLASS}>Primary Academic Contact Email *</label>
            <input
              id="profile-contact-email"
              type="email"
              required
              maxLength={254}
              value={values.contact_email}
              aria-invalid={!!fieldErrors.contact_email}
              aria-describedby={errorId('contact_email') ?? 'profile-contact-email-hint'}
              onChange={(e) => setValues({ ...values, contact_email: e.target.value })}
              readOnly={!canEdit}
              className={INPUT_CLASS}
            />
            <p id="profile-contact-email-hint" className="text-xs text-slate-500 mt-1">
              Scholars will see this email once an opportunity inquiry is accepted.
            </p>
            {fieldError('contact_email')}
          </div>

          {canEdit && (
          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white font-semibold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile Settings'}
            </button>
          </div>
          )}
        </form>
      </div>
    </div>
  );
}
