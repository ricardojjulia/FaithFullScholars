'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ScholarProfileHero } from '@/components/scholars/scholar-profile-hero';
import { ScholarDoctrinalCard } from '@/components/scholars/scholar-doctrinal-card';
import { FullPublicScholarProfile } from '@/lib/domain/queries';
import { RevisionSnapshotData } from '@/lib/domain/types';

const FALLBACK_PREVIEW_DRAFT: RevisionSnapshotData = {
  full_name: 'Dr. Benjamin H. Edwards, Ph.D.',
  title: 'Professor of New Testament Studies',
  current_institution: 'Westminster Theological Seminary',
  institutional_role: 'Professor',
  biography:
    'Dr. Edwards specializes in Pauline epistles, the New Perspective on Paul, and biblical Greek syntax. He has taught for over fifteen years in theological higher education.',
  location: 'Glenside, PA, USA',
  timezone: 'America/New_York',
  doctrinal_statement_text:
    'I affirm the plenary inspiration and inerrancy of the Holy Scriptures. I heartily subscribe to the Westminster Confession of Faith and Catechisms.',
  disciplines: ['New Testament & Early Christianity', 'Biblical Languages'],
  traditions: ['Reformed & Presbyterian'],
  confessions: [
    {
      confessional_standard_id: 'standard-westminster',
      confessional_standard_name: 'Westminster Confession of Faith (1646)',
      adherence_level: 'full_subscription'
    },
    {
      confessional_standard_id: 'standard-nicene',
      confessional_standard_name: 'Nicene-Constantinopolitan Creed (381)',
      adherence_level: 'full_subscription'
    }
  ],
  credentials: [
    {
      degree: 'Ph.D.',
      field_of_study: 'New Testament',
      institution_name: 'University of Cambridge',
      year_awarded: 2018,
      is_terminal: true
    },
    {
      degree: 'Th.M.',
      field_of_study: 'Biblical Studies',
      institution_name: 'Westminster Theological Seminary',
      year_awarded: 2014,
      is_terminal: false
    }
  ],
  publications: [
    {
      title: 'The Gospel According to Paul: Justification and Union with Christ',
      publication_type: 'book',
      year: 2021,
      citation_text: 'Baker Academic, 2021'
    }
  ]
};

export default function DraftPreviewPage() {
  const [draft] = useState<RevisionSnapshotData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('fs_draft_revision');
        if (stored) {
          return JSON.parse(stored);
        }
      } catch {
        // fallback
      }
    }
    return FALLBACK_PREVIEW_DRAFT;
  });
  const [submitted, setSubmitted] = useState(false);

  function handleSubmitReview() {
    setSubmitted(true);
  }

  // Construct typed mock scholar for canonical component reuse
  const mockScholar: FullPublicScholarProfile = {
    id: 'preview-draft',
    account_id: 'acc-preview',
    slug: 'benjamin-edwards',
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
    profile_status: 'draft',
    verification_status: 'verified',
    published_revision_id: null,
    draft_revision_id: 'preview-draft',
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
      scholar_id: 'preview-draft',
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
      scholar_id: 'preview-draft',
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
      scholar_id: 'preview-draft',
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
    availability: {
      id: 'avail-preview',
      scholar_id: 'preview-draft',
      is_available_for_hire: true,
      opportunity_types: ['adjunct_teaching', 'online_instruction', 'intensives_modular'],
      preferred_delivery_modes: ['online_async', 'in_person_modular'],
      available_terms: ['Fall 2026', 'Spring 2027'],
      notes: null,
      updated_at: new Date().toISOString()
    }
  };

  return (
    <div className="space-y-6">
      {/* Floating Staging Notification Banner */}
      <div className="bg-amber-500 text-slate-950 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🛡️</span>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block">
              Draft Revision Staging Preview (ADR 0005)
            </span>
            <span className="text-xs font-medium">
              This preview reflects your staged changes. Public visitors continue to see your approved live profile.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/profile"
            className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-xl transition-colors"
          >
            ← Return to Editor
          </Link>

          {!submitted ? (
            <button
              type="button"
              onClick={handleSubmitReview}
              className="px-3 py-1.5 bg-white text-slate-950 hover:bg-slate-100 text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              Submit for Admin Review
            </button>
          ) : (
            <span className="px-3 py-1.5 bg-emerald-700 text-white text-xs font-bold rounded-xl">
              ✓ Submitted for Review
            </span>
          )}
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="space-y-6">
        {/* LinkedIn-Style Profile Hero Card */}
        <ScholarProfileHero scholar={mockScholar} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Center 2 Columns: Credentials & Publications */}
          <div className="lg:col-span-2 space-y-6">
            {/* Academic Credentials Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm card-crisp space-y-4">
              <h3 className="text-base font-display font-bold tracking-tight text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                Education & Credentials
              </h3>
              <div className="space-y-3">
                {mockScholar.credentials.map((cred) => (
                  <div key={cred.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                      🎓
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
                {mockScholar.publications.map((pub) => (
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
            <ScholarDoctrinalCard scholar={mockScholar} />
          </div>
        </div>
      </div>
    </div>
  );
}
