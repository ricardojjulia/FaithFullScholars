'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Award, Quote, Plus, Building2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { ScholarEndorsement } from '@/lib/endorsements/endorsement-service';
import { InstitutionEndorsement } from '@/lib/endorsements/institutional-endorsement-service';
import { EndorseColleagueModal } from '@/components/scholars/endorse-colleague-modal';

interface ScholarEndorsementsCardProps {
  scholarId: string;
  scholarName: string;
  initialEndorsements?: ScholarEndorsement[];
  initialInstitutionalEndorsements?: InstitutionEndorsement[];
}

export function ScholarEndorsementsCard({
  scholarId,
  scholarName,
  initialEndorsements = [],
  initialInstitutionalEndorsements = [],
}: ScholarEndorsementsCardProps) {
  const [endorsements] = useState<ScholarEndorsement[]>(initialEndorsements);
  const [institutionalEndorsements] = useState<InstitutionEndorsement[]>(initialInstitutionalEndorsements);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="card-crisp bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
      {/* Primary Card Title */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Faculty Endorsements & Commendations</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Authoritative institutional endorsements and verified faculty peer recommendations
          </p>
        </div>
      </div>

      {/* 1. Official Institutional Faculty Endorsements Section */}
      {institutionalEndorsements.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Authoritative Institutional Endorsements</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800">
                    Verified Seal
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Official commendations issued directly by accredited theological institutions
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {institutionalEndorsements.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-300">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.institution?.name || 'Accredited Seminary'}
                        </span>
                        <CheckCircle2 className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                      </div>
                      {item.institution?.location && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {item.institution.location}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 justify-end">
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300/50 dark:border-amber-800 rounded-md">
                      {item.relationship_type}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md">
                      {item.department_or_field}
                    </span>
                  </div>
                </div>

                <blockquote className="text-xs text-slate-700 dark:text-slate-300 italic pl-3 border-l-2 border-amber-400 dark:border-amber-600 leading-relaxed font-literary">
                  &ldquo;{item.endorsement_text}&rdquo;
                </blockquote>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Colleague Peer Commendations Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                Faculty Colleague Commendations
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Peer attestations from theological faculty and academic co-authors
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-800/60 rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Endorse Colleague</span>
          </button>
        </div>

        {endorsements.length === 0 ? (
          <div className="py-6 px-4 text-center rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700/60">
            <Quote className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              No faculty colleague commendations yet.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Verified colleagues can commend {scholarName}&apos;s scholarship, pedagogical rigor, and doctrinal fidelity.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {endorsements.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-display font-bold text-slate-700 dark:text-slate-200">
                      {item.endorser?.fullName ? item.endorser.fullName[0] : 'Dr'}
                    </div>
                    <div>
                      {item.endorser?.slug ? (
                        <Link
                          href={`/scholars/${item.endorser.slug}`}
                          className="text-xs font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-1"
                        >
                          {item.endorser.fullName}
                          <CheckCircle2 className="w-3 h-3 text-indigo-500 inline" />
                        </Link>
                      ) : (
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.endorser?.fullName || 'Verified Colleague'}
                        </span>
                      )}
                      {item.endorser?.currentInstitution && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-2.5 h-2.5" />
                          {item.endorser.currentInstitution}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 justify-end">
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50 rounded-md">
                      {item.relationship}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md">
                      {item.subjectArea}
                    </span>
                  </div>
                </div>

                <blockquote className="text-xs text-slate-700 dark:text-slate-300 italic pl-3 border-l-2 border-indigo-300 dark:border-indigo-700 leading-relaxed font-literary">
                  &ldquo;{item.endorsementText}&rdquo;
                </blockquote>
              </div>
            ))}
          </div>
        )}
      </div>

      <EndorseColleagueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        recipientScholarId={scholarId}
        recipientName={scholarName}
        onEndorsementSubmitted={() => {
          // Re-fetch or add pending state indicator
        }}
      />
    </div>
  );
}
