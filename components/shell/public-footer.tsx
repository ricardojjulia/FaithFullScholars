'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/i18n-context';

export function PublicFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-900 text-amber-300 font-display font-bold text-xs flex items-center justify-center">
              FS
            </div>
            <span className="font-display font-bold text-base tracking-tight text-slate-900 dark:text-white">
              FaithFull <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Scholars</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            {t('footer.tagline') || 'The curated directory connecting accredited theological seminaries, Bible colleges, and Christian universities with qualified faculty, inspectable course syllabi, and verified availability.'}
          </p>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
            {t('footer.discovery_title') || 'Academic Discovery'}
          </h4>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <li>
              <Link href="/scholars" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {t('footer.all_faculty') || 'Faculty Directory'}
              </Link>
            </li>
            <li>
              <Link href="/courses" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {t('footer.course_catalog') || 'Course Catalog & Syllabi'}
              </Link>
            </li>
            <li>
              <Link href="/speakers" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {t('footer.speaking_bureau') || 'Theological Speaking Bureau'}
              </Link>
            </li>
            <li>
              <Link href="/opportunities" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {t('footer.academic_postings') || 'Academic Postings Marketplace'}
              </Link>
            </li>
            <li>
              <Link href="/scholars?available=true" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {t('footer.adjunct_teaching') || 'Available for Adjunct Teaching'}
              </Link>
            </li>
            <li>
              <Link href="/disciplines" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {t('footer.disciplines_hub') || 'Disciplines Hub'}
              </Link>
            </li>
            <li>
              <Link href="/traditions" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {t('footer.traditions_hub') || 'Traditions Hub'}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
            {t('footer.workspaces_title') || 'Portals & Contracts'}
          </h4>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <li>
              <Link href="/dashboard" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {t('footer.scholar_workspace') || 'Scholar Workspace Overview'}
              </Link>
            </li>
            <li>
              <Link href="/dashboard/contracts" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {t('footer.contracts_inbox') || 'Scholar Contracts Inbox'}
              </Link>
            </li>
            <li>
              <Link href="/dashboard/licensing" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {t('footer.course_licensing') || 'Curriculum Licensing & Royalties'}
              </Link>
            </li>
            <li>
              <Link href="/institution" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {t('footer.institution_portal') || 'Institution Portal'}
              </Link>
            </li>
            <li>
              <Link href="/institution/contracts" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {t('footer.engagement_contracts') || 'Institutional Engagement Contracts'}
              </Link>
            </li>
            <li>
              <Link href="/institution/licensing" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {t('footer.syllabi_licensing') || 'Syllabus Licensing & Adoptions'}
              </Link>
            </li>
            <li>
              <Link href="/institution/subscription" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {t('footer.subscriptions_quotas') || 'Subscriptions & Quota Management'}
              </Link>
            </li>
            <li>
              <Link href="/institution/consortium" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Seminary Consortia & Systems
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
            {t('footer.platform_title') || 'Platform & Standards'}
          </h4>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <li>
              <Link href="/admin/reviews" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {t('footer.admin_review') || 'Admin Review & Trust Model'}
              </Link>
            </li>
            <li>
              <Link href="/dev/status" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {t('footer.system_health') || 'System Health Diagnostics'}
              </Link>
            </li>
            <li>
              <Link href="/scholars?confession=westminster-confession" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {t('footer.westminster') || 'Westminster Confession'}
              </Link>
            </li>
            <li>
              <Link href="/scholars?confession=1689-london-baptist" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {t('footer.baptist_1689') || '1689 Baptist Confession'}
              </Link>
            </li>
            <li className="pt-2 text-slate-400 text-[11px]">
              {t('footer.rls_notice') || 'PostgreSQL Row Level Security Enforced (32/32 tables)'}
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} FaithFull Scholars. {t('footer.copyright') || 'Dedicated to the advancement of Christ-centered academic excellence.'}
      </div>
    </footer>
  );
}
