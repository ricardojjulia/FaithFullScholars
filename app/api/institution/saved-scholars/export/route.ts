import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionContext, resolveInstitutionAccess } from '@/lib/auth/session';
import { fetchShortlistDossier, generateShortlistCsv } from '@/lib/inquiries/export-dossier';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);

    const access = resolveInstitutionAccess(
      await getSessionContext(supabase),
      searchParams.get('institutionId')
    );
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const format = searchParams.get('format') || 'csv';
    const dossier = await fetchShortlistDossier(supabase, access.institutionId);

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
    console.error('GET /api/institution/saved-scholars/export failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
