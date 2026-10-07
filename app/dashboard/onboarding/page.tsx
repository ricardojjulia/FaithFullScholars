'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Check, Loader2 } from 'lucide-react';
import { CvUploadParser } from '@/components/forms/cv-upload-parser';
import { ParsedCvDraft } from '@/lib/profiles/cv-parser';
import { RevisionSnapshotData, Taxonomy, UnresolvedEntry } from '@/lib/domain/types';
import { TaxonomyMultiSelect } from '@/components/forms/taxonomy-multi-select';
import { CredentialsEditor } from '@/components/forms/credentials-editor';
import { PublicationsEditor } from '@/components/forms/publications-editor';
import { describeProblems, summarizeProblems } from '@/lib/profiles/profile-rows';
import { buildCvImport } from '@/lib/profiles/cv-import';
import { FIELD_LIMITS } from '@/lib/profiles/limits';
import { PublicDataNotice } from '@/components/forms/public-data-notice';
import { ConfessionalStandardsSelector } from '@/components/forms/confessional-standards-selector';
import { DoctrinalStatementForm } from '@/components/forms/doctrinal-statement-form';
import { buildDraftSnapshot } from '@/lib/profiles/revision-actions';
import {
  describeFailure,
  fetchRevisionState,
  saveRevision
} from '@/components/dashboard/revision-client';

const SUBMITTED_MESSAGE =
  'You have a submission awaiting review — withdraw it from your profile page to make changes.';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<'upload' | 'review' | 'success'>('upload');
  const [draft, setDraft] = useState<RevisionSnapshotData>(buildDraftSnapshot(null, {}));
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openRevisionId, setOpenRevisionId] = useState<string | undefined>(undefined);
  const [submitted, setSubmitted] = useState(false);
  const [saveErrors, setSaveErrors] = useState<string | null>(null);
  const [taxonomy, setTaxonomy] = useState<Taxonomy>({ disciplines: [], traditions: [], confessions: [] });
  // CV suggestions that match no taxonomy row: listed for the scholar instead of silently dropped.
  const [unmatchedSuggestions, setUnmatchedSuggestions] = useState<UnresolvedEntry[]>([]);
  // What the CV import did to lists the scholar already had (nothing is removed).
  const [cvNotices, setCvNotices] = useState<string[]>([]);
  const [cvAnnouncement, setCvAnnouncement] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetchRevisionState();
      if (!active) return;
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        setLoadError(
          res.status === 404 ? 'No scholar profile was found for this account.' : describeFailure(res)
        );
        setLoading(false);
        return;
      }
      const { revision, baseline } = res.data;
      const isOpen =
        !!revision && ['draft', 'submitted', 'changes_requested'].includes(revision.status);
      setTaxonomy(res.data.taxonomy);
      setDraft(buildDraftSnapshot(baseline.snapshot, revision?.snapshot_data ?? {}));
      setOpenRevisionId(isOpen ? revision!.id : undefined);
      setSubmitted(revision?.status === 'submitted');
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  function handleCvParsed(parsed: ParsedCvDraft) {
    const result = buildCvImport(draft, parsed, taxonomy);
    setUnmatchedSuggestions(result.unmatched);
    setCvNotices(result.notices);
    setCvAnnouncement(
      result.unmatched.length > 0
        ? `CV imported. ${result.unmatched.length} suggested ${result.unmatched.length === 1 ? 'entry needs' : 'entries need'} your choice.`
        : 'CV imported.'
    );
    setDraft(buildDraftSnapshot(draft, result.updates));
    setStep('review');
  }

  /** The scholar has dealt with a suggestion (picked a closest option or decided to skip it). */
  function resolveSuggestion(entry: UnresolvedEntry) {
    const remaining = unmatchedSuggestions.filter((u) => !(u.kind === entry.kind && u.value === entry.value));
    setUnmatchedSuggestions(remaining);
    setCvAnnouncement(
      remaining.length > 0
        ? `Marked "${entry.value}" as handled. ${remaining.length} remaining.`
        : `Marked "${entry.value}" as handled. No suggestions remain.`
    );
  }

  async function handleSaveOnboarding() {
    setIsSaving(true);
    setSaveErrors(null);
    const res = await saveRevision(draft, openRevisionId);
    setIsSaving(false);
    if (res.ok) {
      setOpenRevisionId(res.data.revision.id);
      setStep('success');
      return;
    }
    if (res.status === 409) {
      // Re-read the real state: only an actual submission locks the wizard. Any
      // other conflict (e.g. a draft changed in another tab) can be retried, and
      // the scholar's edits here are kept.
      const current = await fetchRevisionState();
      if (current.ok) {
        const rev = current.data.revision;
        const isOpen = !!rev && ['draft', 'submitted', 'changes_requested'].includes(rev.status);
        setOpenRevisionId(isOpen ? rev!.id : undefined);
        if (rev?.status === 'submitted') {
          setSubmitted(true);
          return;
        }
      }
      setSaveErrors(`${describeFailure(res)} Your edits are kept; save again to retry.`);
      return;
    }
    setSaveErrors(describeFailure(res));
  }

  const problems = summarizeProblems(draft);
  const saveBlockedReason = !draft.full_name?.trim()
    ? 'Enter your full professional name to save.'
    : problems.total > 0
      ? `Save is unavailable: ${describeProblems(problems)} Fix the highlighted fields.`
      : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2" role="status">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          <span>Loading your profile...</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div role="alert" className="max-w-md p-4 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 text-xs space-y-2">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 bg-rose-700 text-white rounded-xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Onboarding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-300 text-xs font-semibold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 stroke-[2]" />
            <span>Scholar Onboarding Wizard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-slate-900 dark:text-white">
            Set Up Your Academic & Theological Profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
            Upload your CV for automated field extraction, or verify and customize your credentials, confessional standards, and syllabi.
          </p>
        </div>

        {/* Wizard Steps Indicator */}
        <div className="flex items-center justify-center gap-3 text-xs font-medium">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              step === 'upload'
                ? 'bg-indigo-900 text-white font-bold'
                : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span>1</span>
            <span>CV Ingestion</span>
          </div>
          <span className="text-slate-400">→</span>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              step === 'review'
                ? 'bg-indigo-900 text-white font-bold'
                : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span>2</span>
            <span>Review & Refine Draft</span>
          </div>
          <span className="text-slate-400">→</span>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              step === 'success'
                ? 'bg-indigo-900 text-white font-bold'
                : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span>3</span>
            <span>Dashboard Workspace</span>
          </div>
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-6">
            <CvUploadParser onParsed={handleCvParsed} />

            <div className="text-center">
              <button
                type="button"
                onClick={() => setStep('review')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Skip upload and start from scratch manually →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review Draft */}
        {step === 'review' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp space-y-4">
              <h2 className="text-sm font-display font-bold tracking-tight text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                1. Identity & Institutional Affiliation
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1" htmlFor="onboarding-full-name">
                    Full Professional Name
                  </label>
                  <input
                    id="onboarding-full-name"
                    maxLength={FIELD_LIMITS.full_name}
                    type="text"
                    value={draft.full_name || ''}
                    onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1" htmlFor="onboarding-title">
                    Academic Title / Headline
                  </label>
                  <input
                    id="onboarding-title"
                    maxLength={FIELD_LIMITS.title}
                    type="text"
                    value={draft.title || ''}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1" htmlFor="onboarding-institution">
                    Current Institution
                  </label>
                  <input
                    id="onboarding-institution"
                    maxLength={FIELD_LIMITS.current_institution}
                    type="text"
                    value={draft.current_institution || ''}
                    onChange={(e) => setDraft({ ...draft, current_institution: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1" htmlFor="onboarding-role">
                    Role / Position
                  </label>
                  <input
                    id="onboarding-role"
                    maxLength={FIELD_LIMITS.institutional_role}
                    type="text"
                    value={draft.institutional_role || ''}
                    onChange={(e) => setDraft({ ...draft, institutional_role: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1" htmlFor="onboarding-biography">
                  Academic Biography
                </label>
                <textarea
                  id="onboarding-biography"
                  rows={3}
                  maxLength={FIELD_LIMITS.biography}
                  aria-describedby="onboarding-biography-count"
                  value={draft.biography || ''}
                  onChange={(e) => setDraft({ ...draft, biography: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <p id="onboarding-biography-count" className="mt-1 text-right text-[11px] text-slate-400">
                  {(draft.biography || '').length.toLocaleString('en-US')} / {FIELD_LIMITS.biography.toLocaleString('en-US')} characters
                </p>
              </div>
            </div>

            {/* Confessional Standards & Historic Creeds */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp">
              <h2 className="text-sm font-display font-bold tracking-tight text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
                2. Confessional Standards & Historic Creeds
              </h2>
              <ConfessionalStandardsSelector
                value={draft.confessions || []}
                standards={taxonomy.confessions}
                // Rows may hold an unset adherence level; Save is blocked until each is chosen.
                onChange={(val) => setDraft({ ...draft, confessions: val as RevisionSnapshotData['confessions'] })}
              />
            </div>

            {/* Disciplines & Traditions */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp space-y-4">
              <h2 className="text-sm font-display font-bold tracking-tight text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                Disciplines & Traditions
              </h2>
              <div role="status" aria-live="polite" className="sr-only">{cvAnnouncement}</div>
              {cvNotices.length > 0 && (
                <div
                  data-testid="cv-import-notice"
                  className="p-3 rounded-xl bg-sky-50 text-sky-900 border border-sky-200 text-xs space-y-1"
                >
                  {cvNotices.map((n) => (
                    <p key={n}>{n}</p>
                  ))}
                </div>
              )}
              {unmatchedSuggestions.length > 0 && (
                <div
                  data-testid="cv-unmatched-notice"
                  className="p-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs space-y-1"
                >
                  <p className="font-semibold">
                    Your CV suggested these entries, but they match no discipline or tradition on the platform. Choose the closest options below, then mark each entry as handled.
                  </p>
                  <ul className="space-y-1">
                    {unmatchedSuggestions.map((u) => (
                      <li key={`${u.kind}:${u.value}`} className="flex items-center justify-between gap-2">
                        <span>
                          {u.kind === 'discipline' ? 'Discipline' : 'Tradition'}: {u.value}
                        </span>
                        <button
                          type="button"
                          onClick={() => resolveSuggestion(u)}
                          aria-label={`Mark ${u.kind} ${u.value} as handled`}
                          className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                        >
                          Handled
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Disciplines</h3>
                <TaxonomyMultiSelect
                  label="Disciplines"
                  noun="discipline"
                  testIdPrefix="discipline"
                  options={taxonomy.disciplines}
                  value={draft.disciplines || []}
                  onChange={(val) => setDraft({ ...draft, disciplines: val })}
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Traditions</h3>
                <PublicDataNotice subject="Your traditions" testId="tradition-public-notice" />
                <TaxonomyMultiSelect
                  label="Traditions"
                  noun="tradition"
                  testIdPrefix="tradition"
                  options={taxonomy.traditions}
                  value={draft.traditions || []}
                  onChange={(val) => setDraft({ ...draft, traditions: val })}
                />
              </div>
            </div>

            {/* Credentials */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp space-y-3">
              <h2 className="text-sm font-display font-bold tracking-tight text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                Academic Credentials
              </h2>
              <CredentialsEditor
                value={draft.credentials || []}
                onChange={(val) => setDraft({ ...draft, credentials: val })}
              />
            </div>

            {/* Publications */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp space-y-3">
              <h2 className="text-sm font-display font-bold tracking-tight text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                Publications
              </h2>
              <PublicationsEditor
                value={draft.publications || []}
                onChange={(val) => setDraft({ ...draft, publications: val })}
              />
            </div>

            {/* Doctrinal Statement */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp">
              <h2 className="text-sm font-display font-bold tracking-tight text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
                3. Personal Doctrinal Statement
              </h2>
              <DoctrinalStatementForm
                value={draft.doctrinal_statement_text || ''}
                onChange={(val) => setDraft({ ...draft, doctrinal_statement_text: val })}
              />
            </div>

            {(submitted || saveErrors) && (
              <div role="alert" className="p-3.5 rounded-xl text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200 space-y-1">
                <p>{submitted ? SUBMITTED_MESSAGE : saveErrors}</p>
                {submitted && (
                  <Link href="/dashboard/profile" className="font-semibold underline">
                    Go to your profile page
                  </Link>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl transition-all"
              >
                ← Back to Upload
              </button>

              {saveBlockedReason && (
                <span id="onboarding-save-blocked" data-testid="onboarding-save-blocked" role="status" className="text-xs text-amber-800 max-w-xs text-right">
                  {saveBlockedReason}
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveOnboarding}
                aria-describedby={saveBlockedReason ? 'onboarding-save-blocked' : undefined}
                disabled={isSaving || submitted || !!saveBlockedReason}
                className="px-6 py-2.5 bg-indigo-900 hover:bg-indigo-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <span>{isSaving ? 'Creating Draft Revision...' : 'Confirm & Save Initial Revision →'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 'success' && (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-7 h-7 stroke-[2.5]" />
            </div>

            <h2 className="text-xl font-display font-bold tracking-tight text-slate-900 dark:text-white">
              Profile Revision Staged!
            </h2>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Your initial profile draft is securely saved. You can now manage syllabi, adjust availability, and submit your revision for admin review when ready.
            </p>

            <div className="pt-2 flex flex-col gap-2">
              <Link
                href="/dashboard"
                className="w-full py-2.5 px-4 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                Go to Scholar Dashboard
              </Link>
              <Link
                href="/dashboard/profile"
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
              >
                Edit Complete Profile
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
