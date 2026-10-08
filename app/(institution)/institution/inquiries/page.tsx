import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireInstitutionMember } from '@/lib/auth/guards';
import { fetchInstitutionInquiriesOrThrow, PortalQueryError } from '@/lib/inquiries/queries';
import { toOutboxItems } from '@/lib/inquiries/mappers';
import { OutreachLog } from '@/components/institution/outreach-log';
import { DataErrorPanel } from '@/components/portal/data-error-panel';

export const metadata: Metadata = {
  title: 'Outreach & Inquiries | Institution Portal',
  description: 'Track structured opportunity requests sent to prospective faculty members.',
};

export const dynamic = 'force-dynamic';

export default async function InstitutionInquiriesPage() {
  const supabase = await createClient();
  // Guard here, not only in the layout: layouts do not stop pages from rendering.
  // The institution is resolved from the session, never from the request.
  const { institutionId } = await requireInstitutionMember(supabase);

  let items: ReturnType<typeof toOutboxItems> | null = null;
  try {
    items = toOutboxItems(await fetchInstitutionInquiriesOrThrow(supabase, institutionId));
  } catch (err) {
    console.error('Outreach log failed to load (code):', err instanceof PortalQueryError ? err.code : 'unknown');
  }

  if (!items) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Institutional Outreach & Inquiries</h1>
        <DataErrorPanel what="your outreach log" />
      </div>
    );
  }

  return <OutreachLog inquiries={items} />;
}
