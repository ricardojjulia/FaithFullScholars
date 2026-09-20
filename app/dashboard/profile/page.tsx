'use client';

import { useState } from 'react';
import { ScholarProfileForm } from '@/components/forms/scholar-profile-form';
import { RevisionSnapshotData } from '@/lib/domain/types';
import { buildDraftSnapshot } from '@/lib/profiles/revision-actions';

const DEFAULT_PUBLISHED_SNAPSHOT: RevisionSnapshotData = {
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

export default function ProfileEditorPage() {
  const [draft, setDraft] = useState<RevisionSnapshotData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('fs_draft_revision');
        if (stored) {
          const parsed = JSON.parse(stored);
          return buildDraftSnapshot(DEFAULT_PUBLISHED_SNAPSHOT, parsed);
        }
      } catch {
        // fallback
      }
    }
    return DEFAULT_PUBLISHED_SNAPSHOT;
  });

  async function handleSaveDraft(updated: RevisionSnapshotData) {
    try {
      sessionStorage.setItem('fs_draft_revision', JSON.stringify(updated));
      setDraft(updated);
      return { success: true };
    } catch {
      return { success: false, error: 'Could not write draft to local session.' };
    }
  }

  async function handleSubmitReview(updated: RevisionSnapshotData) {
    try {
      sessionStorage.setItem('fs_draft_revision', JSON.stringify(updated));
      sessionStorage.setItem('fs_revision_status', 'submitted');
      setDraft(updated);
      return { success: true };
    } catch {
      return { success: false, error: 'Could not submit revision.' };
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-slate-900 dark:text-white">
            Profile & Doctrinal Revision Editor
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Edit your public academic profile. In accordance with ADR 0005, changes stage to a new draft revision and will not alter your live listing until reviewed.
          </p>
        </div>
      </div>

      <ScholarProfileForm
        initialDraft={draft}
        publishedSnapshot={DEFAULT_PUBLISHED_SNAPSHOT}
        onSaveDraft={handleSaveDraft}
        onSubmitForReview={handleSubmitReview}
      />
    </div>
  );
}
