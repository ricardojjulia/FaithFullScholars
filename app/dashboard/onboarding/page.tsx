'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CvUploadParser } from '@/components/forms/cv-upload-parser';
import { ParsedCvDraft } from '@/lib/profiles/cv-parser';
import { RevisionSnapshotData, PublicationType } from '@/lib/domain/types';
import { ConfessionalStandardsSelector } from '@/components/forms/confessional-standards-selector';
import { DoctrinalStatementForm } from '@/components/forms/doctrinal-statement-form';
import { buildDraftSnapshot } from '@/lib/profiles/revision-actions';

function mapPubType(type: string): PublicationType {
  switch (type) {
    case 'book':
      return 'book';
    case 'monograph':
      return 'monograph';
    case 'journal_article':
      return 'journal_article';
    case 'book_chapter':
      return 'book_chapter';
    case 'essay':
      return 'popular_essay';
    default:
      return 'journal_article';
  }
}

export default function OnboardingPage() {
  const [step, setStep] = useState<'upload' | 'review' | 'success'>('upload');
  const [draft, setDraft] = useState<RevisionSnapshotData>(buildDraftSnapshot(null, {}));
  const [isSaving, setIsSaving] = useState(false);

  function handleCvParsed(parsed: ParsedCvDraft) {
    const populated = buildDraftSnapshot(null, {
      full_name: parsed.full_name || '',
      title: parsed.title || '',
      current_institution: parsed.current_institution || '',
      institutional_role: parsed.institutional_role || '',
      biography: parsed.biography || '',
      credentials: parsed.credentials.map((c) => ({
        degree: c.degree,
        field_of_study: c.field || 'Theological Studies',
        institution_name: c.institution,
        year_awarded: c.year ?? null,
        is_terminal: ['Ph.D.', 'Th.D.', 'D.Min.'].includes(c.degree)
      })),
      publications: parsed.publications.map((p) => ({
        title: p.title,
        publication_type: mapPubType(p.publication_type),
        year: p.year ?? null,
        citation_text: p.citation_string
      })),
      disciplines: parsed.suggested_disciplines,
      traditions: parsed.suggested_traditions,
      doctrinal_statement_text: parsed.personal_doctrinal_statement || ''
    });

    setDraft(populated);
    setStep('review');
  }

  function handleSaveOnboarding() {
    setIsSaving(true);
    // Persist draft in sessionStorage for immediate dashboard preview
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('fs_draft_revision', JSON.stringify(draft));
      }
    } catch {
      // non-blocking
    }

    setTimeout(() => {
      setIsSaving(false);
      setStep('success');
    }, 400);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Onboarding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-300 text-xs font-semibold">
            <span>✨ Scholar Onboarding Wizard</span>
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
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Professional Name
                  </label>
                  <input
                    type="text"
                    value={draft.full_name || ''}
                    onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Title / Headline
                  </label>
                  <input
                    type="text"
                    value={draft.title || ''}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Current Institution
                  </label>
                  <input
                    type="text"
                    value={draft.current_institution || ''}
                    onChange={(e) => setDraft({ ...draft, current_institution: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role / Position
                  </label>
                  <input
                    type="text"
                    value={draft.institutional_role || ''}
                    onChange={(e) => setDraft({ ...draft, institutional_role: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Academic Biography
                </label>
                <textarea
                  rows={3}
                  value={draft.biography || ''}
                  onChange={(e) => setDraft({ ...draft, biography: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Confessional Standards & Historic Creeds */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm card-crisp">
              <h2 className="text-sm font-display font-bold tracking-tight text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
                2. Confessional Standards & Historic Creeds
              </h2>
              <ConfessionalStandardsSelector
                value={draft.confessions || []}
                onChange={(val) => setDraft({ ...draft, confessions: val })}
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

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl transition-all"
              >
                ← Back to Upload
              </button>

              <button
                type="button"
                onClick={handleSaveOnboarding}
                disabled={isSaving || !draft.full_name}
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
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl mx-auto shadow-inner">
              ✓
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
