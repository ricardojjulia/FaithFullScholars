import type { Metadata } from 'next';
import { verifyStaffUser } from '@/lib/feedback/auth';
import { ConferenceHubPreview } from '@/components/conferences/conference-hub-preview';
import { ConferencesComingSoon } from '@/components/conferences/conferences-coming-soon';

export const metadata: Metadata = {
  title: 'Conferences | Institution Portal',
  description: 'Conference interview tools for search committees (preview).',
};

export const dynamic = 'force-dynamic';

export default async function InstitutionConferencesPage() {
  // The hub runs on in-memory demo data (ADR 0021), so it is a staff-only preview.
  // Checked here, not only in the nav: layouts do not protect pages.
  const staff = await verifyStaffUser();
  if (!staff.authorized) {
    return <ConferencesComingSoon />;
  }
  return <ConferenceHubPreview />;
}
