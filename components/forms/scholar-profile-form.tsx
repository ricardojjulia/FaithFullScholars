'use client';

import { useState } from 'react';
import { RevisionSnapshotData, Taxonomy, UnresolvedEntry } from '@/lib/domain/types';
import { findUnresolved } from '@/lib/taxonomy/resolve';
import {
  ORCID_ERROR,
  SCHOLAR_URL_ERROR,
  describeProblems,
  isValidOrcid,
  isValidScholarUrl,
  summarizeProblems
} from '@/lib/profiles/profile-rows';
import { FIELD_LIMITS } from '@/lib/profiles/limits';
import { FieldError } from './use-row-editor';
import { PublicDataNotice } from './public-data-notice';
import { TaxonomyMultiSelect } from './taxonomy-multi-select';
import { CredentialsEditor } from './credentials-editor';
import { PublicationsEditor } from './publications-editor';
import { ConfessionalStandardsSelector } from './confessional-standards-selector';
import { DoctrinalStatementForm } from './doctrinal-statement-form';
import { inspectDraftDiff } from '@/lib/profiles/revision-actions';

interface ScholarProfileFormProps {
  initialDraft: RevisionSnapshotData;
  publishedSnapshot?: RevisionSnapshotData | null;
  /** Database taxonomy for the pickers; selections store the slug. */
  taxonomy: Taxonomy;
  /** Entries in the loaded draft that match no taxonomy row (blocks submit until fixed). */
  unresolved?: UnresolvedEntry[];
  onSaveDraft: (draft: RevisionSnapshotData) => Promise<{ success: boolean; error?: string }>;
  onSubmitForReview?: (
    draft: RevisionSnapshotData
  ) => Promise<{ success: boolean; error?: string; unresolved?: UnresolvedEntry[] }>;
  /** Disables every input and the save/submit buttons (e.g. while a submission awaits review). */
  readOnly?: boolean;
}

const KIND_LABEL: Record<UnresolvedEntry['kind'], string> = {
  discipline: 'Discipline',
  tradition: 'Tradition',
  confession: 'Confessional standard'
};

export function ScholarProfileForm({
  initialDraft,
  publishedSnapshot = null,
  taxonomy,
  unresolved: initialUnresolved = [],
  onSaveDraft,
  onSubmitForReview,
  readOnly = false
}: ScholarProfileFormProps) {
  const [formData, setFormData] = useState<RevisionSnapshotData>(initialDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Compute live diff against published snapshot
  const diff = inspectDraftDiff(publishedSnapshot, formData);

  // Live: recomputed from the editor contents, so fixing an entry clears the block immediately.
  const liveUnresolved = findUnresolved(formData, taxonomy);
  const [serverUnresolved, setServerUnresolved] = useState<UnresolvedEntry[]>([]);
  // Entries the server reported for the loaded draft count only while the value is still present.
  const present = (u: UnresolvedEntry) =>
    u.kind === 'discipline'
      ? (formData.disciplines ?? []).includes(u.value)
      : u.kind === 'tradition'
        ? (formData.traditions ?? []).includes(u.value)
        : (formData.confessions ?? []).some((c) => c.confessional_standard_id === u.value);
  const stillUnresolved = [...liveUnresolved];
  for (const u of initialUnresolved) {
    if (present(u) && !stillUnresolved.some((x) => x.kind === u.kind && x.value === u.value)) stillUnresolved.push(u);
  }
  const problems = summarizeProblems(formData);
  const rowProblems = problems.total > 0;
  const rowReason = rowProblems
    ? `Save and Submit are unavailable: ${describeProblems(problems)} Fix the highlighted fields.`
    : null;
  const unresolvedReason =
    stillUnresolved.length > 0
      ? `Submit is unavailable until ${stillUnresolved.length} unmatched ${stillUnresolved.length === 1 ? 'entry' : 'entries'} below ${stillUnresolved.length === 1 ? 'is' : 'are'} replaced or removed.`
      : null;
  const submitBlockedReason = [rowReason, unresolvedReason].filter(Boolean).join(' ') || null;
  const [touchedLinks, setTouchedLinks] = useState({ orcid: false, scholar: false });

  function updateField<K extends keyof RevisionSnapshotData>(key: K, value: RevisionSnapshotData[K]) {
    setFormData((prev) => ({
      ...prev,
      [key]: value
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly || rowProblems) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const res = await onSaveDraft(formData);
      if (res.success) {
        setSaveMessage({ type: 'success', text: 'Draft revision saved securely. Public profile remains unchanged.' });
      } else {
        setSaveMessage({ type: 'error', text: res.error || 'Failed to save draft revision.' });
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'An unexpected error occurred while saving.' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmitReview() {
    if (!onSubmitForReview || readOnly || submitBlockedReason) return;
    setIsSaving(true);
    setSaveMessage(null);
    setServerUnresolved([]);
    try {
      const res = await onSubmitForReview(formData);
      if (res.success) {
        setSaveMessage({ type: 'success', text: 'Revision submitted for admin review successfully!' });
      } else {
        setServerUnresolved(res.unresolved ?? []);
        setSaveMessage({ type: 'error', text: res.error || 'Failed to submit revision for review.' });
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to submit revision.' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* Revision Diff Header Bar */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Draft Revision Workspace</span>
              {diff.hasChanges ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-bold">
                  {diff.totalChanges} pending change{diff.totalChanges === 1 ? '' : 's'}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold">
                  In sync with live snapshot
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Changes stay in staging until submitted and approved. Your live public profile is untouched.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0 max-w-sm">
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isSaving || readOnly || rowProblems}
            aria-describedby={rowReason ? 'submit-blocked-reason' : undefined}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>

          {onSubmitForReview && (
            <button
              type="button"
              onClick={handleSubmitReview}
              disabled={isSaving || readOnly || !diff.hasChanges || !!submitBlockedReason}
              aria-describedby={submitBlockedReason ? 'submit-blocked-reason' : undefined}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
            >
              Submit for Review
            </button>
          )}
        </div>
        {submitBlockedReason && !readOnly && (
          <p
            id="submit-blocked-reason"
            data-testid="submit-blocked-reason"
            role="status"
            className="text-[11px] font-medium text-amber-900 dark:text-amber-300 sm:text-right"
          >
            {submitBlockedReason}
          </p>
        )}
        </div>
      </div>

      {unresolvedReason && !readOnly && (
        <div
          data-testid="unresolved-entries"
          role="status"
          className="p-3.5 rounded-xl text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200 space-y-1"
        >
          <p>{unresolvedReason}</p>
          {stillUnresolved.length > 0 && (
            <ul className="list-disc pl-5">
              {stillUnresolved.map((u) => (
                <li key={`${u.kind}:${u.value}`}>
                  {KIND_LABEL[u.kind]}: <span className="font-mono">{u.value}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {saveMessage && (
        <div
          role={saveMessage.type === 'error' ? 'alert' : 'status'}
          className={`p-3.5 rounded-xl text-xs font-medium ${
            saveMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
          }`}
        >
          <p>{saveMessage.text}</p>
          {saveMessage.type === 'error' && serverUnresolved.length > 0 && (
            <ul className="list-disc pl-5 mt-1" data-testid="submit-unresolved">
              {serverUnresolved.map((u) => (
                <li key={`${u.kind}:${u.value}`}>
                  {KIND_LABEL[u.kind]}: <span className="font-mono">{u.value}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <fieldset disabled={readOnly} className="space-y-8 min-w-0 border-0 p-0 m-0">
      {/* Section 1: Academic Identity */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp space-y-4">
        <h3 className="text-sm font-display font-bold tracking-tight text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
          Academic Identity & Affiliation
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="profile-full-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Legal & Professional Name *
            </label>
            <input id="profile-full-name"
              maxLength={FIELD_LIMITS.full_name}
              type="text"
              required
              value={formData.full_name || ''}
              onChange={(e) => updateField('full_name', e.target.value)}
              placeholder="e.g. Dr. Meredith C. Kline, Ph.D."
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label htmlFor="profile-title" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Professional Headline / Academic Title
            </label>
            <input id="profile-title"
              maxLength={FIELD_LIMITS.title}
              type="text"
              value={formData.title || ''}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g. Professor of Old Testament"
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label htmlFor="profile-institution" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Current Institution
            </label>
            <input id="profile-institution"
              maxLength={FIELD_LIMITS.current_institution}
              type="text"
              value={formData.current_institution || ''}
              onChange={(e) => updateField('current_institution', e.target.value)}
              placeholder="e.g. Westminster Theological Seminary"
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label htmlFor="profile-role" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Institutional Role
            </label>
            <input id="profile-role"
              maxLength={FIELD_LIMITS.institutional_role}
              type="text"
              value={formData.institutional_role || ''}
              onChange={(e) => updateField('institutional_role', e.target.value)}
              placeholder="e.g. Full Professor, Associate Professor, Adjunct"
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label htmlFor="profile-location" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Location
            </label>
            <input id="profile-location"
              maxLength={FIELD_LIMITS.location}
              type="text"
              value={formData.location || ''}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="e.g. Philadelphia, PA, USA"
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label htmlFor="profile-timezone" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Timezone
            </label>
            <input id="profile-timezone"
              maxLength={FIELD_LIMITS.timezone}
              type="text"
              value={formData.timezone || 'America/New_York'}
              onChange={(e) => updateField('timezone', e.target.value)}
              placeholder="e.g. America/New_York"
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label htmlFor="profile-orcid" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ORCID Researcher ID
            </label>
            <input id="profile-orcid"
              type="text"
              value={formData.orcid_id || ''}
              onChange={(e) => updateField('orcid_id', e.target.value)}
              placeholder="e.g. 0000-0002-1825-0097"
              maxLength={FIELD_LIMITS.orcid_id}
              onBlur={() => setTouchedLinks((t) => ({ ...t, orcid: true }))}
              aria-invalid={!isValidOrcid(formData.orcid_id)}
              aria-describedby={!isValidOrcid(formData.orcid_id) ? 'profile-orcid-err' : undefined}
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
            <FieldError
              id="profile-orcid-err"
              message={isValidOrcid(formData.orcid_id) ? undefined : ORCID_ERROR}
              announce={touchedLinks.orcid}
            />
          </div>

          <div>
            <label htmlFor="profile-scholar-url" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Google Scholar Citations URL
            </label>
            <input id="profile-scholar-url"
              type="text"
              inputMode="url"
              maxLength={FIELD_LIMITS.google_scholar_url}
              onBlur={() => setTouchedLinks((t) => ({ ...t, scholar: true }))}
              aria-invalid={!isValidScholarUrl(formData.google_scholar_url)}
              aria-describedby={!isValidScholarUrl(formData.google_scholar_url) ? 'profile-scholar-url-err' : undefined}
              value={formData.google_scholar_url || ''}
              onChange={(e) => updateField('google_scholar_url', e.target.value)}
              placeholder="https://scholar.google.com/citations?user=..."
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
            <FieldError
              id="profile-scholar-url-err"
              message={isValidScholarUrl(formData.google_scholar_url) ? undefined : SCHOLAR_URL_ERROR}
              announce={touchedLinks.scholar}
            />
          </div>
        </div>

        <div>
          <label htmlFor="profile-biography" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Academic Biography & Research Summary
          </label>
          <textarea id="profile-biography"
            rows={4}
            maxLength={FIELD_LIMITS.biography}
            aria-describedby="profile-biography-count"
            value={formData.biography || ''}
            onChange={(e) => updateField('biography', e.target.value)}
            placeholder="Share your academic journey, specialized focus areas, and teaching philosophy..."
            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
          <p id="profile-biography-count" data-testid="biography-count" className="mt-1 text-right text-[11px] text-slate-400">
            {(formData.biography || '').length.toLocaleString('en-US')} / {FIELD_LIMITS.biography.toLocaleString('en-US')} characters
          </p>
        </div>
      </div>

      {/* Section 2: Theological Disciplines */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp space-y-3">
        <h3 className="text-sm font-display font-bold tracking-tight text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
          Theological Disciplines & Specialties
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Select all theological disciplines that represent your research and teaching portfolio. The first one you pick is your primary discipline.
        </p>
        <TaxonomyMultiSelect
          label="Disciplines"
          noun="discipline"
          testIdPrefix="discipline"
          options={taxonomy.disciplines}
          value={formData.disciplines || []}
          onChange={(val) => updateField('disciplines', val)}
        />
      </div>

      {/* Section 2b: Traditions */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp space-y-3">
        <h3 className="text-sm font-display font-bold tracking-tight text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
          Theological Traditions
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Select the traditions you teach and write within. The first one you pick is your primary tradition.
        </p>
        <PublicDataNotice subject="Your traditions" testId="tradition-public-notice" />
        <TaxonomyMultiSelect
          label="Traditions"
          noun="tradition"
          testIdPrefix="tradition"
          options={taxonomy.traditions}
          value={formData.traditions || []}
          onChange={(val) => updateField('traditions', val)}
        />
      </div>

      {/* Section 3: Confessional Standards & Historic Creeds */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <ConfessionalStandardsSelector
          standards={taxonomy.confessions}
          value={formData.confessions || []}
          // Rows may hold an unset adherence level; Save is blocked until each is chosen.
          onChange={(val) => updateField('confessions', val as RevisionSnapshotData['confessions'])}
        />
      </div>

      {/* Section 3b: Credentials */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp space-y-3">
        <h3 className="text-sm font-display font-bold tracking-tight text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
          Academic Credentials
        </h3>
        <CredentialsEditor
          value={formData.credentials || []}
          onChange={(val) => updateField('credentials', val)}
        />
      </div>

      {/* Section 3c: Publications */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp space-y-3">
        <h3 className="text-sm font-display font-bold tracking-tight text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
          Publications
        </h3>
        <PublicationsEditor
          value={formData.publications || []}
          onChange={(val) => updateField('publications', val)}
        />
      </div>

      {/* Section 4: Personal Doctrinal Statement */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <DoctrinalStatementForm
          value={formData.doctrinal_statement_text || ''}
          onChange={(val) => updateField('doctrinal_statement_text', val)}
        />
      </div>
      </fieldset>
    </form>
  );
}
