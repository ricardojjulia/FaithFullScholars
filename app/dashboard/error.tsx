'use client';

import { PortalSegmentError } from '@/components/portal/segment-error';

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PortalSegmentError reset={reset} />;
}
