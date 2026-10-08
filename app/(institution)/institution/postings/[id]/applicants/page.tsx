import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireInstitutionMember } from '@/lib/auth/guards';
import { getPostingApplicantReport, type PostingApplicantReport } from '@/lib/postings/applicant-service';
import { PortalQueryError } from '@/lib/inquiries/queries';
import { DataErrorPanel } from '@/components/portal/data-error-panel';
import { PostingApplicantMatrix } from '@/components/institution/posting-applicant-matrix';

export const metadata: Metadata = {
  title: 'Search Committee Applicant Matrix | Institution Portal',
  description: 'Comparative candidate application dossier triage and ATS Standard 3 credentials matrix.',
};

export default async function PostingApplicantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  // Guard here, not only in the layout: layouts do not stop pages from rendering.
  const { session } = await requireInstitutionMember(supabase);

  // Read with the member's own client under RLS: only their institutions' applications can come back.
  let report: PostingApplicantReport | null = null;
  let loadFailed = false;
  try {
    report = await getPostingApplicantReport(supabase, id, session.institutionIds);
  } catch (err) {
    loadFailed = true;
    console.error('Applicant matrix failed to load (code):', err instanceof PortalQueryError ? err.code : 'unknown');
  }

  if (!loadFailed && !report) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div className="print:hidden">
        <Link
          href="/institution/postings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Opportunities & Calls</span>
        </Link>
      </div>

      {report ? <PostingApplicantMatrix report={report} /> : <DataErrorPanel what="the applicants" />}
    </div>
  );
}
