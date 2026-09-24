import React from 'react';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getScholarLicensingAgreements } from '@/lib/licensing/licensing-service';
import Link from 'next/link';
import { BookOpen, DollarSign, Award, Clock, FileCheck } from 'lucide-react';
import { AccreditationBadge } from '@/components/accreditation/accreditation-badge';

export const metadata: Metadata = {
  title: 'Course Licensing & Syllabi Royalties | Scholar Dashboard',
  description: 'Manage institutional curriculum licenses, syllabus adoption royalties, and countersign agreements.',
};

export default async function ScholarLicensingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let agreements: Awaited<ReturnType<typeof getScholarLicensingAgreements>> = [];
  let scholarName = 'Scholar';

  if (user) {
    const { data: scholar } = await supabase
      .from('scholars')
      .select('id, full_name')
      .eq('account_id', user.id)
      .maybeSingle();

    if (scholar) {
      scholarName = scholar.full_name;
      agreements = await getScholarLicensingAgreements(scholar.id);
    }
  }

  const totalRoyalties = agreements
    .filter((a) => a.status === 'active')
    .reduce((sum, a) => sum + Number(a.royalty_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
              Course Licensing & Syllabi Royalties
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {scholarName} &bull; Manage syllabus distribution agreements, modular curriculum adoptions, and institutional royalties.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/courses"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            My Course Catalog
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Active Royalties</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              ${totalRoyalties.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Active Institutional Licenses</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {agreements.filter((a) => a.status === 'active').length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Requests Awaiting Signing</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {agreements.filter((a) => a.status === 'requested').length}
            </p>
          </div>
        </div>
      </div>

      {/* Licensing Agreements List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Institutional Licensing Inquiries & Agreements ({agreements.length})
          </h2>
        </div>

        {agreements.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Licensing Agreements Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              When partner seminaries request adoption of your course curricula or syllabi, they will appear here.
            </p>
            <Link
              href="/dashboard/courses"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition"
            >
              Add Course to Catalog
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {agreements.map((agr) => (
              <div
                key={agr.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        agr.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : agr.status === 'requested'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {agr.status}
                    </span>
                    <span className="text-xs text-slate-400">
                      {agr.license_type.replace(/_/g, ' ')}
                    </span>
                    {agr.institution?.accreditation_body && (
                      <AccreditationBadge
                        body={agr.institution.accreditation_body}
                        status={agr.institution.accreditation_status}
                        showDetails={false}
                      />
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {agr.course?.title || 'Course Curriculum'}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      Seminary:{' '}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {agr.institution?.name || 'Institution'}
                      </span>
                    </span>
                    <span>&bull;</span>
                    <span>
                      Duration:{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {agr.term_duration.replace(/_/g, ' ')}
                      </span>
                    </span>
                    {agr.custom_terms && (
                      <>
                        <span>&bull;</span>
                        <span className="italic text-slate-600 dark:text-slate-400 max-w-md truncate">
                          &quot;{agr.custom_terms}&quot;
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Royalty Offer</p>
                    <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                      ${Number(agr.royalty_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  {agr.status === 'requested' && (
                    <form
                      action={`/api/dashboard/licensing/${agr.id}/sign`}
                      method="POST"
                    >
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        Countersign & Accept
                      </button>
                    </form>
                  )}

                  {agr.status === 'active' && (
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-lg">
                      Active License
                    </span>
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
