import { Globe } from 'lucide-react';

interface PublicDataNoticeProps {
  /** What is published, e.g. "Your confessional standards". */
  subject: string;
  testId?: string;
}

/**
 * Religious belief is special-category personal data (GDPR Art. 9). The scholar
 * publishes it deliberately, so say plainly what approval does and how to undo it.
 */
export function PublicDataNotice({ subject, testId = 'public-data-notice' }: PublicDataNoticeProps) {
  return (
    <p
      data-testid={testId}
      className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400"
    >
      <Globe className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
      <span>
        {subject} will be published on your public profile once an administrator approves this revision, and will be
        visible to anyone. You can remove them later by submitting a revision without them.
      </span>
    </p>
  );
}
