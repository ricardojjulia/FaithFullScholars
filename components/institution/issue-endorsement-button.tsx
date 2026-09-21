'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { IssueEndorsementModal } from '@/components/institution/issue-endorsement-modal';

interface IssueEndorsementButtonProps {
  scholars: { id: string; full_name: string; title_or_position: string | null }[];
}

export function IssueEndorsementButton({ scholars }: IssueEndorsementButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>Issue Institutional Endorsement</span>
      </button>

      <IssueEndorsementModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        scholars={scholars}
        onSubmitted={() => router.refresh()}
      />
    </>
  );
}
