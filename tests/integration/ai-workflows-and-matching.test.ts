import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { extractCvWithGemini } from '@/lib/ai/gemini-cv-extractor';
import { parseCvText } from '@/lib/profiles/cv-parser';
import pg from 'pg';

describe('Track B: AI-Assisted CV Ingestion & Faculty Matcher Intelligence', () => {
  let db: pg.Client;

  beforeAll(async () => {
    db = new pg.Client({
      connectionString:
        process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:49322/postgres',
    });
    await db.connect();
  });

  afterAll(async () => {
    await db.end();
  });

  it('accurately parses raw academic CV text and extracts degrees, disciplines, and publications', async () => {
    const rawCvSample = `
      DR. ELEANOR G. VANDERBILT, Ph.D.
      Professor of Historical Theology & Patristic Studies
      Trinity Evangelical Divinity School
      evanderbilt@teds.edu | Deerfield, IL

      ACADEMIC BIOGRAPHY:
      Specialist in early Christian pneumatology, Cappadocian theology, and the Council of Nicaea.
      Over 18 years of graduate-level teaching experience in historical theology.

      EDUCATION:
      Ph.D. in Early Christian Studies, University of Cambridge, 2008
      Th.M. in Historical Theology, Westminster Theological Seminary, 2003
      M.Div., Gordon-Conwell Theological Seminary, 2000
      B.A. in Classical Greek and History, Wheaton College, 1997

      SELECT PUBLICATIONS:
      Books:
      - The Spirit in the Desert: Fourth-Century Pneumatology and Asceticism. Oxford University Press, 2016.
      - Nicaea and Its Legacy in the Latin West. Baker Academic, 2021.

      Articles:
      - "Gregory of Nazianzus on the Holy Spirit's Divinity," Journal of Theological Studies 70 (2019): 112-135.
    `;

    // Test heuristic & Gemini extraction layer
    const result = await extractCvWithGemini(rawCvSample);

    expect(result).toBeDefined();
    expect(result.credentials.length).toBeGreaterThanOrEqual(2);
    
    // Check degree capture
    const hasDoctorate = result.credentials.some(
      (d) => d.degree.includes('Ph.D') || d.degree.includes('Doctor')
    );
    expect(hasDoctorate).toBe(true);

    // Check publications capture
    expect(result.publications.length).toBeGreaterThanOrEqual(1);
  });

  it('matches theological candidate profiles against institutional recruitment requirements', async () => {
    // Search query for Old Testament / Hebrew professor with a Ph.D.
    const candidatesRes = await db.query(`
      SELECT 
        s.id,
        s.full_name,
        s.slug,
        s.title,
        s.current_institution,
        d.name as discipline_name,
        c.degree as terminal_degree,
        c.institution_name as degree_institution
      FROM public.scholars s
      JOIN public.scholar_disciplines sd ON sd.scholar_id = s.id AND sd.is_primary = true
      JOIN public.disciplines d ON d.id = sd.discipline_id
      LEFT JOIN public.credentials c ON c.scholar_id = s.id AND c.is_terminal = true
      WHERE s.profile_status = 'approved'
        AND d.slug IN ('old-testament', 'biblical-languages')
      ORDER BY s.full_name ASC;
    `);

    expect(candidatesRes.rows.length).toBeGreaterThanOrEqual(1);
    
    const candidateNames = candidatesRes.rows.map((r) => r.full_name);
    expect(candidateNames.some((name) => name.includes('Cranmer') || name.includes('Calvin'))).toBe(true);

    // Verify terminal degree citations are grounded
    for (const row of candidatesRes.rows) {
      if (row.terminal_degree) {
        expect(['Ph.D.', 'D.Phil.', 'Th.D.']).toContain(row.terminal_degree);
        expect(row.degree_institution).toBeDefined();
      }
    }
  });

  it('matches New Testament and Pauline exegesis scholars with verified confessional alignment', async () => {
    const ntScholarsRes = await db.query(`
      SELECT 
        s.id,
        s.full_name,
        s.slug,
        s.title,
        cs.name as confession_name
      FROM public.scholars s
      JOIN public.scholar_disciplines sd ON sd.scholar_id = s.id
      JOIN public.disciplines d ON d.id = sd.discipline_id
      JOIN public.scholar_confessions sc ON sc.scholar_id = s.id
      JOIN public.confessional_standards cs ON cs.id = sc.confessional_standard_id
      WHERE s.profile_status = 'approved'
        AND d.slug = 'new-testament';
    `);

    expect(ntScholarsRes.rows.length).toBeGreaterThanOrEqual(2);
    const names = ntScholarsRes.rows.map((r) => r.full_name);
    expect(names.some((n) => n.includes('Machen') || n.includes('Carson') || n.includes('Ridderbos'))).toBe(true);
  });
});
