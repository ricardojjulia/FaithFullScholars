import React from 'react';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getScholarContracts } from '@/lib/contracts/contract-service';
import { formatContractType, formatContractStatus } from '@/lib/contracts/types';
import Link from 'next/link';
import { FileText, Building2, Calendar, DollarSign } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Engagement Contracts | Scholar Workspace',
  description: 'Review formal institutional agreements, teaching terms, and milestone honorariums.',
};

export default async function ScholarContractsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let contracts: ReturnType<typeof getScholarContracts> extends Promise<infer T> ? T : never = [];

  if (user) {
    const { data: scholar } = await supabase
      .from('scholars')
      .select('id')
      .eq('account_id', user.id)
      .maybeSingle();

    if (scholar) {
      contracts = await getScholarContracts(scholar.id);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
              Institutional Engagement Contracts
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Review formal institutional agreements, adjunct teaching appointments, and guest speaking honorariums.
          </p>
        </div>

        <Link
          href="/dashboard/inquiries"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
        >
          View Inquiries Inbox
        </Link>
      </div>

      {/* Contracts List */}
      {contracts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            No active engagement agreements
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            When a verified seminary or college extends a formal contract following an inquiry, you will be able to review terms, milestones, and accept directly here.
          </p>
          <Link
            href="/dashboard/availability"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl hover:bg-indigo-100 transition"
          >
            Update Teaching & Speaking Availability
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
                  className="p-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
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
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {contract.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                        {contract.institution?.name || 'Institution'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Start: {contract.start_date}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        <DollarSign className="w-3.5 h-3.5" />
                        {contract.currency} {Number(contract.total_compensation_amount).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Link
                      href={`/institution/contracts/${contract.id}`}
                      className="px-4 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/60 rounded-xl transition"
                    >
                      Inspect Agreement
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
