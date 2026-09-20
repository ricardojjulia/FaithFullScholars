import React from 'react';
import { fetchPendingInstitutions } from '@/lib/admin/queries';
import { Building2, Globe, Mail } from 'lucide-react';
import { InstitutionActionButtons } from './institution-action-buttons';

export const dynamic = 'force-dynamic';

export default async function AdminInstitutionsPage() {
  const institutions = await fetchPendingInstitutions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Building2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span>Institution Verification & Accreditation</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review registered theological seminaries, colleges, and ministry programs before authorizing institutional search inquiry privileges.
          </p>
        </div>

        <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          {institutions.length} Institution{institutions.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Institution List */}
      {institutions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-3xl block mb-2">🏛️</span>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            No institutions registered
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Institutions will appear here when they register for recruitment access.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {institutions.map((inst) => (
            <div
              key={inst.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {inst.name}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {inst.institution_type.replace('_', ' ')}
                  </span>
                  <InstitutionStatusBadge status={inst.status} />
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{inst.contact_email}</span>
                  </span>
                  {inst.website && (
                    <a
                      href={inst.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span>{inst.website.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )}
                  {inst.location && <span>📍 {inst.location}</span>}
                </div>
              </div>

              <InstitutionActionButtons institutionId={inst.id} currentStatus={inst.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InstitutionStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300',
    approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
    rejected: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300',
    suspended: 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300',
  };

  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}
