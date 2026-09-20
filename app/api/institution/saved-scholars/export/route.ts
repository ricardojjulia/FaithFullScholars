import { NextRequest, NextResponse } from 'next/server';
import { fetchShortlistDossier, generateShortlistCsv } from '@/lib/inquiries/export-dossier';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get('institutionId') || 'f2000000-0000-0000-0000-000000000001';
    const format = searchParams.get('format') || 'csv';

    const dossier = await fetchShortlistDossier(institutionId);

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
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
