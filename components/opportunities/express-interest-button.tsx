'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';
import { ExpressInterestModal } from '@/components/opportunities/express-interest-modal';

interface ExpressInterestButtonProps {
  postingId: string;
  postingTitle: string;
  institutionName: string;
}

export function ExpressInterestButton({
  postingId,
  postingTitle,
  institutionName,
}: ExpressInterestButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
      >
        <Send className="w-4 h-4" />
        <span>{t('opportunities.express_interest')}</span>
      </button>

      <ExpressInterestModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        postingId={postingId}
        postingTitle={postingTitle}
        institutionName={institutionName}
      />
    </>
  );
}
