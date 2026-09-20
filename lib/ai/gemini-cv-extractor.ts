/**
 * ==============================================================================
 * FaithFull Scholars — AI-Assisted CV Intelligence Engine (Step 2)
 *
 * Employs Google Gemini generative AI to perform high-fidelity structured
 * extraction on academic and theological Curriculum Vitae documents.
 * Extracts doctoral credentials, thesis topics, publications with Chicago/SBL
 * citation styles, confessional affinities, disciplines, and languages.
 *
 * Gracefully and deterministically falls back to heuristic rule-based parsing
 * (`parseCvText`) when the API key is not configured or during network errors.
 * ==============================================================================
 */

import {
  ParsedCvDraft,
  ParsedDegreeSuggestion,
  ParsedPublicationSuggestion,
  parseCvText
} from '@/lib/profiles/cv-parser';

export interface GeminiCvExtractionOptions {
  apiKey?: string;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
}

const DEFAULT_MODEL = 'gemini-1.5-flash';
const DEFAULT_TIMEOUT_MS = 15000;

const THEOLOGICAL_CV_SYSTEM_INSTRUCTION = `
You are an expert academic registrar and theological faculty intelligence specialist for FaithFull Scholars.
Your role is to analyze curriculum vitae (CV) documents from theological, biblical, and religious studies professors and extract clean, structured profile data.

Extract the following in strictly valid JSON:
1. full_name: string (Academic name, excluding prefix titles like "Dr." or "Rev." if possible)
2. title: string (Full current academic title, e.g. "Professor of New Testament Studies")
3. current_institution: string (University, seminary, or divinity school)
4. institutional_role: string (e.g. "Professor", "Associate Professor", "Assistant Professor", "Dean", "Adjunct Faculty", "Lecturer")
5. contact_email: string (primary academic or contact email)
6. location: string (city, state, country if listed)
7. biography: string (2-3 sentence academic biography summary synthesizing their background and focus)
8. credentials: array of { degree: string, field?: string, institution: string, year?: number }
   - Ensure doctoral degrees (Ph.D., Th.D., D.Phil., D.Min.), master's degrees (Th.M., M.Div., M.T.S., M.A.), and bachelor's degrees are captured.
9. publications: array of { title: string, publication_type: "book" | "journal_article" | "book_chapter" | "monograph" | "essay" | "review" | "other", publisher_or_journal?: string, year?: number, citation_string: string }
   - Respect Chicago Manual of Style / SBL citation formats.
10. suggested_disciplines: string[]
    - Map to standard theological disciplines:
      * "Old Testament & Hebrew Scriptures"
      * "New Testament & Early Christianity"
      * "Systematic Theology"
      * "Historical Theology & Church History"
      * "Pastoral & Practical Theology"
      * "Biblical Languages"
      * "Christian Ethics & Moral Theology"
      * "Philosophical Theology & Apologetics"
      * "Missions & Intercultural Studies"
11. suggested_traditions: string[]
    - E.g. "Reformed & Presbyterian", "Confessional Baptist", "Anglican & Episcopalian", "Lutheran", "Methodist & Wesleyan", "Evangelical Free & Independent"
12. languages: string[] (ancient and modern research languages, e.g. "Biblical Hebrew", "Koine Greek", "Aramaic", "Latin", "German")
13. personal_doctrinal_statement: string (summary or extract of confessional or doctrinal statement if present)
14. confidence: "high" | "medium" | "low"
`;

/**
 * Extracts structured academic CV data with Gemini LLM, falling back to heuristic parsing if needed.
 */
export async function extractCvWithGemini(
  rawText: string,
  options: GeminiCvExtractionOptions = {}
): Promise<ParsedCvDraft> {
  if (!rawText || !rawText.trim()) {
    return parseCvText('');
  }

  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // API key unconfigured — execute deterministic heuristic fallback
    return parseCvText(rawText);
  }

  const model = options.model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const payload = {
      systemInstruction: {
        parts: [{ text: THEOLOGICAL_CV_SYSTEM_INSTRUCTION }]
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Please parse this academic CV and output strictly JSON:\n\n${rawText}`
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: options.temperature ?? 0.1
      }
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[GeminiCvExtractor] HTTP ${res.status} from Gemini API, falling back to heuristic parser`);
      return parseCvText(rawText);
    }

    const data = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      console.warn('[GeminiCvExtractor] Empty completion from Gemini API, falling back to heuristic parser');
      return parseCvText(rawText);
    }

    const parsedJson = JSON.parse(candidateText);
    return normalizeParsedCvDraft(parsedJson, rawText);
  } catch (err) {
    clearTimeout(timer);
    console.warn('[GeminiCvExtractor] Error during Gemini extraction, falling back to heuristic parser:', err);
    return parseCvText(rawText);
  }
}

/**
 * Normalizes and validates Gemini output against the ParsedCvDraft interface.
 */
export function normalizeParsedCvDraft(raw: Record<string, unknown>, sourceText: string): ParsedCvDraft {
  const lineCount = sourceText.split(/\r?\n/).filter((l) => l.trim().length > 0).length;

  const credentials: ParsedDegreeSuggestion[] = Array.isArray(raw.credentials)
    ? raw.credentials.map((c: Record<string, unknown>) => ({
        degree: String(c.degree || 'Degree'),
        field: c.field ? String(c.field) : undefined,
        institution: String(c.institution || 'University / Seminary'),
        year: typeof c.year === 'number' ? c.year : undefined
      }))
    : [];

  const publications: ParsedPublicationSuggestion[] = Array.isArray(raw.publications)
    ? raw.publications.map((p: Record<string, unknown>) => {
        const validTypes = ['book', 'journal_article', 'book_chapter', 'monograph', 'essay', 'review', 'other'];
        const pType = typeof p.publication_type === 'string' && validTypes.includes(p.publication_type)
          ? (p.publication_type as ParsedPublicationSuggestion['publication_type'])
          : 'other';

        return {
          title: String(p.title || 'Untitled Publication'),
          publication_type: pType,
          publisher_or_journal: p.publisher_or_journal ? String(p.publisher_or_journal) : undefined,
          year: typeof p.year === 'number' ? p.year : undefined,
          citation_string: String(p.citation_string || p.title || '')
        };
      })
    : [];

  const suggested_disciplines: string[] = Array.isArray(raw.suggested_disciplines)
    ? raw.suggested_disciplines.map(String).filter((s) => s.length > 0)
    : [];

  const suggested_traditions: string[] = Array.isArray(raw.suggested_traditions)
    ? raw.suggested_traditions.map(String).filter((s) => s.length > 0)
    : [];

  const languages: string[] = Array.isArray(raw.languages)
    ? raw.languages.map(String).filter((s) => s.length > 0)
    : [];

  const confidence: 'high' | 'medium' | 'low' =
    raw.confidence === 'high' || raw.confidence === 'medium' || raw.confidence === 'low'
      ? raw.confidence
      : credentials.length > 0 && publications.length > 0
        ? 'high'
        : 'medium';

  return {
    full_name: raw.full_name ? String(raw.full_name) : undefined,
    title: raw.title ? String(raw.title) : undefined,
    current_institution: raw.current_institution ? String(raw.current_institution) : undefined,
    institutional_role: raw.institutional_role ? String(raw.institutional_role) : undefined,
    contact_email: raw.contact_email ? String(raw.contact_email) : undefined,
    location: raw.location ? String(raw.location) : undefined,
    biography: raw.biography ? String(raw.biography) : undefined,
    credentials,
    publications,
    suggested_disciplines,
    suggested_traditions,
    languages,
    personal_doctrinal_statement: raw.personal_doctrinal_statement
      ? String(raw.personal_doctrinal_statement)
      : undefined,
    raw_line_count: lineCount,
    confidence
  };
}
