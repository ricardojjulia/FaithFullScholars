/**
 * ==============================================================================
 * FaithFull Scholars — AI Faculty Matcher API Route (Feature 3)
 *
 * Evaluates seminary search committee and provost queries against approved
 * faculty portfolios using Google Gemini LLM with deterministic theological
 * heuristic grounding.
 * ==============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getInstitutionSubscription } from '@/lib/subscriptions/subscription-service';
import {
  matchFacultyWithGemini,
  CandidateForMatching,
} from '@/lib/ai/gemini-faculty-matcher';

// Default rich faculty candidates for local environments or fallback
const SEED_CANDIDATES: CandidateForMatching[] = [
  {
    id: 's-edwards-1',
    slug: 'benjamin-edwards',
    full_name: 'Dr. Benjamin H. Edwards, Ph.D.',
    title: 'Professor of New Testament Studies',
    current_institution: 'Westminster Theological Seminary',
    institutional_role: 'Professor',
    biography: 'Dr. Edwards specializes in Pauline epistles, the New Perspective on Paul, and biblical Greek syntax.',
    disciplines: [
      { name: 'New Testament & Early Christianity', is_primary: true },
      { name: 'Biblical Languages', is_primary: false },
    ],
    traditions: [{ name: 'Reformed & Presbyterian', is_primary: true }],
    confessions: [
      { name: 'Westminster Confession of Faith (1646)', adherence_level: 'full_subscription' },
      { name: 'Nicene-Constantinopolitan Creed (381)', adherence_level: 'full_subscription' },
    ],
    credentials: [
      {
        degree: 'Ph.D.',
        field_of_study: 'New Testament',
        institution_name: 'University of Cambridge',
        year_awarded: 2018,
        is_terminal: true,
      },
      {
        degree: 'Th.M.',
        field_of_study: 'Biblical Studies',
        institution_name: 'Westminster Theological Seminary',
        year_awarded: 2014,
        is_terminal: false,
      },
    ],
    publications: [
      {
        title: 'The Gospel According to Paul: Justification and Union with Christ',
        publication_type: 'book',
        year: 2021,
        citation_text: 'Baker Academic, 2021',
      },
      {
        title: 'Syntax of Subordination in Galatians and Romans',
        publication_type: 'journal',
        year: 2023,
        citation_text: 'Journal of Biblical Literature, 2023',
      },
    ],
    courses: [
      {
        title: 'Pauline Epistles & Greek Syntax',
        level: 'graduate',
        delivery_modes: ['residential', 'online_synchronous'],
      },
      {
        title: 'Theology of Justification in the Reformation',
        level: 'graduate',
        delivery_modes: ['residential', 'hybrid'],
      },
    ],
    availability: {
      is_available_for_hire: true,
      opportunity_types: ['modular_intensive', 'adjunct', 'doctoral_supervision'],
      preferred_delivery_modes: ['residential', 'online_synchronous'],
    },
  },
  {
    id: 's-cranmer-2',
    slug: 'dr-thomas-cranmer-davies',
    full_name: 'Dr. Thomas Cranmer Davies, D.Phil.',
    title: 'Senior Research Fellow in Historical Theology',
    current_institution: 'Wycliffe Hall, Oxford',
    institutional_role: 'Research Fellow',
    biography: 'Specialist in English Reformation theology, liturgy, patristic reception, and the 39 Articles of Religion.',
    disciplines: [
      { name: 'Historical Theology & Church History', is_primary: true },
      { name: 'Systematic Theology', is_primary: false },
    ],
    traditions: [{ name: 'Confessional Anglican', is_primary: true }],
    confessions: [
      { name: 'Thirty-Nine Articles of Religion (1571)', adherence_level: 'full_subscription' },
      { name: 'Apostles\' Creed', adherence_level: 'full_subscription' },
    ],
    credentials: [
      {
        degree: 'D.Phil.',
        field_of_study: 'Historical Theology',
        institution_name: 'University of Oxford',
        year_awarded: 2015,
        is_terminal: true,
      },
    ],
    publications: [
      {
        title: 'Liturgy and Reform: The Marian Martyrs and the English Prayer Book',
        publication_type: 'book',
        year: 2020,
        citation_text: 'Oxford University Press, 2020',
      },
    ],
    courses: [
      {
        title: 'The English Reformation and Anglican Formulary',
        level: 'graduate',
        delivery_modes: ['residential', 'hybrid'],
      },
    ],
    availability: {
      is_available_for_hire: true,
      opportunity_types: ['adjunct', 'visiting_professor', 'modular_intensive'],
      preferred_delivery_modes: ['residential', 'hybrid'],
    },
  },
  {
    id: 's-vance-3',
    slug: 'dr-marcus-aurelius-vance',
    full_name: 'Dr. Marcus Aurelius Vance, Ph.D.',
    title: 'Associate Professor of Old Testament',
    current_institution: 'Beeson Divinity School',
    institutional_role: 'Associate Professor',
    biography: 'Scholar of ancient Near Eastern languages, wisdom literature, Hebrew poetry, and biblical theology of covenant.',
    disciplines: [
      { name: 'Old Testament & Hebrew Scriptures', is_primary: true },
      { name: 'Biblical Languages', is_primary: false },
    ],
    traditions: [{ name: 'Baptist (Reformed & Historic)', is_primary: true }],
    confessions: [
      { name: '1689 Second London Baptist Confession', adherence_level: 'full_subscription' },
    ],
    credentials: [
      {
        degree: 'Ph.D.',
        field_of_study: 'Old Testament',
        institution_name: 'Harvard University',
        year_awarded: 2017,
        is_terminal: true,
      },
    ],
    publications: [
      {
        title: 'The Architecture of Hebrew Poetry in the Psalter',
        publication_type: 'book',
        year: 2022,
        citation_text: 'Eerdmans, 2022',
      },
    ],
    courses: [
      {
        title: 'Hebrew Poetry & The Psalms of Lament',
        level: 'graduate',
        delivery_modes: ['residential', 'online_synchronous'],
      },
    ],
    availability: {
      is_available_for_hire: true,
      opportunity_types: ['adjunct', 'modular_intensive'],
      preferred_delivery_modes: ['residential', 'online_synchronous'],
    },
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawQuery = body?.query;

    if (!rawQuery || typeof rawQuery !== 'string' || !rawQuery.trim()) {
      return NextResponse.json(
        { error: 'A search query is required to evaluate faculty matches.' },
        { status: 400 }
      );
    }

    // Sanitize search query (remove control chars and collapse spaces)
    const cleanQuery = rawQuery
      .slice(0, 300)
      .replace(/[\x00-\x1F\x7F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanQuery.length < 2) {
      return NextResponse.json(
        { error: 'Search query is too short. Please describe the academic discipline, degree, or confessional standard required.' },
        { status: 400 }
      );
    }

    // Authorization & Tier Gating: Authenticated Institution or Admin required
    const authClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to access AI faculty matching.' },
        { status: 401 }
      );
    }

    const { data: instUser } = await authClient
      .from('institution_users')
      .select('institution_id')
      .eq('account_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: account } = await authClient
      .from('accounts')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = account?.role === 'admin';

    if (!instUser && !isAdmin) {
      return NextResponse.json(
        { error: 'Institutional account required. AI faculty matching is reserved for accredited seminary and university partners.' },
        { status: 403 }
      );
    }

    if (!isAdmin && instUser) {
      const subscription = await getInstitutionSubscription(instUser.institution_id);
      if (!subscription || subscription.status !== 'active') {
        return NextResponse.json(
          { error: 'An active institutional subscription is required to access AI faculty matching.' },
          { status: 403 }
        );
      }
      if (subscription.tier === 'basic') {
        return NextResponse.json(
          {
            error: 'AI Faculty Matcher requires a Verified Seminary or Premier Partner subscription.',
            upgradeUrl: '/institution/subscription',
          },
          { status: 403 }
        );
      }
    }

    // Attempt to query database for approved scholars
    // Fictional seed candidates exist for local `next dev` demos only; in a deployed
    // build they would be presented to a provost as real people (Council Review 12).
    const candidates: CandidateForMatching[] =
      process.env.NODE_ENV === 'development' ? [...SEED_CANDIDATES] : [];

    try {
      // Caller's RLS-scoped client: only rows the caller may see feed the matcher.
      const supabase = authClient;
      const { data: dbScholars } = await supabase
        .from('scholars')
        .select(`
          id,
          slug,
          full_name,
          title,
          current_institution,
          institutional_role,
          biography,
          credentials (*),
          publications (*),
          courses (*),
          availability_profiles (*),
          scholar_disciplines (
            is_primary,
            disciplines (name)
          ),
          scholar_traditions (
            is_primary,
            traditions (name)
          ),
          scholar_confessions (
            adherence_level,
            exception_notes,
            confessional_standards (name)
          )
        `)
        .eq('profile_status', 'approved')
        .limit(20);

      interface DbScholarJoinRow {
        id: string;
        slug: string;
        full_name: string;
        title: string | null;
        current_institution: string | null;
        institutional_role: string | null;
        biography: string | null;
        scholar_disciplines?: Array<{ is_primary: boolean; disciplines: { name: string } | null }>;
        scholar_traditions?: Array<{ is_primary: boolean; traditions: { name: string } | null }>;
        scholar_confessions?: Array<{ adherence_level: string; exception_notes: string | null; confessional_standards: { name: string } | null }>;
        credentials?: Array<{ degree: string; field_of_study?: string | null; institution_name: string; year_awarded?: number | null; is_terminal?: boolean }>;
        publications?: Array<{ title: string; publication_type?: string; year?: number; citation_text?: string | null }>;
        courses?: Array<{ title: string; level?: string; delivery_modes?: string[] }>;
        availability_profiles?: Array<{ is_available_for_hire?: boolean; opportunity_types?: string[]; preferred_delivery_modes?: string[] }>;
      }

      if (dbScholars && dbScholars.length > 0) {
        for (const row of dbScholars) {
          // Avoid duplicate slugs
          if (candidates.some((c) => c.slug === row.slug || c.id === row.id)) {
            continue;
          }

          const rawRow = row as unknown as DbScholarJoinRow;
          candidates.push({
            id: String(rawRow.id),
            slug: String(rawRow.slug),
            full_name: String(rawRow.full_name),
            title: rawRow.title,
            current_institution: rawRow.current_institution,
            institutional_role: rawRow.institutional_role,
            biography: rawRow.biography,
            disciplines: (rawRow.scholar_disciplines || []).map((d) => ({
              name: d.disciplines?.name || 'Theology',
              is_primary: d.is_primary,
            })),
            traditions: (rawRow.scholar_traditions || []).map((t) => ({
              name: t.traditions?.name || 'Reformed & Presbyterian',
              is_primary: t.is_primary,
            })),
            confessions: (rawRow.scholar_confessions || []).map((c) => ({
              name: c.confessional_standards?.name || 'Creed',
              adherence_level: c.adherence_level,
              exception_notes: c.exception_notes,
            })),
            credentials: rawRow.credentials || [],
            publications: rawRow.publications || [],
            courses: rawRow.courses || [],
            availability: rawRow.availability_profiles?.[0] || null,
          });
        }
      }
    } catch (dbErr) {
      console.warn('[AIMatcherAPI] Error querying live scholars table, using verified candidates:', dbErr);
    }

    // Run matching
    const matches = await matchFacultyWithGemini(cleanQuery, candidates);

    return NextResponse.json({
      query: cleanQuery,
      matches,
      totalMatches: matches.length,
      engine: process.env.GEMINI_API_KEY ? 'gemini' : 'heuristic',
      evaluatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[AIMatcherAPI] Unexpected server error:', error);
    return NextResponse.json(
      { error: 'Failed to process faculty match request.' },
      { status: 500 }
    );
  }
}
