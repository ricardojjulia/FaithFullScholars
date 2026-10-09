'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { ExpressInterestModal } from '@/components/opportunities/express-interest-modal';
import { ApplicationStatusBadge } from '@/components/applications/application-status-badge';
import { WithdrawApplicationButton } from '@/components/applications/withdraw-application-button';
import { isOpenApplication } from '@/lib/postings/application-status';
import type { ApplyState } from '@/lib/postings/apply-state';

interface ApplyPanelProps {
  state: ApplyState;
  postingId: string;
  postingTitle: string;
  institutionName: string;
  /** The posting page path, used as the post-login destination. */
  nextPath: string;
}

/**
 * What the posting page offers: sign in, "not eligible" (with a link to the
 * profile), nothing for institution users, apply, or the application's status
 * with withdraw. The modal is a sibling of the state content (same position in the
 * tree for every state), so it survives the server refresh that turns "apply" into
 * "applied" and can finish showing its confirmation.
 */
export function ApplyPanel({ state, postingId, postingTitle, institutionName, nextPath }: ApplyPanelProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <ApplyContent state={state} postingTitle={postingTitle} nextPath={nextPath} onApply={() => setModalOpen(true)} />
      <ExpressInterestModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onApplied={() => router.refresh()}
        postingId={postingId}
        postingTitle={postingTitle}
        institutionName={institutionName}
      />
    </>
  );
}

function ApplyContent({
  state,
  postingTitle,
  nextPath,
  onApply,
}: {
  state: ApplyState;
  postingTitle: string;
  nextPath: string;
  onApply: () => void;
}) {
  const { t } = useTranslation();

  switch (state.kind) {
    case 'institution':
      return <p className="text-xs text-slate-600 dark:text-slate-400">{t('common_app.institution_note')}</p>;

    case 'signed_out':
      return (
        <Link
          href={`/login?next=${encodeURIComponent(nextPath)}`}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
        >
          {t('common_app.sign_in_to_apply')}
        </Link>
      );

    case 'unavailable':
      return (
        <p role="status" className="text-xs text-slate-600 dark:text-slate-400">
          {t('common_app.status_unavailable')}
        </p>
      );

    case 'closed':
      return <p className="text-xs text-slate-600 dark:text-slate-400">{t('common_app.error_not_open')}</p>;

    case 'not_eligible':
      return (
        <div className="space-y-2">
          <p className="text-xs text-slate-600 dark:text-slate-400">{t('common_app.not_eligible')}</p>
          <Link
            href={state.hasProfile ? '/dashboard/profile' : '/dashboard/onboarding'}
            className="inline-flex text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {t('common_app.not_eligible_link')}
          </Link>
        </div>
      );

    case 'apply':
      return (
        <button
          type="button"
          onClick={onApply}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>{t('opportunities.express_interest')}</span>
        </button>
      );

    case 'applied':
      return (
        <div className="space-y-3" data-testid="applied-panel">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
            <span className="font-semibold">{t('common_app.applied_label')}:</span>
            <ApplicationStatusBadge status={state.status} />
          </div>
          <p className="text-[11px] text-slate-500">{t('common_app.applied_on', { date: state.appliedAt.slice(0, 10) })}</p>
          <Link
            href="/dashboard/applications"
            className="inline-flex text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {t('common_app.view_my_applications')}
          </Link>
          {state.status === 'withdrawn' && (
            <p className="text-xs text-slate-600 dark:text-slate-400">{t('common_app.withdrawn_no_reapply')}</p>
          )}
          {isOpenApplication(state.status) && (
            <WithdrawApplicationButton applicationId={state.applicationId} postingTitle={postingTitle} />
          )}
        </div>
      );
  }
}
