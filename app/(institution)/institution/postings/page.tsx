import Link from 'next/link';
import { Metadata } from 'next';
import { Plus, Briefcase, Calendar, Eye, Clock, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireInstitutionMember } from '@/lib/auth/guards';
import { getPostingsByInstitution, formatOpportunityType } from '@/lib/postings/postings-service';

export const metadata: Metadata = {
  title: 'Manage Opportunities & Teaching Calls | Institution Portal',
};

export default async function InstitutionPostingsPage() {
  const supabase = await createClient();
  // Guard here, not only in the layout: layouts do not stop pages from rendering.
  const { institutionId } = await requireInstitutionMember(supabase);

  const postings = await getPostingsByInstitution(institutionId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
            Academic Opportunities & Teaching Calls
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Post vacancies for adjunct instruction, intensive modular seminars, and faculty chairs.
          </p>
        </div>

        <Link
          href="/institution/postings/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Post New Opportunity</span>
        </Link>
      </div>

      {/* Postings Table / List */}
      <div className="card-crisp bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Active Institution Postings ({postings.length})</span>
          </h2>
        </div>

        {postings.length === 0 ? (
          <div className="text-center py-12 p-6 space-y-3">
            <Briefcase className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs text-slate-500">You have no active teaching calls or opportunity postings.</p>
            <Link
              href="/institution/postings/new"
              className="inline-block px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl"
            >
              Create Your First Posting
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {postings.map((p) => (
              <div
                key={p.id}
                className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                      {formatOpportunityType(p.opportunity_type)}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 uppercase tracking-wider">
                      {p.status}
                    </span>
                    {p.discipline && (
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {p.discipline.name}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-display font-bold text-slate-900 dark:text-white">
                    <Link href={`/opportunities/${p.slug}`} className="hover:text-indigo-600 transition-colors">
                      {p.title}
                    </Link>
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Term: {p.term}
                    </span>
                    {p.deadline && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Deadline: {p.deadline}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/institution/postings/${p.id}/applicants`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-800/60 rounded-xl transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Applicant Matrix</span>
                  </Link>
                  <Link
                    href={`/opportunities/${p.slug}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Public Page</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
