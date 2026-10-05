import React from 'react';
import { requireInstitutionMember } from '@/lib/auth/guards';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getInstitutionLicensingAgreements } from '@/lib/licensing/licensing-service';
import Link from 'next/link';
import { BookOpen, Award, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { AccreditationBadge } from '@/components/accreditation/accreditation-badge';

export const metadata: Metadata = {
  title: 'Course Licensing & Syllabi Distribution | Institution Portal',
  description: 'Manage formal course curricula licensing, syllabus adoptions, and accreditation compliance.',
};

export default async function InstitutionLicensingPage() {
  // Guard here, not only in the layout: layouts do not stop pages from rendering.
  await requireInstitutionMember();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let agreements: Awaited<ReturnType<typeof getInstitutionLicensingAgreements>> = [];
  let institutionName = 'Your Institution';
  let accreditationBody: string | null = null;
  let accreditationStatus: string | null = null;

  if (user) {
    const { data: instUser } = await supabase
      .from('institution_users')
      .select('institution_id, institutions(name, accreditation_body, accreditation_status)')
      .eq('account_id', user.id)
      .maybeSingle();

    if (instUser) {
      const inst = instUser.institutions as unknown as {
        name: string;
        accreditation_body: string;
        accreditation_status: string;
      };
      institutionName = inst?.name || institutionName;
      accreditationBody = inst?.accreditation_body || null;
      accreditationStatus = inst?.accreditation_status || null;
      agreements = await getInstitutionLicensingAgreements(instUser.institution_id);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
              Course Licensing & Syllabus Distribution
            </h1>
            {accreditationBody && (
              <AccreditationBadge body={accreditationBody} status={accreditationStatus} />
            )}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {institutionName} &bull; Manage graduate syllabi adoptions, modular course licenses, and scholar royalties.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Browse Course Catalog
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Active Licenses</p>
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
            <p className="text-xs text-slate-500 font-medium">Pending Requests</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {agreements.filter((a) => a.status === 'requested').length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Accreditation Verified</p>
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              {accreditationBody ? `${accreditationBody} Verified` : 'Standard Confessional'}
            </p>
          </div>
        </div>
      </div>

      {/* Agreements Table / List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Curricular Agreements ({agreements.length})
          </h2>
        </div>

        {agreements.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Course Licenses Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Explore the verified theological faculty course catalog to license syllabi or modular master&apos;s curricula.
            </p>
            <Link
              href="/courses"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition"
            >
              Browse Course Catalog
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
                    {agr.consortium && (
                      <span className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 px-2 py-0.5 rounded-full font-semibold">
                        {agr.consortium.name}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {agr.course?.title || 'Graduate Course Curriculum'}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      Scholar:{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {agr.scholar?.full_name || 'Verified Scholar'}
                      </span>
                    </span>
                    <span>&bull;</span>
                    <span>
                      Term:{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {agr.term_duration.replace(/_/g, ' ')}
                      </span>
                    </span>
                    {agr.permitted_students_count && (
                      <>
                        <span>&bull;</span>
                        <span>
                          Cohort:{' '}
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {agr.permitted_students_count} students
                          </span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Royalty / Fee</p>
                    <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                      ${Number(agr.royalty_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  {agr.status === 'active' && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Active License</span>
                    </div>
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
