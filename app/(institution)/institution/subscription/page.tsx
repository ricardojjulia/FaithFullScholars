import React from 'react';
import { requireInstitutionMember } from '@/lib/auth/guards';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getInstitutionSubscription } from '@/lib/subscriptions/subscription-service';
import { TIER_CONFIG, SubscriptionTier, formatTierName } from '@/lib/subscriptions/types';
import { Check, ShieldCheck, Zap, Sparkles, Building } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Institutional Subscription & Quota Management | FaithFull Scholars',
  description: 'Manage your seminary membership tier, search committee seats, and outreach quotas.',
};

export default async function InstitutionSubscriptionPage() {
  // Guard here, not only in the layout: layouts do not stop pages from rendering.
  await requireInstitutionMember();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let subscription = null;
  let institution = null;

  if (user) {
    const { data: instUser } = await supabase
      .from('institution_users')
      .select('institution_id, institutions(id, name, city, state_province, status)')
      .eq('account_id', user.id)
      .maybeSingle();

    if (instUser) {
      institution = instUser.institutions as unknown as {
        id: string;
        name: string;
        city?: string;
        state_province?: string;
        status: string;
      };
      subscription = await getInstitutionSubscription(instUser.institution_id);
    }
  }

  const currentTier: SubscriptionTier = subscription?.tier || 'basic';
  const inquiriesUsed = subscription?.inquiries_used_current_month || 0;
  const inquiryLimit = subscription?.monthly_inquiry_limit || 5;
  const seatsLimit = subscription?.seats_limit || 1;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
              Institutional Subscription & Quotas
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {institution ? institution.name : 'Your Institution'} &bull; Current Membership:{' '}
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {formatTierName(currentTier)}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/institution/inquiries"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            View Inquiries
          </Link>
          <Link
            href="/institution/contracts"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            Engagement Contracts
          </Link>
        </div>
      </div>

      {/* Current Quota Consumption Meters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
            <span>MONTHLY INQUIRY ALLOWANCE</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1">
            {inquiriesUsed}{' '}
            <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
              / {currentTier === 'premier_partner' ? 'Unlimited' : inquiryLimit} used
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${
                  currentTier === 'premier_partner'
                    ? 100
                    : Math.min(100, Math.round((inquiriesUsed / inquiryLimit) * 100))
                }%`,
              }}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
            <span>SEARCH COMMITTEE SEATS</span>
            <Building className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1">
            1{' '}
            <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
              / {currentTier === 'premier_partner' ? 'Unlimited' : seatsLimit} active
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Team search committee members with saved lists and shared candidate evaluations.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
            <span>AI FACULTY MATCHER</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mb-1">
            {TIER_CONFIG[currentTier].priorityAiMatcher ? 'Priority Dedicated' : 'Standard Baseline'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Citation-grounded semantic analysis across candidate CVs, publications, and confessional standards.
          </p>
        </div>
      </div>

      {/* Available Tiers Comparison */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold font-display tracking-tight text-slate-900 dark:text-white">
          Institutional Membership Tiers
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {(['basic', 'verified_seminary', 'premier_partner'] as SubscriptionTier[]).map((tierKey) => {
            const plan = TIER_CONFIG[tierKey];
            const isCurrent = currentTier === tierKey;

            return (
              <div
                key={tierKey}
                className={`relative rounded-2xl p-6 flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-2 border-indigo-600 dark:border-indigo-500 shadow-md'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-600 text-white shadow-xs">
                    Current Plan
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {plan.displayName}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 min-h-[32px]">
                    {plan.description}
                  </p>

                  <div className="mb-6">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                      ${plan.priceMonthlyUsd}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium"> / month</span>
                    {plan.priceAnnualUsd > 0 && (
                      <span className="block text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                        ${plan.priceAnnualUsd}/yr billed annually (Save 17%)
                      </span>
                    )}
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 mb-6">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span><strong>{plan.monthlyInquiries}</strong> inquiries per month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span><strong>{plan.searchSeats}</strong> search committee seat(s)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{plan.candidateShortlistExport ? 'RFC-4180 CSV & Dossier Export' : 'Basic bookmarking'}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{plan.contractDrafting ? 'Formal Engagement Contracts' : 'No contract drafting'}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{plan.institutionalBadge ? 'Gold Institutional Crest Badge' : 'Standard display'}</span>
                    </li>
                  </ul>
                </div>

                <div>
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 cursor-default"
                    >
                      Active Tier
                    </button>
                  ) : (
                    // Plan changes are staff-managed until billing exists (ADR 0023).
                    <p className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-center text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800">
                      Contact the FaithFull Scholars team to switch to {plan.displayName}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
