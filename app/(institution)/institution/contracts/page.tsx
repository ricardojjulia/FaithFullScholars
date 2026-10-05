import React from 'react';
import { requireInstitutionMember } from '@/lib/auth/guards';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getInstitutionContracts } from '@/lib/contracts/contract-service';
import { formatContractType, formatContractStatus } from '@/lib/contracts/types';
import Link from 'next/link';
import { FileText, Plus, Calendar, DollarSign, UserCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Faculty Engagement Contracts | Institution Portal',
  description: 'Manage formal academic agreements, milestone deliverables, and honorarium terms.',
};

export default async function InstitutionContractsPage() {
  // Guard here, not only in the layout: layouts do not stop pages from rendering.
  await requireInstitutionMember();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let contracts: ReturnType<typeof getInstitutionContracts> extends Promise<infer T> ? T : never = [];
  let institutionName = 'Your Institution';

  if (user) {
    const { data: instUser } = await supabase
      .from('institution_users')
      .select('institution_id, institutions(name)')
      .eq('account_id', user.id)
      .maybeSingle();

    if (instUser) {
      institutionName = ((instUser.institutions as unknown) as { name: string })?.name || institutionName;
      contracts = await getInstitutionContracts(instUser.institution_id);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
              Faculty Engagement Contracts
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {institutionName} &bull; Formalize adjunct appointments, modular intensives, guest lectures, and speaking agreements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/institution/inquiries"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Review Inquiries
          </Link>
          <Link
            href="/institution/subscription"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Manage Quota
          </Link>
        </div>
      </div>

      {/* Contracts Table / List */}
      {contracts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            No active engagement contracts
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            When you accept or convert a faculty outreach inquiry, you can generate a formal agreement with structured milestone deliverables and honorarium terms.
          </p>
          <Link
            href="/institution/inquiries"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl hover:bg-indigo-100 transition"
          >
            Go to Inquiries
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {contracts.map((contract) => {
              const statusInfo = formatContractStatus(contract.status);

              return (
                <div
                  key={contract.id}
                  className="p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {formatContractType(contract.opportunity_type)}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          statusInfo.variant === 'success'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : statusInfo.variant === 'info'
                            ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                            : statusInfo.variant === 'danger'
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {contract.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                        <strong>{contract.scholar?.full_name || 'Scholar'}</strong> ({contract.scholar?.primary_institution || 'Independent'})
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Start: {contract.start_date}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        {contract.currency} {Number(contract.total_compensation_amount).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Link
                      href={`/institution/contracts/${contract.id}`}
                      className="px-3.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/60 rounded-xl transition"
                    >
                      View Agreement & Milestones
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
