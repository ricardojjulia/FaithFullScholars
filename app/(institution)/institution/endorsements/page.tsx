import Link from 'next/link';
import { Metadata } from 'next';
import { ShieldCheck, UserCheck, ExternalLink, Calendar, Award } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getSessionContext } from '@/lib/auth/session';
import { getEndorsementsByInstitution } from '@/lib/endorsements/institutional-endorsement-service';
import { IssueEndorsementButton } from '@/components/institution/issue-endorsement-button';

export const metadata: Metadata = {
  title: 'Institutional Endorsements | Institution Portal',
  description: 'Issue and manage authoritative institutional endorsements for theological scholars.',
};

export default async function InstitutionEndorsementsPage() {
  const supabase = await createClient();
  // The institution layout guarantees a signed-in institution member.
  const session = await getSessionContext(supabase);
  const institutionId = session!.institutionIds[0];
  const endorsements = await getEndorsementsByInstitution(institutionId);

  const { data: scholarsData } = await supabase
    .from('scholars')
    .select('id, full_name, title')
    .eq('profile_status', 'approved')
    .order('full_name');

  const scholars = (scholarsData || []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    title_or_position: s.title,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-amber-600 dark:text-amber-500 shrink-0" />
            <span>Official Faculty & Scholar Endorsements</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Authoritative institutional endorsements confirm faculty appointments, visiting lectureships, and verified theological scholarship.
          </p>
        </div>

        <IssueEndorsementButton scholars={scholars} />
      </div>

      {/* Advisory Banner */}
      <div className="card-crisp bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/50 p-5 rounded-2xl flex items-start gap-4">
        <Award className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <span className="font-semibold text-amber-950 dark:text-amber-100">
            About Institutional Endorsements vs. Colleague Commendations
          </span>
          <p className="leading-relaxed text-amber-800/90 dark:text-amber-300/90">
            Unlike peer-to-peer scholar recommendations, institutional endorsements carry the formal weight and seal of an accredited seminary or college. They appear prominently on scholar profiles, affirming verified academic credentials and formal departmental roles.
          </p>
        </div>
      </div>

      {/* Endorsements List */}
      <div className="card-crisp bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Issued Endorsements ({endorsements.length})</span>
          </h2>
        </div>

        {endorsements.length === 0 ? (
          <div className="text-center py-12 p-6 space-y-3">
            <ShieldCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs text-slate-500">You have not issued any institutional endorsements yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {endorsements.map((e) => (
              <div
                key={e.id}
                className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="space-y-2 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                      {e.relationship_type}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {e.department_or_field}
                    </span>
                    {e.is_credential_verified && (
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 inline-flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Credential Verified</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-display font-bold text-slate-900 dark:text-white">
                      {e.scholar?.slug ? (
                        <Link
                          href={`/scholars/${e.scholar.slug}`}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-1.5"
                        >
                          <span>{e.scholar.full_name}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        </Link>
                      ) : (
                        e.scholar?.full_name || 'Endorsed Scholar'
                      )}
                    </h3>
                    {e.scholar?.title_or_position && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {e.scholar.title_or_position}
                      </p>
                    )}
                  </div>

                  <blockquote className="text-xs text-slate-600 dark:text-slate-300 italic border-l-2 border-amber-400 dark:border-amber-600 pl-3 py-0.5">
                    &ldquo;{e.endorsement_text}&rdquo;
                  </blockquote>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Issued: {new Date(e.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  {e.scholar?.slug && (
                    <Link
                      href={`/scholars/${e.scholar.slug}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                    >
                      <span>View Scholar Profile</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
