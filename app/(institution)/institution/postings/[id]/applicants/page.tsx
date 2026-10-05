import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireInstitutionMember } from '@/lib/auth/guards';
import { getPostingApplicantReport } from '@/lib/postings/applicant-service';
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
  const { institutionId } = await requireInstitutionMember(supabase);

  const report = await getPostingApplicantReport(id, institutionId);

  if (!report) {
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

      <PostingApplicantMatrix report={report} />
    </div>
  );
}
