/**
 * ==============================================================================
 * FaithFull Scholars — Syllabus & Course Document Intelligence (Step 2)
 *
 * Employs Google Gemini generative AI to perform structured extraction on
 * theological course syllabi, seminar prospectuses, and lecture outlines.
 * Extracts course levels, academic disciplines, learning outcomes, required
 * primary texts, delivery modes, and theological taxonomy tags.
 *
 * Deterministically falls back to heuristic rule-based parsing
 * (`parseSyllabusHeuristic`) when unconfigured or offline.
 * ==============================================================================
 */

export type CourseLevel = 'undergraduate' | 'graduate' | 'doctoral';
export type DeliveryMode = 'residential' | 'hybrid' | 'online_synchronous' | 'online_asynchronous';

export interface RequiredTextItem {
  title: string;
  author?: string;
  year?: number;
  citation_text: string;
}

export interface ParsedSyllabusMetadata {
  title?: string;
  course_code?: string;
  level: CourseLevel;
  suggested_discipline?: string;
  secondary_disciplines: string[];
  topical_tags: string[];
  learning_outcomes: string[];
  required_texts: RequiredTextItem[];
  recommended_delivery_modes: DeliveryMode[];
  summary?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface GeminiSyllabusOptions {
  apiKey?: string;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
}

const DEFAULT_MODEL = 'gemini-1.5-flash';
const DEFAULT_TIMEOUT_MS = 15000;

const KNOWN_THEOLOGICAL_DISCIPLINES = [
  {
    name: 'Old Testament & Hebrew Scriptures',
    keywords: ['old testament', 'hebrew scriptures', 'tanakh', 'pentateuch', 'hebrew poetry', 'psalms', 'prophets', 'ancient near east']
  },
  {
    name: 'New Testament & Early Christianity',
    keywords: ['new testament', 'gospels', 'pauline epistles', 'pauline', 'johannine', 'acts', 'early church', 'apostolic']
  },
  {
    name: 'Systematic Theology',
    keywords: ['systematic theology', 'dogmatics', 'trinitarian', 'christology', 'soteriology', 'pneumatology', 'ecclesiology', 'eschatology']
  },
  {
    name: 'Historical Theology & Church History',
    keywords: ['historical theology', 'church history', 'patristic', 'reformation', 'puritan', 'scholasticism', 'creeds']
  },
  {
    name: 'Pastoral & Practical Theology',
    keywords: ['pastoral theology', 'homiletics', 'preaching', 'pastoral care', 'counseling', 'ministry', 'leadership']
  },
  {
    name: 'Biblical Languages',
    keywords: ['biblical hebrew', 'koine greek', 'aramaic', 'hebrew syntax', 'greek exegesis']
  },
  {
    name: 'Christian Ethics & Moral Theology',
    keywords: ['christian ethics', 'moral theology', 'bioethics', 'biomedical ethics', 'virtue ethics']
  },
  {
    name: 'Philosophical Theology & Apologetics',
    keywords: ['apologetics', 'philosophical theology', 'epistemology', 'presuppositional', 'philosophy of religion']
  },
  {
    name: 'Missions & Intercultural Studies',
    keywords: ['missions', 'missiology', 'intercultural', 'world christianity', 'evangelism']
  }
];

const THEOLOGICAL_SYLLABUS_SYSTEM_INSTRUCTION = `
You are an academic curriculum director and theological accreditation specialist for FaithFull Scholars.
Analyze the provided course syllabus or seminar outline and produce clean, structured course metadata in strictly valid JSON:

Fields to extract:
1. title: string (Course title, e.g. "Hebrew Poetry & The Psalms of Lament")
2. course_code: string (Departmental course code, e.g. "OT 601" or "TH 802")
3. level: "undergraduate" | "graduate" | "doctoral"
4. suggested_discipline: string (Primary theological discipline matching standard taxonomy)
5. secondary_disciplines: string[] (Any secondary interdisciplinary fields)
6. topical_tags: string[] (3-8 specific doctrinal, hermeneutical, or biblical topics, e.g. ["Psalms of Lament", "Hebrew Parallelism", "Theodicy", "Ancient Near East"])
7. learning_outcomes: string[] (Formal course learning objectives, e.g. ["Analyze meter and parallelism in Hebrew poetry", "Examine historical contexts of communal lament"])
8. required_texts: array of { title: string, author?: string, year?: number, citation_text: string }
9. recommended_delivery_modes: array of ("residential" | "hybrid" | "online_synchronous" | "online_asynchronous")
10. summary: string (Concise 2-3 sentence course description synthesizing scope and purpose)
11. confidence: "high" | "medium" | "low"
`;

/**
 * Analyzes syllabus document text with Gemini LLM, with deterministic heuristic fallback.
 */
export async function tagSyllabusWithGemini(
  syllabusText: string,
  options: GeminiSyllabusOptions = {}
): Promise<ParsedSyllabusMetadata> {
  if (!syllabusText || !syllabusText.trim()) {
    return parseSyllabusHeuristic('');
  }

  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return parseSyllabusHeuristic(syllabusText);
  }

  const model = options.model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const payload = {
      systemInstruction: {
        parts: [{ text: THEOLOGICAL_SYLLABUS_SYSTEM_INSTRUCTION }]
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Please analyze this course syllabus and return strictly JSON:\n\n${syllabusText}`
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
      console.warn(`[GeminiSyllabusTagger] HTTP ${res.status} from Gemini API, falling back to heuristic parser`);
      return parseSyllabusHeuristic(syllabusText);
    }

    const data = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      console.warn('[GeminiSyllabusTagger] Empty response from Gemini API, falling back to heuristic parser');
      return parseSyllabusHeuristic(syllabusText);
    }

    const parsedJson = JSON.parse(candidateText);
    return normalizeParsedSyllabus(parsedJson, syllabusText);
  } catch (err) {
    clearTimeout(timer);
    console.warn('[GeminiSyllabusTagger] Error during syllabus extraction, falling back to heuristic parser:', err);
    return parseSyllabusHeuristic(syllabusText);
  }
}

/**
 * Heuristic rule-based syllabus parser used as offline/testing baseline and error fallback.
 */
export function parseSyllabusHeuristic(rawText: string): ParsedSyllabusMetadata {
  if (!rawText || !rawText.trim()) {
    return {
      level: 'graduate',
      secondary_disciplines: [],
      topical_tags: [],
      learning_outcomes: [],
      required_texts: [],
      recommended_delivery_modes: ['residential'],
      confidence: 'low'
    };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const lowerText = rawText.toLowerCase();

  // 1. Course Code & Title
  let title: string | undefined;
  let course_code: string | undefined;

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    const codeMatch = line.match(/^([A-Z]{2,4}\s*\d{3,4})[:\s-]+(.*)$/i);
    if (codeMatch) {
      course_code = codeMatch[1].toUpperCase().replace(/\s+/, ' ');
      title = codeMatch[2].trim();
      break;
    }
    if (line.toLowerCase().startsWith('course:') || line.toLowerCase().startsWith('title:')) {
      title = line.replace(/^(course|title):\s*/i, '').trim();
    }
  }

  if (!title && lines.length > 0) {
    // Fallback: take the first non-trivial header line
    title = lines[0].replace(/^(syllabus|course syllabus|prospectus)\s*:?\s*/i, '');
  }

  // 2. Academic Level
  let level: CourseLevel = 'graduate';
  const numMatch = course_code ? course_code.match(/\d{3,4}/) : null;
  const courseNum = numMatch ? parseInt(numMatch[0], 10) : null;

  if (
    lowerText.includes('doctoral') ||
    lowerText.includes('ph.d.') ||
    lowerText.includes('th.d.') ||
    lowerText.includes('d.min') ||
    (courseNum !== null && courseNum >= 800)
  ) {
    level = 'doctoral';
  } else if (
    lowerText.includes('undergraduate') ||
    lowerText.includes('bachelor') ||
    lowerText.includes('college') ||
    (courseNum !== null && courseNum < 500)
  ) {
    level = 'undergraduate';
  } else {
    level = 'graduate';
  }

  // 3. Disciplines
  let suggested_discipline: string | undefined;
  const secondary_disciplines: string[] = [];

  for (const disc of KNOWN_THEOLOGICAL_DISCIPLINES) {
    if (disc.keywords.some((kw) => lowerText.includes(kw))) {
      if (!suggested_discipline) {
        suggested_discipline = disc.name;
      } else if (!secondary_disciplines.includes(disc.name)) {
        secondary_disciplines.push(disc.name);
      }
    }
  }

  // 4. Delivery Modes
  const modes: Set<DeliveryMode> = new Set();
  if (lowerText.includes('residential') || lowerText.includes('in-person') || lowerText.includes('on-campus') || lowerText.includes('lecture hall')) {
    modes.add('residential');
  }
  if (lowerText.includes('hybrid') || lowerText.includes('modular') || lowerText.includes('intensive')) {
    modes.add('hybrid');
  }
  if (lowerText.includes('online synchronous') || lowerText.includes('live zoom') || lowerText.includes('synchronous online')) {
    modes.add('online_synchronous');
  }
  if (lowerText.includes('online asynchronous') || lowerText.includes('asynchronous') || lowerText.includes('canvas') || lowerText.includes('self-paced')) {
    modes.add('online_asynchronous');
  }
  if (modes.size === 0) {
    modes.add('residential');
  }

  // 5. Sections slicing: Learning Outcomes, Required Texts, Description
  const outcomes: string[] = [];
  const required_texts: RequiredTextItem[] = [];
  const descriptionLines: string[] = [];

  let currentSection: 'description' | 'outcomes' | 'texts' | 'other' = 'other';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    if (
      lower.startsWith('course description') ||
      lower.startsWith('description') ||
      lower.startsWith('course overview')
    ) {
      currentSection = 'description';
      continue;
    } else if (
      lower.includes('learning outcome') ||
      lower.includes('course objective') ||
      lower.includes('student learning goal') ||
      lower.includes('course goals')
    ) {
      currentSection = 'outcomes';
      continue;
    } else if (
      lower.includes('required text') ||
      lower.includes('required reading') ||
      lower.includes('textbook') ||
      lower.includes('primary bibliography')
    ) {
      currentSection = 'texts';
      continue;
    } else if (
      lower.startsWith('grading') ||
      lower.startsWith('schedule') ||
      lower.startsWith('course schedule') ||
      lower.startsWith('assignments') ||
      lower.startsWith('policies')
    ) {
      currentSection = 'other';
    }

    if (currentSection === 'description' && line.length > 25) {
      descriptionLines.push(line);
    } else if (currentSection === 'outcomes') {
      const isBulletOrNumbered = /^([•\-\*]|\d+[\.\)])\s*(.*)$/.exec(line);
      if (isBulletOrNumbered && isBulletOrNumbered[2].length > 10) {
        outcomes.push(isBulletOrNumbered[2].trim());
      } else if (line.length > 20 && !line.endsWith(':')) {
        outcomes.push(line.replace(/^[•\-\*]\s*/, '').trim());
      }
    } else if (currentSection === 'texts') {
      const yearMatch = line.match(/\b(19\d\d|20\d\d)\b/);
      if (line.length > 15 && (yearMatch || line.includes(':') || line.includes('.'))) {
        const cleanTitle = line.replace(/^[•\-\*0-9\.]+\s*/, '').trim();
        required_texts.push({
          title: cleanTitle,
          year: yearMatch ? parseInt(yearMatch[1], 10) : undefined,
          citation_text: line
        });
      }
    }
  }

  // 6. Topical tags extraction
  const potentialTags = [
    'Hermeneutics',
    'Exegesis',
    'Hebrew Poetry',
    'Psalms',
    'Lament',
    'Presuppositional Apologetics',
    'Trinitarian Epistemology',
    'Bioethics',
    'Moral Theology',
    'Pauline Epistles',
    'Covenant Theology',
    'Christology',
    'Church History',
    'Patristics',
    'Reformation Studies'
  ];

  const topical_tags = potentialTags.filter((tag) => lowerText.includes(tag.toLowerCase()));

  // 7. Confidence score
  const score =
    (title ? 1 : 0) +
    (course_code ? 1 : 0) +
    (suggested_discipline ? 1 : 0) +
    (outcomes.length > 0 ? 1 : 0) +
    (required_texts.length > 0 ? 1 : 0);

  const confidence = score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low';

  return {
    title,
    course_code,
    level,
    suggested_discipline,
    secondary_disciplines,
    topical_tags,
    learning_outcomes: outcomes.slice(0, 8),
    required_texts: required_texts.slice(0, 10),
    recommended_delivery_modes: Array.from(modes),
    summary: descriptionLines.slice(0, 3).join(' ') || undefined,
    confidence
  };
}

/**
 * Normalizes and validates Gemini output against the ParsedSyllabusMetadata interface.
 */
export function normalizeParsedSyllabus(
  raw: Record<string, unknown>,
  sourceText: string
): ParsedSyllabusMetadata {
  const heuristic = parseSyllabusHeuristic(sourceText);

  const validLevels: CourseLevel[] = ['undergraduate', 'graduate', 'doctoral'];
  const level: CourseLevel =
    typeof raw.level === 'string' && validLevels.includes(raw.level as CourseLevel)
      ? (raw.level as CourseLevel)
      : heuristic.level;

  const validModes: DeliveryMode[] = [
    'residential',
    'hybrid',
    'online_synchronous',
    'online_asynchronous'
  ];
  const recommended_delivery_modes: DeliveryMode[] = Array.isArray(raw.recommended_delivery_modes)
    ? (raw.recommended_delivery_modes.filter((m) =>
        validModes.includes(m as DeliveryMode)
      ) as DeliveryMode[])
    : heuristic.recommended_delivery_modes;

  const required_texts: RequiredTextItem[] = Array.isArray(raw.required_texts)
    ? raw.required_texts.map((t: Record<string, unknown>) => ({
        title: String(t.title || 'Required Text'),
        author: t.author ? String(t.author) : undefined,
        year: typeof t.year === 'number' ? t.year : undefined,
        citation_text: String(t.citation_text || t.title || '')
      }))
    : heuristic.required_texts;

  const learning_outcomes: string[] = Array.isArray(raw.learning_outcomes)
    ? raw.learning_outcomes.map(String).filter((o) => o.length > 0)
    : heuristic.learning_outcomes;

  const topical_tags: string[] = Array.isArray(raw.topical_tags)
    ? raw.topical_tags.map(String).filter((t) => t.length > 0)
    : heuristic.topical_tags;

  const secondary_disciplines: string[] = Array.isArray(raw.secondary_disciplines)
    ? raw.secondary_disciplines.map(String).filter((d) => d.length > 0)
    : heuristic.secondary_disciplines;

  const confidence: 'high' | 'medium' | 'low' =
    raw.confidence === 'high' || raw.confidence === 'medium' || raw.confidence === 'low'
      ? raw.confidence
      : 'high';

  return {
    title: raw.title ? String(raw.title) : heuristic.title,
    course_code: raw.course_code ? String(raw.course_code) : heuristic.course_code,
    level,
    suggested_discipline: raw.suggested_discipline
      ? String(raw.suggested_discipline)
      : heuristic.suggested_discipline,
    secondary_disciplines,
    topical_tags,
    learning_outcomes,
    required_texts,
    recommended_delivery_modes:
      recommended_delivery_modes.length > 0 ? recommended_delivery_modes : ['residential'],
    summary: raw.summary ? String(raw.summary) : heuristic.summary,
    confidence
  };
}
