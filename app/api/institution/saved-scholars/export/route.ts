import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchShortlistDossier, generateShortlistCsv } from '@/lib/inquiries/export-dossier';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let targetInstitutionId: string;

    if (user) {
      // Authenticated institutional caller: strictly enforce tenancy
      const { data: instUser } = await supabase
        .from('institution_users')
        .select('institution_id')
        .eq('account_id', user.id)
        .maybeSingle();

      if (!instUser) {
        return NextResponse.json({ error: 'Institutional account required.' }, { status: 403 });
      }
      targetInstitutionId = instUser.institution_id;
    } else {
      // In dev/test/demo preview or when ENABLE_DEV_ROUTES is active
      const isDevOrTest = process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_ROUTES === 'true';
      if (!isDevOrTest) {
        return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
      }
      const { searchParams } = new URL(req.url);
      targetInstitutionId = searchParams.get('institutionId') || 'f2000000-0000-0000-0000-000000000001';
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'csv';

    const dossier = await fetchShortlistDossier(targetInstitutionId);

    if (format === 'json') {
      return NextResponse.json({ dossier });
    }

    // Default: CSV export
    const host = req.headers.get('host') || 'localhost:3845';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const csvData = generateShortlistCsv(dossier.candidates, baseUrl);
    const filename = `faculty-shortlist-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (err: unknown) {
    console.error('Shortlist export failed:', err);
    const message = process.env.NODE_ENV === 'production' ? 'Failed to export shortlist dossier' : (err instanceof Error ? err.message : 'Internal error');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
