import React from 'react';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getInstitutionConsortiums } from '@/lib/consortium/consortium-service';
import Link from 'next/link';
import {
  Network,
  Building2,
  ExternalLink,
  ShieldCheck,
  Users,
  GraduationCap,
  Globe,
  BookOpen,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Seminary Consortia & Multi-Campus Systems | Institution Portal',
  description: 'Manage shared seminary consortia, multi-campus system accounts, and cross-campus visiting faculty.',
};

export default async function InstitutionConsortiumPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let institution = null;
  let consortia: Awaited<ReturnType<typeof getInstitutionConsortiums>> = [];

  if (user) {
    const { data: instUser } = await supabase
      .from('institution_users')
      .select('institution_id, institutions(id, name, location, website, status)')
      .eq('account_id', user.id)
      .maybeSingle();

    if (instUser) {
      institution = instUser.institutions as unknown as {
        id: string;
        name: string;
        location?: string;
        website?: string;
        status: string;
      };
      consortia = await getInstitutionConsortiums(instUser.institution_id);
    }
  }



  const institutionName = institution?.name || 'Your Institution';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Network className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
              Seminary Consortia & Multi-Campus Systems
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {institutionName} &bull; Cross-campus visiting faculty, shared adjunct discovery, and collaborative academic partnerships.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/institution/contracts"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Engagement Contracts</span>
          </Link>
          <Link
            href="/scholars"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Discover Faculty</span>
          </Link>
        </div>
      </div>

      {/* Strategic Overview Card */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 border border-indigo-900/60 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-0 pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Theological Higher Education Network Model (ADR 0012)</span>
          </div>
          <h2 className="text-xl font-bold font-display tracking-tight text-white">
            Federated Academic Collaboration for Confessional Seminaries
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Consortium accounts empower multi-campus seminary systems (e.g. RTS 6-campus system) and regional theological associations (ARTS, BTI, ACTS) to share vetted adjunct rosters, coordinate visiting doctoral modular intensives, and maintain unified confessional standards across campuses.
          </p>
        </div>
      </div>

      {/* Consortia List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Affiliated Consortia & Systems</span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {consortia.length}
            </span>
          </h2>
        </div>

        {consortia.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
            <Network className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3 stroke-[1.5]" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
              No Consortium Affiliation Found
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              Your seminary is not yet registered in an academic consortium or multi-campus system.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/institution/subscription"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <span>Upgrade to Premier Partner</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {consortia.map((consortium) => {
              const isLead = consortium.lead_institution_id === institution?.id;
              const members = consortium.members || [];

              return (
                <div
                  key={consortium.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-all"
                >
                  {/* Consortium Card Header */}
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                            {consortium.name}
                          </h3>
                          {isLead ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <ShieldCheck className="w-3 h-3" />
                              <span>System / Consortium Lead</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <Building2 className="w-3 h-3" />
                              <span>Member Institution</span>
                            </span>
                          )}
                        </div>
                        {consortium.description && (
                          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                            {consortium.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {consortium.website && (
                          <a
                            href={consortium.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span>Consortium Portal</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Member Institutions Grid */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span>Sister Campuses & Member Institutions ({members.length})</span>
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {members.map((member) => {
                        const inst = member.institution;
                        const roleColor =
                          member.role === 'lead'
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : member.role === 'member'
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';

                        return (
                          <div
                            key={member.id}
                            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h5 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                                  {inst?.name || 'Member Institution'}
                                </h5>
                                <span
                                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${roleColor} shrink-0`}
                                >
                                  {member.role === 'lead' ? 'Lead' : member.role === 'member' ? 'Member' : 'Affiliate'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {inst?.location || 'Regional Campus'}
                              </p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active Member
                              </span>
                              <Link
                                href={`/scholars?q=${encodeURIComponent(inst?.name || '')}`}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium text-[11px]"
                              >
                                View Faculty &rarr;
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Network Benefits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
            <Users className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Cross-Campus Adjunct Rosters
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Consortium deans share pre-vetted scholar candidate pools across sister campuses, minimizing redundant background checks and confessional vetting.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
            <GraduationCap className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Visiting Modular Intensives
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Coordinate residential modular courses, J-term intensives, and guest doctoral colloquia with verified faculty between member institutions.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Common Confessional Standards
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Align academic appointments with historic confessional boundaries, ensuring complete theological integrity across all system campuses.
          </p>
        </div>
      </div>
    </div>
  );
}
