import React from 'react';
import { Award, ShieldCheck } from 'lucide-react';

interface DistinguishedBadgeProps {
  size?: 'sm' | 'default';
  showLabel?: boolean;
  className?: string;
}

/**
 * Distinguished Faculty Academic Seal (ADR 0014)
 * Restrained Oxford navy and burnished amber seal indicating senior verified faculty status.
 */
export function DistinguishedBadge({
  size = 'default',
  showLabel = true,
  className = '',
}: DistinguishedBadgeProps) {
  if (size === 'sm') {
    return (
      <span
        title="Distinguished Fellow — Peer-verified theological scholar & senior faculty"
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase bg-amber-50 text-amber-900 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800/80 ${className}`}
      >
        <Award className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
        {showLabel && <span>Distinguished Fellow</span>}
      </span>
    );
  }

  return (
    <div
      title="Distinguished Fellow — Peer-verified theological scholar & senior faculty"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-50 to-amber-100/60 text-amber-900 border border-amber-300/80 dark:from-amber-950/80 dark:to-amber-900/40 dark:text-amber-200 dark:border-amber-700/80 shadow-xs ${className}`}
    >
      <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
      <span>Distinguished Fellow</span>
    </div>
  );
}
