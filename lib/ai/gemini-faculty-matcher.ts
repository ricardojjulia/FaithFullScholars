/**
 * ==============================================================================
 * FaithFull Scholars — Citation-Grounded AI Faculty Matcher (Feature 3)
 *
 * Provides institutional recruiters, deans, and academic search committees with
 * intelligent, citation-grounded candidate matching powered by Google Gemini,
 * backed by an exhaustive deterministic heuristic baseline (`matchFacultyHeuristic`).
 *
 * Extracts and surfaces verifiable citations from candidate credentials,
 * publications, confessional subscriptions, and course syllabi.
 * ==============================================================================
 */

export interface CandidateForMatching {
  id: string;
  slug: string;
  full_name: string;
  title?: string | null;
  current_institution?: string | null;
  institutional_role?: string | null;
  biography?: string | null;
  disciplines: Array<{ name: string; is_primary?: boolean }>;
  traditions: Array<{ name: string; is_primary?: boolean }>;
  confessions: Array<{ name: string; adherence_level?: string; exception_notes?: string | null }>;
  credentials?: Array<{
    degree: string;
    field_of_study?: string | null;
    institution_name: string;
    year_awarded?: number | null;
    is_terminal?: boolean;
  }>;
  publications?: Array<{
    title: string;
    publication_type?: string;
    year?: number;
    citation_text?: string | null;
  }>;
  courses?: Array<{
    title: string;
    level?: string;
    delivery_modes?: string[];
  }>;
  availability?: {
    is_available_for_hire?: boolean;
    opportunity_types?: string[];
    preferred_delivery_modes?: string[];
  } | null;
}

export interface GroundedCitation {
  sourceType: 'credential' | 'publication' | 'confession' | 'course' | 'availability' | 'biography';
  title: string;
  quoteOrDetail: string;
}

export interface FacultyMatchResult {
  scholarId: string;
  fullName: string;
  slug: string;
  currentInstitution?: string | null;
  academicTitle?: string | null;
  fitScore: number; // 0 to 100
  fitLevel: 'Exceptional Fit' | 'Strong Fit' | 'Potential Match';
  committeeSummary: string;
  groundedCitations: GroundedCitation[];
  strengths: string[];
  potentialGaps?: string[];
}

export interface GeminiMatcherOptions {
  apiKey?: string;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
}

const DEFAULT_MODEL = 'gemini-1.5-flash';
const DEFAULT_TIMEOUT_MS = 15000;

const PROVOST_MATCHER_SYSTEM_INSTRUCTION = `
You are the Executive Search Advisor to seminary deans, provosts, and faculty search committees for FaithFull Scholars.
Evaluate the candidate faculty roster against the institutional hiring inquiry and rank the best-matched scholars.

For each matching candidate, you MUST provide:
1. scholarId: string (Exact ID of candidate)
2. fullName: string (Candidate full name)
3. slug: string (Candidate profile slug)
4. fitScore: number (0-100 score reflecting precise academic, doctrinal, and course fit)
5. fitLevel: "Exceptional Fit" (score >= 85) | "Strong Fit" (score >= 70) | "Potential Match" (score >= 50)
6. committeeSummary: string (2-3 concise sentences tailored for an executive academic search committee memo explaining why this scholar qualifies)
7. groundedCitations: Array of { sourceType: "credential"|"publication"|"confession"|"course"|"availability"|"biography", title: string, quoteOrDetail: string }
   - CRITICAL: Ground every citation in the actual data provided (e.g. specific degree, book title, confessional subscription, or course).
8. strengths: string[] (3-5 specific strengths relevant to the search)
9. potentialGaps: string[] (Any minor gaps or areas for committee clarification, e.g. relocation preference or publication recency)

Return strictly a JSON array of FacultyMatchResult objects sorted by fitScore descending. Do not include markdown code fence formatting outside the JSON if possible, or format as pure JSON.
`;

/**
 * Deterministic Heuristic Matcher
 * Evaluates candidates based on weighted theological scoring across:
 * - Credentials & terminal doctoral institutions (Cambridge, Oxford, Harvard, etc.)
 * - Confessional standards adherence & historic creeds
 * - Academic disciplines & research topics
 * - Publications & peer-reviewed books
 * - Syllabi and courses taught
 */
export function matchFacultyHeuristic(
  query: string,
  candidates: CandidateForMatching[]
): FacultyMatchResult[] {
  if (!query || !query.trim() || candidates.length === 0) {
    return [];
  }

  const q = query.toLowerCase();
  const tokens = q.split(/[\s,.;:!?/()]+/).filter((t) => t.length > 2);

  const results: FacultyMatchResult[] = [];

  for (const candidate of candidates) {
    let score = 25; // baseline interest
    const citations: GroundedCitation[] = [];
    const strengths: string[] = [];
    const gaps: string[] = [];

    // 1. Credentials Analysis
    const terminal = candidate.credentials?.find((c) => c.is_terminal);
    if (terminal) {
      strengths.push(`Holds terminal degree: ${terminal.degree} from ${terminal.institution_name}`);
      const instLower = terminal.institution_name.toLowerCase();
      const degreeLower = terminal.degree.toLowerCase();
      const fieldLower = (terminal.field_of_study || '').toLowerCase();

      let credentialMatched = false;
      if (
        (q.includes('ph.d') || q.includes('phd') || q.includes('doctor') || q.includes('terminal')) &&
        (degreeLower.includes('ph') || degreeLower.includes('th.d') || degreeLower.includes('d.phil'))
      ) {
        score += 20;
        credentialMatched = true;
      }

      if (tokens.some((t) => instLower.includes(t))) {
        score += 25;
        credentialMatched = true;
      }

      if (tokens.some((t) => fieldLower.includes(t))) {
        score += 15;
        credentialMatched = true;
      }

      if (credentialMatched) {
        citations.push({
          sourceType: 'credential',
          title: `${terminal.degree} in ${terminal.field_of_study || 'Theology'}`,
          quoteOrDetail: `${terminal.degree} awarded by ${terminal.institution_name}${terminal.year_awarded ? ` (${terminal.year_awarded})` : ''}`,
        });
      }
    } else if (q.includes('doctor') || q.includes('ph.d') || q.includes('terminal')) {
      gaps.push('No terminal doctoral degree verified in active profile');
    }

    // 2. Confessional Standards Analysis
    for (const conf of candidate.confessions || []) {
      const confNameLower = conf.name.toLowerCase();
      const isFull = conf.adherence_level === 'full_subscription' || conf.adherence_level === 'full';

      const matchFound =
        (q.includes('westminster') && confNameLower.includes('westminster')) ||
        (q.includes('1689') && (confNameLower.includes('1689') || confNameLower.includes('baptist'))) ||
        (q.includes('heidelberg') && confNameLower.includes('heidelberg')) ||
        (q.includes('nicene') && confNameLower.includes('nicene')) ||
        (q.includes('reformed') && confNameLower.includes('reformed')) ||
        (q.includes('chalcedon') && confNameLower.includes('chalcedon')) ||
        tokens.some((t) => t.length > 4 && confNameLower.includes(t));

      if (matchFound) {
        score += 25;
        strengths.push(`Verified confessional subscription: ${conf.name} (${conf.adherence_level || 'Affirmed'})`);
        citations.push({
          sourceType: 'confession',
          title: conf.name,
          quoteOrDetail: `Subscriber status: ${conf.adherence_level || 'Affirmed'}${isFull ? ' without exceptions' : ''}`,
        });
      }
    }

    // 3. Disciplines & Traditions Match
    for (const disc of candidate.disciplines || []) {
      const discLower = disc.name.toLowerCase();
      if (tokens.some((t) => t.length > 3 && discLower.includes(t)) || q.includes(discLower)) {
        score += 20;
        strengths.push(`Primary field alignment: ${disc.name}`);
        citations.push({
          sourceType: 'biography',
          title: `Discipline: ${disc.name}`,
          quoteOrDetail: `Formally categorized under ${disc.name} curriculum`,
        });
      }
    }

    for (const trad of candidate.traditions || []) {
      const tradLower = trad.name.toLowerCase();
      if (tokens.some((t) => t.length > 4 && tradLower.includes(t)) || q.includes(tradLower)) {
        score += 15;
        strengths.push(`Theological tradition alignment: ${trad.name}`);
      }
    }

    // 4. Publications Grounding
    for (const pub of candidate.publications || []) {
      const pubTitleLower = pub.title.toLowerCase();
      if (tokens.some((t) => t.length > 4 && pubTitleLower.includes(t))) {
        score += 15;
        citations.push({
          sourceType: 'publication',
          title: pub.title,
          quoteOrDetail: pub.citation_text || `${pub.publication_type || 'Scholarly work'}, ${pub.year || ''}`,
        });
        strengths.push(`Published monograph/article: "${pub.title}"`);
        break;
      }
    }

    // 5. Courses & Syllabi Grounding
    for (const course of candidate.courses || []) {
      const courseLower = course.title.toLowerCase();
      if (tokens.some((t) => t.length > 4 && courseLower.includes(t))) {
        score += 15;
        citations.push({
          sourceType: 'course',
          title: course.title,
          quoteOrDetail: `Demonstrated teaching portfolio: ${course.title} (${course.level || 'Graduate level'})`,
        });
        strengths.push(`Demonstrated teaching syllabus: ${course.title}`);
        break;
      }
    }

    // 6. Availability matching (e.g. modular, adjunct, online)
    if (q.includes('modular') || q.includes('adjunct') || q.includes('online')) {
      const opps = candidate.availability?.opportunity_types || [];
      const modes = candidate.availability?.preferred_delivery_modes || [];
      if (
        (q.includes('modular') && opps.some((o) => o.includes('modular'))) ||
        (q.includes('adjunct') && opps.some((o) => o.includes('adjunct'))) ||
        (q.includes('online') && modes.some((m) => m.includes('online')))
      ) {
        score += 10;
        strengths.push('Directly matches requested delivery format and appointment availability');
        citations.push({
          sourceType: 'availability',
          title: 'Teaching Availability',
          quoteOrDetail: `Available for ${opps.join(', ') || 'instruction'} (${modes.join(', ') || 'flexible formats'})`,
        });
      }
    }

    // Clamp score between 0 and 99
    const finalScore = Math.min(Math.max(score, 10), 98);
    const fitLevel: 'Exceptional Fit' | 'Strong Fit' | 'Potential Match' =
      finalScore >= 80 ? 'Exceptional Fit' : finalScore >= 65 ? 'Strong Fit' : 'Potential Match';

    // Formulate committee summary
    const credSummary = terminal
      ? `${terminal.degree} from ${terminal.institution_name}`
      : 'theological credentials';
    const discSummary = candidate.disciplines[0]?.name || 'theological studies';
    const confSummary = candidate.confessions[0]?.name || 'confessional orthodoxy';

    const committeeSummary = `${candidate.full_name} is an academic match for this position, presenting verified ${credSummary} in ${discSummary} with documented adherence to ${confSummary}.`;

    results.push({
      scholarId: candidate.id,
      fullName: candidate.full_name,
      slug: candidate.slug,
      currentInstitution: candidate.current_institution,
      academicTitle: candidate.title,
      fitScore: finalScore,
      fitLevel,
      committeeSummary,
      groundedCitations: citations.slice(0, 4),
      strengths: strengths.slice(0, 4),
      potentialGaps: gaps.length > 0 ? gaps : undefined,
    });
  }

  // Sort descending by fitScore
  return results.sort((a, b) => b.fitScore - a.fitScore);
}

/**
 * Searches and matches faculty candidates using Google Gemini LLM with
 * automatic fallback to deterministic heuristic analysis.
 */
export async function matchFacultyWithGemini(
  query: string,
  candidates: CandidateForMatching[],
  options: GeminiMatcherOptions = {}
): Promise<FacultyMatchResult[]> {
  if (!query || !query.trim() || candidates.length === 0) {
    return [];
  }

  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return matchFacultyHeuristic(query, candidates);
  }

  const model = options.model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const simplifiedCandidates = candidates.slice(0, 15).map((c) => ({
      id: c.id,
      slug: c.slug,
      full_name: c.full_name,
      title: c.title,
      current_institution: c.current_institution,
      disciplines: c.disciplines.map((d) => d.name),
      traditions: c.traditions.map((t) => t.name),
      confessions: c.confessions.map((cf) => `${cf.name} (${cf.adherence_level || 'affirmed'})`),
      credentials: (c.credentials || []).map((cr) => `${cr.degree} in ${cr.field_of_study || 'Theology'} from ${cr.institution_name} (${cr.year_awarded || ''})`),
      publications: (c.publications || []).map((p) => `"${p.title}" (${p.publication_type || 'work'}, ${p.year || ''})`),
      courses: (c.courses || []).map((co) => co.title),
      availability: c.availability ? {
        opportunities: c.availability.opportunity_types,
        modes: c.availability.preferred_delivery_modes,
      } : null,
    }));

    const payload = {
      systemInstruction: {
        parts: [{ text: PROVOST_MATCHER_SYSTEM_INSTRUCTION }],
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Institutional Search Query: "${query}"\n\nCandidate Faculty Roster:\n${JSON.stringify(simplifiedCandidates, null, 2)}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        responseMimeType: 'application/json',
      },
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[GeminiFacultyMatcher] Gemini API returned status ${res.status}, using heuristic`);
      return matchFacultyHeuristic(query, candidates);
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return matchFacultyHeuristic(query, candidates);
    }

    const cleanJson = rawText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item: Record<string, unknown>) => ({
        scholarId: String(item.scholarId || ''),
        fullName: String(item.fullName || ''),
        slug: String(item.slug || ''),
        currentInstitution: item.currentInstitution ? String(item.currentInstitution) : undefined,
        academicTitle: item.academicTitle ? String(item.academicTitle) : undefined,
        fitScore: typeof item.fitScore === 'number' ? item.fitScore : 75,
        fitLevel:
          item.fitLevel === 'Exceptional Fit' || item.fitLevel === 'Strong Fit' || item.fitLevel === 'Potential Match'
            ? item.fitLevel
            : 'Strong Fit',
        committeeSummary: String(item.committeeSummary || ''),
        groundedCitations: Array.isArray(item.groundedCitations)
          ? (item.groundedCitations as Record<string, unknown>[]).map((cit) => ({
              sourceType: (cit.sourceType as GroundedCitation['sourceType']) || 'biography',
              title: String(cit.title || 'Citation'),
              quoteOrDetail: String(cit.quoteOrDetail || ''),
            }))
          : [],
        strengths: Array.isArray(item.strengths) ? item.strengths.map(String) : [],
        potentialGaps: Array.isArray(item.potentialGaps) ? item.potentialGaps.map(String) : undefined,
      }));
    }

    return matchFacultyHeuristic(query, candidates);
  } catch (err) {
    clearTimeout(timer);
    console.warn('[GeminiFacultyMatcher] Error invoking Gemini API, falling back to heuristic:', err);
    return matchFacultyHeuristic(query, candidates);
  }
}
