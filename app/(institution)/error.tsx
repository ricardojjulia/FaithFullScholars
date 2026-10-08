'use client';

import { PortalSegmentError } from '@/components/portal/segment-error';

export default function InstitutionError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="py-8 px-4 sm:px-6">
      <PortalSegmentError reset={reset} />
    </main>
  );
}
