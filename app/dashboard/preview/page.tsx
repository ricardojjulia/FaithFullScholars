'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, Check, GraduationCap, Loader2 } from 'lucide-react';
import { ScholarProfileHero } from '@/components/scholars/scholar-profile-hero';
import { ScholarDoctrinalCard } from '@/components/scholars/scholar-doctrinal-card';
import { FullPublicScholarProfile } from '@/lib/domain/queries';
import { RevisionSnapshotData } from '@/lib/domain/types';
import {
  RevisionState,
  describeFailure,
  fetchRevisionState,
  submitRevision,
  withdrawRevision
} from '@/components/dashboard/revision-client';

export default function DraftPreviewPage() {
  const router = useRouter();
  const [state, setState] = useState<RevisionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchRevisionState();
    if (!res.ok) {
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      setLoadError(res.status === 404 ? 'No scholar profile was found for this account.' : describeFailure(res));
      return;
    }
    setLoadError(null);
    setState(res.data);
  }, [router]);

  useEffect(() => {
    let active = true;
    (async () => {
      await load();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [load]);

  async function handleSubmitReview() {
    if (!state?.revision) return;
    setSubmitting(true);
    setSubmitError(null);
    const res = await submitRevision(state.revision.id);
    if (!res.ok) {
      setSubmitError(describeFailure(res));
      if (res.status === 409) await load();
    } else {
      await load();
    }
    setSubmitting(false);
  }

  async function handleWithdraw() {
    if (!state?.revision) return;
    setSubmitting(true);
    setSubmitError(null);
    const res = await withdrawRevision(state.revision.id);
    if (!res.ok) setSubmitError(describeFailure(res));
    await load();
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400" role="status">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        <span>Loading your draft preview...</span>
      </div>
    );
  }

  if (!state) {
    return (
      <div role="alert" className="p-4 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 text-xs">
        {loadError ?? 'Unable to load your draft preview.'}
      </div>
    );
  }

  if (!state.revision) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3 max-w-md mx-auto">
        <h1 className="text-lg font-display font-bold text-slate-900 dark:text-white">No draft to preview</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          You have no unpublished draft. Start one in the profile editor to see how your changes will look.
        </p>
        <Link
          href="/dashboard/profile"
          className="inline-block px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold rounded-xl transition-colors"
        >
          Go to the profile editor
        </Link>
      </div>
    );
  }

  const revision = state.revision;
  const draft: RevisionSnapshotData = revision.snapshot_data;
  const canSubmit = revision.status === 'draft' || revision.status === 'changes_requested';
  const isSubmitted = revision.status === 'submitted';

  // Construct typed preview scholar for canonical component reuse
  const previewScholar: FullPublicScholarProfile = {
    id: state.scholar.id,
    account_id: '',
    slug: state.scholar.slug,
    full_name: draft.full_name,
    title: draft.title ?? null,
    profile_photo_path: null,
    current_institution: draft.current_institution ?? null,
    institutional_role: draft.institutional_role ?? null,
    biography: draft.biography ?? null,
    location: draft.location ?? null,
    timezone: draft.timezone ?? 'America/New_York',
    contact_preference: 'platform_inquiry',
    doctrinal_statement_text: draft.doctrinal_statement_text ?? null,
    doctrinal_statement_path: null,
    profile_status: state.scholar.profile_status as FullPublicScholarProfile['profile_status'],
    verification_status: state.scholar.verification_status as FullPublicScholarProfile['verification_status'],
    profile_tier: 'standard',
    orcid_id: null,
    google_scholar_url: null,
    published_revision_id: state.baseline.revision_id,
    draft_revision_id: revision.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    disciplines: (draft.disciplines || []).map((name: string) => ({
      discipline: {
        id: name,
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        category: 'theology',
        description: null,
        created_at: new Date().toISOString()
      },
      is_primary: true
    })),
    traditions: (draft.traditions || []).map((name: string) => ({
      tradition: {
        id: name,
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: null,
        created_at: new Date().toISOString()
      },
      is_primary: true
    })),
    confessions: (draft.confessions || []).map((c, i: number) => ({
      id: `conf-${i}`,
      scholar_id: state.scholar.id,
      confessional_standard_id: c.confessional_standard_id,
      adherence_level: c.adherence_level,
      exception_notes: c.exception_notes || null,
      created_at: new Date().toISOString(),
      confessional_standard: {
        id: c.confessional_standard_id,
        name: c.confessional_standard_name || c.confessional_standard_id,
        slug: (c.confessional_standard_name || c.confessional_standard_id).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        year: null,
        tradition_affinity: null,
        description: null,
        created_at: new Date().toISOString()
      }
    })),
    credentials: (draft.credentials || []).map((c, i: number) => ({
      id: `cred-${i}`,
      scholar_id: state.scholar.id,
      degree: c.degree,
      field_of_study: c.field_of_study,
      institution_name: c.institution_name,
      year_awarded: c.year_awarded ?? null,
      is_terminal: c.is_terminal,
      display_order: i,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })),
    publications: (draft.publications || []).map((p, i: number) => ({
      id: `pub-${i}`,
      scholar_id: state.scholar.id,
      title: p.title,
      publication_type: p.publication_type,
      publisher_or_journal: p.publisher_or_journal ?? null,
      year: p.year ?? null,
      doi_or_url: p.doi_or_url ?? null,
      citation_text: p.citation_text ?? null,
      display_order: i,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })),
    courses: [],
    media_links: [],
    availability: null
  };

  return (
    <div className="space-y-6">
      {/* Floating Staging Notification Banner */}
      <div className="bg-amber-500 text-slate-950 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400/80 dark:bg-amber-600/80 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block">
              Draft Revision Staging Preview (ADR 0005)
            </span>
            <span className="text-xs font-medium">
              This preview reflects your staged changes. Public visitors continue to see your approved live profile.
            </span>
            <span className="text-[11px] font-medium block mt-1">
              On approval, your name, titles, biography, location, links and doctrinal statement are published. Disciplines, traditions, confessional standards, credentials and publications are reviewed but not yet published automatically.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/profile"
            className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Editor</span>
          </Link>

          {canSubmit && (
            <button
              type="button"
              onClick={handleSubmitReview}
              disabled={submitting}
              className="px-3 py-1.5 bg-white text-slate-950 hover:bg-slate-100 disabled:opacity-50 text-xs font-bold rounded-xl transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              {submitting ? 'Submitting...' : 'Submit for Admin Review'}
            </button>
          )}
          {isSubmitted && (
            <>
              <span role="status" className="px-3 py-1.5 bg-emerald-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Submitted for Review</span>
              </span>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={submitting}
                className="px-3 py-1.5 bg-white text-slate-950 hover:bg-slate-100 disabled:opacity-50 text-xs font-bold rounded-xl transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                {submitting ? 'Withdrawing...' : 'Withdraw'}
              </button>
            </>
          )}
        </div>
      </div>

      {submitError && (
        <div role="alert" className="p-3.5 rounded-xl text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200">
          {submitError}
        </div>
      )}

      {/* Main Preview Container */}
      <div className="space-y-6">
        {/* LinkedIn-Style Profile Hero Card */}
        <ScholarProfileHero scholar={previewScholar} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Center 2 Columns: Credentials & Publications */}
          <div className="lg:col-span-2 space-y-6">
            {/* Academic Credentials Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm card-crisp space-y-4">
              <h3 className="text-base font-display font-bold tracking-tight text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                Education & Credentials
              </h3>
              <div className="space-y-3">
                {previewScholar.credentials.map((cred) => (
                  <div key={cred.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {cred.degree} {cred.field_of_study ? `in ${cred.field_of_study}` : ''}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {cred.institution_name} {cred.year_awarded ? `• ${cred.year_awarded}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scholarly Publications Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm card-crisp space-y-4">
              <h3 className="text-base font-display font-bold tracking-tight text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                Selected Scholarly Publications
              </h3>
              <div className="space-y-3">
                {previewScholar.publications.map((pub) => (
                  <div key={pub.id} className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                    <span className="font-semibold text-slate-900 dark:text-white block">
                      {pub.title}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      {pub.citation_text || pub.publisher_or_journal} {pub.year ? `(${pub.year})` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Rail: Doctrinal Statement & Confessions */}
          <div className="space-y-6">
            <ScholarDoctrinalCard scholar={previewScholar} />
          </div>
        </div>
      </div>
    </div>
  );
}
