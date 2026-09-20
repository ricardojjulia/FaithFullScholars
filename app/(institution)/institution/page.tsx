import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { Building2, Check, ShieldCheck, Zap, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Institution Dashboard | Faculty Recruitment & Outreach',
  description: 'Manage seminary faculty recruitment, structured teaching inquiries, and scholar shortlists.',
};

export default function InstitutionOverviewPage() {
  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Westminster Theological Seminary
                </h1>
                <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span>Glenside, PA</span>
                  <span>•</span>
                  <span>ATS & MSCHE Accredited</span>
                  <span>•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Verified Academic Partner</span>
                  </span>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl pt-2">
              Welcome to the institutional recruiting hub. Connect with vetted biblical scholars and theologians,
              track structured opportunity inquiries, and bookmark prospective adjunct professors.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/scholars"
              className="px-4 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              Browse Scholars
            </Link>
            <Link
              href="/institution/inquiries"
              className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Outreach Log
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Inquiries Sent
          </span>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1.5">3</p>
          <span className="text-xs text-slate-400 mt-1 block">Across adjunct & guest lectures</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Awaiting Scholar Response
          </span>
          <p className="text-3xl font-bold text-amber-700 dark:text-amber-300 mt-1.5">2</p>
          <span className="text-xs text-slate-400 mt-1 block">Average response time: 48h</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Accepted Opportunities
          </span>
          <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 mt-1.5">1</p>
          <span className="text-xs text-slate-400 mt-1 block">Direct channel established</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Shortlisted Candidates
          </span>
          <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300 mt-1.5">4</p>
          <span className="text-xs text-slate-400 mt-1 block">Prospective faculty queue</span>
        </div>
      </div>

      {/* Recruitment Guidance & Quick Start */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xs">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Structured Outreach Standards</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            FaithFull Scholars guards faculty privacy against unsolicited recruiting blasts and automated scraping.
            All inquiries sent by your institution:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            <li className="flex items-start space-x-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Explicit Opportunity Types:</strong> Categorized by adjunct course, modular intensive, keynote address, or committee supervision.</span>
            </li>
            <li className="flex items-start space-x-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Confessional Matching:</strong> Inquiries are compared against scholar-affirmed historic standards (Westminster, London Baptist, 39 Articles).</span>
            </li>
            <li className="flex items-start space-x-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>PII Protection:</strong> Scholar direct emails are only revealed upon inquiry acceptance.</span>
            </li>
          </ul>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xs">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <span>Quick Recruitment Actions</span>
          </h2>
          <div className="space-y-3">
            <Link
              href="/scholars?discipline=New+Testament"
              className="p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700/60 rounded-xl flex items-center justify-between text-xs sm:text-sm transition group"
            >
              <div>
                <span className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  Find New Testament Adjuncts
                </span>
                <p className="text-xs text-slate-500 mt-0.5">Filter by Greek syntax, Pauline studies, and Gospels</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition" />
            </Link>

            <Link
              href="/scholars?discipline=Systematic+Theology"
              className="p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700/60 rounded-xl flex items-center justify-between text-xs sm:text-sm transition group"
            >
              <div>
                <span className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  Find Systematic Theologians
                </span>
                <p className="text-xs text-slate-500 mt-0.5">Filter by historic Reformed and Evangelical confessions</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition" />
            </Link>

            <Link
              href="/institution/saved"
              className="p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700/60 rounded-xl flex items-center justify-between text-xs sm:text-sm transition group"
            >
              <div>
                <span className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  Review Shortlisted Candidates
                </span>
                <p className="text-xs text-slate-500 mt-0.5">Manage notes and send batch opportunities</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
