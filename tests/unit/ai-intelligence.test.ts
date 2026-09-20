import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractCvWithGemini,
  normalizeParsedCvDraft
} from '@/lib/ai/gemini-cv-extractor';
import {
  tagSyllabusWithGemini,
  parseSyllabusHeuristic,
  normalizeParsedSyllabus
} from '@/lib/ai/gemini-syllabus-tagger';

const SAMPLE_THEOLOGICAL_CV = `
Curriculum Vitae
Dr. Thomas Cranmer-Davies, D.Phil.
Senior Research Fellow in Old Testament & Anglican Studies
Wycliffe Hall, University of Oxford
Email: t.cranmer.davies@oxford.ac.uk
Location: Oxford, United Kingdom

Academic Biography:
Dr. Thomas Cranmer-Davies is Senior Research Fellow in Hebrew Scriptures at Wycliffe Hall, Oxford.
His research explores the poetics of lament, the Psalter in Second Temple Judaism, and early English Reformation liturgies.

Education & Degrees:
• D.Phil. in Theology & Oriental Studies, University of Oxford (2012)
  Dissertation: "Voices of Affliction: Meter, Syntax, and Theology in the Psalms of Communal Lament"
• M.St. in Jewish Studies, University of Oxford (2008)
• B.A. in Classical Literae Humaniores, University of Cambridge (2006)

Selected Publications:
• The Syntax of Sorrow: Parallelism and Lament in the Hebrew Psalter. Oxford University Press, 2018.
• "The Thirty-Nine Articles and the Regulative Use of the Psalter in Early Modern England." Journal of Theological Studies 69, no. 2 (2018): 512-539.
• "Royal Ideology in the Songs of Ascents," in Reading the Psalms in the Second Temple Era, ed. P. W. Flint. Brill, 2021.

Research Languages:
Biblical Hebrew, Aramaic, Koine Greek, Classical Latin, German

Doctrinal Affirmation:
I affirm ex animo the historic reformed theology set forth in the Thirty-Nine Articles of Religion and the Book of Common Prayer (1662).
`;

const SAMPLE_THEOLOGICAL_SYLLABUS = `
Course Syllabus
OT 601: Hebrew Poetry & The Psalms of Lament
Term: Michaelmas 2026
Instructor: Dr. Thomas Cranmer-Davies
Format: Residential Seminar with Hybrid Intensive options at Wycliffe Hall

Course Description:
This advanced graduate seminar investigates the theology, literary artistry, and syntax of biblical Hebrew poetry, focusing on the Psalms of communal and individual lament. Students will engage with both ancient Near Eastern poetic parallels and historical reception in the Christian church.

Course Learning Outcomes:
1. Translate and exegete selected poetic texts directly from the Biblia Hebraica Stuttgartensia.
2. Analyze parallelismus membrorum, strophic architecture, and metrical theories in biblical Hebrew poetry.
3. Formulate a robust biblical theology of suffering and prayer grounded in the lament tradition.
4. Evaluate historical and liturgical applications of the Psalter from patristic commentary to contemporary pastoral care.

Required Texts:
• Cranmer-Davies, Thomas. The Syntax of Sorrow: Parallelism and Lament in the Hebrew Psalter. Oxford University Press, 2018.
• Alter, Robert. The Art of Biblical Poetry. Basic Books, 2011.
• Westermann, Claus. Praise and Lament in the Psalms. Eerdmans, 1981.

Course Policies & Delivery Modes:
Weekly seminar meetings are held on-campus in the Cranmer Library, with live video participation available for distance scholars enrolled in the hybrid cohort.
`;

describe('AI-Assisted CV & Syllabus Intelligence Engine (Step 2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. CV Intelligence Engine (extractCvWithGemini & heuristic fallback)', () => {
    it('returns empty low-confidence draft when provided empty or whitespace string', async () => {
      const result = await extractCvWithGemini('');
      expect(result.raw_line_count).toBe(0);
      expect(result.confidence).toBe('low');
      expect(result.credentials).toEqual([]);
      expect(result.publications).toEqual([]);
    });

    it('executes deterministic heuristic fallback when no GEMINI_API_KEY is provided', async () => {
      // Ensure no apiKey option and clean env
      const result = await extractCvWithGemini(SAMPLE_THEOLOGICAL_CV, { apiKey: '' });

      expect(result.full_name).toContain('Thomas Cranmer-Davies');
      expect(result.current_institution).toContain('University of Oxford');
      expect(result.contact_email).toBe('t.cranmer.davies@oxford.ac.uk');
      expect(result.credentials.length).toBeGreaterThanOrEqual(1);

      // Verify degree extraction
      const dphil = result.credentials.find((c) => c.degree === 'D.Phil.' || c.degree === 'Ph.D.' || c.degree.includes('Doctor'));
      expect(dphil).toBeDefined();

      // Verify publications extraction
      expect(result.publications.length).toBeGreaterThanOrEqual(2);
      const oupBook = result.publications.find((p) => p.title.includes('Syntax of Sorrow'));
      expect(oupBook).toBeDefined();

      // Verify suggested theological disciplines and traditions
      expect(result.suggested_disciplines).toContain('Old Testament & Hebrew Scriptures');
      expect(result.suggested_traditions).toContain('Anglican & Episcopalian');

      // Verify ancient research languages
      expect(result.languages).toContain('Hebrew');
      expect(result.languages).toContain('Greek');
      expect(result.confidence).toBe('high');
    });

    it('normalizes Gemini JSON responses accurately into ParsedCvDraft schema', () => {
      const mockGeminiJson = {
        full_name: 'Dr. Elizabeth Montgomery-Knox',
        title: 'Associate Professor of Christian Ethics',
        current_institution: 'Princeton Theological Seminary',
        institutional_role: 'Associate Professor',
        contact_email: 'elizabeth.knox@ptsem.edu',
        location: 'Princeton, NJ, USA',
        biography: 'Dr. Montgomery-Knox teaches Christian ethics and pastoral bioethics.',
        credentials: [
          {
            degree: 'Ph.D.',
            field: 'Christian Ethics',
            institution: 'Princeton Theological Seminary',
            year: 2014
          }
        ],
        publications: [
          {
            title: 'Covenantal Bioethics and the Suffering Body',
            publication_type: 'book',
            publisher_or_journal: 'Baker Academic',
            year: 2019,
            citation_string: 'Baker Academic, 2019'
          }
        ],
        suggested_disciplines: ['Christian Ethics & Moral Theology', 'Pastoral & Practical Theology'],
        suggested_traditions: ['Reformed & Presbyterian'],
        languages: ['Biblical Hebrew', 'Koine Greek', 'Latin'],
        personal_doctrinal_statement: 'I subscribe to the Westminster Confession of Faith.',
        confidence: 'high'
      };

      const normalized = normalizeParsedCvDraft(mockGeminiJson, SAMPLE_THEOLOGICAL_CV);

      expect(normalized.full_name).toBe('Dr. Elizabeth Montgomery-Knox');
      expect(normalized.institutional_role).toBe('Associate Professor');
      expect(normalized.credentials[0].degree).toBe('Ph.D.');
      expect(normalized.publications[0].publication_type).toBe('book');
      expect(normalized.suggested_disciplines).toContain('Christian Ethics & Moral Theology');
      expect(normalized.suggested_traditions).toContain('Reformed & Presbyterian');
      expect(normalized.languages).toContain('Latin');
      expect(normalized.confidence).toBe('high');
    });

    it('handles successful Gemini API HTTP response with structured JSON payload', async () => {
      const mockCandidateText = JSON.stringify({
        full_name: 'Dr. Marcus Aurelius Vance',
        title: 'Associate Professor of Apologetics',
        current_institution: 'Southern Baptist Theological Seminary',
        institutional_role: 'Associate Professor',
        contact_email: 'mvance@sbts.edu',
        biography: 'Dr. Vance specializes in Trinitarian presuppositional epistemology.',
        credentials: [
          {
            degree: 'Ph.D.',
            field: 'Systematic Theology',
            institution: 'Southern Baptist Theological Seminary',
            year: 2016
          }
        ],
        publications: [
          {
            title: 'The Logic of Covenantal Epistemology',
            publication_type: 'book',
            year: 2020,
            citation_string: 'Crossway, 2020'
          }
        ],
        suggested_disciplines: ['Philosophical Theology & Apologetics', 'Systematic Theology'],
        suggested_traditions: ['Confessional Baptist'],
        languages: ['Koine Greek', 'Biblical Hebrew', 'Dutch'],
        confidence: 'high'
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: mockCandidateText }]
              }
            }
          ]
        })
      });

      vi.stubGlobal('fetch', mockFetch);

      const result = await extractCvWithGemini(SAMPLE_THEOLOGICAL_CV, {
        apiKey: 'fake-gemini-key',
        model: 'gemini-1.5-flash'
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.full_name).toBe('Dr. Marcus Aurelius Vance');
      expect(result.suggested_traditions).toContain('Confessional Baptist');
      expect(result.credentials[0].institution).toContain('Southern Baptist');
      expect(result.confidence).toBe('high');
    });

    it('falls back seamlessly to heuristic parser if Gemini API returns HTTP 500 error or throws', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await extractCvWithGemini(SAMPLE_THEOLOGICAL_CV, {
        apiKey: 'fake-test-key'
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      // Even with 500 error, heuristic fallback succeeded without crashing
      expect(result.full_name).toContain('Thomas Cranmer-Davies');
      expect(result.credentials.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. Syllabus & Course Intelligence Engine (tagSyllabusWithGemini & parseSyllabusHeuristic)', () => {
    it('returns default empty structure on empty syllabus text', () => {
      const result = parseSyllabusHeuristic('');
      expect(result.level).toBe('graduate');
      expect(result.topical_tags).toEqual([]);
      expect(result.learning_outcomes).toEqual([]);
      expect(result.required_texts).toEqual([]);
      expect(result.confidence).toBe('low');
    });

    it('extracts course code, title, level, outcomes, texts, and delivery modes using heuristic baseline', () => {
      const result = parseSyllabusHeuristic(SAMPLE_THEOLOGICAL_SYLLABUS);

      expect(result.course_code).toBe('OT 601');
      expect(result.title).toBe('Hebrew Poetry & The Psalms of Lament');
      expect(result.level).toBe('graduate');
      expect(result.suggested_discipline).toBe('Old Testament & Hebrew Scriptures');

      // Check delivery modes
      expect(result.recommended_delivery_modes).toContain('residential');
      expect(result.recommended_delivery_modes).toContain('hybrid');

      // Check learning outcomes
      expect(result.learning_outcomes.length).toBeGreaterThanOrEqual(3);
      expect(result.learning_outcomes.some((o) => o.includes('Biblia Hebraica') || o.includes('Hebrew poetry'))).toBe(true);

      // Check required texts
      expect(result.required_texts.length).toBeGreaterThanOrEqual(2);
      expect(result.required_texts.some((t) => t.title.includes('Syntax of Sorrow') || t.title.includes('Robert'))).toBe(true);

      // Check topical tags
      expect(result.topical_tags).toContain('Hebrew Poetry');
      expect(result.topical_tags).toContain('Psalms');
      expect(result.topical_tags).toContain('Lament');

      expect(result.confidence).toBe('high');
    });

    it('detects doctoral course level when course number is 800+ or keywords are present', () => {
      const doctoralSyllabus = `
      TH 802: Advanced Seminar in Presuppositional Epistemology
      Doctoral Seminar (Ph.D. / Th.D.)
      Description: An intensive doctoral investigation into Cornelius Van Til and Herman Dooyeweerd.
      `;
      const result = parseSyllabusHeuristic(doctoralSyllabus);
      expect(result.level).toBe('doctoral');
      expect(result.course_code).toBe('TH 802');
    });

    it('normalizes Gemini syllabus JSON response cleanly into ParsedSyllabusMetadata schema', () => {
      const mockGeminiJson = {
        title: 'Bioethics & Pastoral Care',
        course_code: 'ETH 705',
        level: 'graduate',
        suggested_discipline: 'Christian Ethics & Moral Theology',
        secondary_disciplines: ['Pastoral & Practical Theology'],
        topical_tags: ['Bioethics', 'Biomedical Ethics', 'Theodicy', 'Palliative Care'],
        learning_outcomes: [
          'Articulate a Reformed theological anthropology of bodily suffering.',
          'Analyze end-of-life decision making within Christian hospital chaplaincy.'
        ],
        required_texts: [
          {
            title: 'Covenantal Bioethics and the Suffering Body',
            author: 'Montgomery-Knox, Elizabeth',
            year: 2019,
            citation_text: 'Montgomery-Knox, Elizabeth. Covenantal Bioethics. Baker Academic, 2019.'
          }
        ],
        recommended_delivery_modes: ['residential', 'online_synchronous'],
        summary: 'A graduate seminar addressing ethical dilemmas in medical technology and pastoral care.',
        confidence: 'high'
      };

      const normalized = normalizeParsedSyllabus(mockGeminiJson, SAMPLE_THEOLOGICAL_SYLLABUS);

      expect(normalized.title).toBe('Bioethics & Pastoral Care');
      expect(normalized.course_code).toBe('ETH 705');
      expect(normalized.suggested_discipline).toBe('Christian Ethics & Moral Theology');
      expect(normalized.topical_tags).toContain('Bioethics');
      expect(normalized.learning_outcomes).toHaveLength(2);
      expect(normalized.required_texts[0].author).toBe('Montgomery-Knox, Elizabeth');
      expect(normalized.recommended_delivery_modes).toEqual(['residential', 'online_synchronous']);
      expect(normalized.confidence).toBe('high');
    });

    it('calls Gemini API with correct payload and transforms syllabus output successfully', async () => {
      const mockCandidateText = JSON.stringify({
        title: 'Hebrew Poetry & The Psalms of Lament',
        course_code: 'OT 601',
        level: 'graduate',
        suggested_discipline: 'Old Testament & Hebrew Scriptures',
        secondary_disciplines: ['Biblical Languages'],
        topical_tags: ['Hebrew Poetry', 'Psalms of Lament', 'Ancient Near East'],
        learning_outcomes: [
          'Translate and exegete Hebrew poetic texts',
          'Analyze parallelismus membrorum'
        ],
        required_texts: [
          {
            title: 'The Syntax of Sorrow',
            author: 'Thomas Cranmer-Davies',
            year: 2018,
            citation_text: 'Oxford University Press, 2018'
          }
        ],
        recommended_delivery_modes: ['residential', 'hybrid'],
        summary: 'An advanced graduate seminar on Hebrew poetry.',
        confidence: 'high'
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: mockCandidateText }]
              }
            }
          ]
        })
      });

      vi.stubGlobal('fetch', mockFetch);

      const result = await tagSyllabusWithGemini(SAMPLE_THEOLOGICAL_SYLLABUS, {
        apiKey: 'fake-api-key',
        model: 'gemini-1.5-flash'
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.course_code).toBe('OT 601');
      expect(result.suggested_discipline).toBe('Old Testament & Hebrew Scriptures');
      expect(result.topical_tags).toContain('Hebrew Poetry');
      expect(result.confidence).toBe('high');
    });

    it('falls back to heuristic extraction if Gemini API call throws a network error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network connection refused'));
      vi.stubGlobal('fetch', mockFetch);

      const result = await tagSyllabusWithGemini(SAMPLE_THEOLOGICAL_SYLLABUS, {
        apiKey: 'fake-api-key'
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      // Heuristic fallback succeeded
      expect(result.course_code).toBe('OT 601');
      expect(result.title).toBe('Hebrew Poetry & The Psalms of Lament');
      expect(result.suggested_discipline).toBe('Old Testament & Hebrew Scriptures');
      expect(result.confidence).toBe('high');
    });
  });
});
