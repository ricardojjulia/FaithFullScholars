import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getContractById } from '@/lib/contracts/contract-service';
import { formatContractType, formatContractStatus } from '@/lib/contracts/types';
import Link from 'next/link';
import { Calendar, DollarSign, User, Building, ChevronLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contract Agreement & Milestones | FaithFull Scholars',
};

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contract = await getContractById(id);

  if (!contract) {
    notFound();
  }

  const statusInfo = formatContractStatus(contract.status);

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Back link */}
      <div>
        <Link
          href="/institution/contracts"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Contracts
        </Link>
      </div>

      {/* Contract Banner Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {formatContractType(contract.opportunity_type)}
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  statusInfo.variant === 'success'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : statusInfo.variant === 'info'
                    ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {statusInfo.label}
              </span>
            </div>
            <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-white">
              {contract.title}
            </h1>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 uppercase tracking-wider block font-semibold">Total Honorarium</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {contract.currency} {Number(contract.total_compensation_amount).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Parties Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <Building className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Engaging Institution</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white block">
                {contract.institution?.name || 'Institution'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {[contract.institution?.city, contract.institution?.state_province].filter(Boolean).join(', ')}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Assigned Scholar / Faculty</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white block">
                {contract.scholar?.full_name || 'Scholar'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {contract.scholar?.current_title} &bull; {contract.scholar?.primary_institution}
              </span>
            </div>
          </div>
        </div>

        {/* Scope of Work */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Scope of Academic Engagement
          </h2>
          <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            {contract.scope_of_work}
          </div>
        </div>

        {/* Dates & Payment Terms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span><strong>Term Dates:</strong> {contract.start_date} to {contract.end_date || 'Term completion'}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span><strong>Payment Terms:</strong> {contract.payment_terms || 'Standard institutional milestone disbursement'}</span>
          </div>
        </div>
      </div>

      {/* Milestones Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-4">
        <h2 className="text-base font-bold font-display text-slate-900 dark:text-white">
          Deliverables & Scheduled Milestones
        </h2>

        {(!contract.milestones || contract.milestones.length === 0) ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
            No discrete milestones specified. Disbursement applies upon final completion of academic engagement.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {contract.milestones.map((m, idx) => (
              <div key={m.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{m.title}</h3>
                    {m.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{m.description}</p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    {contract.currency} {Number(m.compensation_amount).toLocaleString()}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {m.due_date ? `Due: ${m.due_date}` : 'Term Milestone'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
