/**
 * ==============================================================================
 * FaithFull Scholars — Assisted CV Document Parser (Task 3.0)
 * Extracts structured academic credentials, publications, affiliations,
 * and theological disciplines from curriculum vitae text/markdown/PDF content.
 * Output is strictly treated as editable draft suggestions.
 * ==============================================================================
 */

export interface ParsedDegreeSuggestion {
  degree: string;
  field?: string;
  institution: string;
  year?: number;
}

export interface ParsedPublicationSuggestion {
  title: string;
  publication_type: 'book' | 'journal_article' | 'book_chapter' | 'monograph' | 'essay' | 'review' | 'other';
  publisher_or_journal?: string;
  year?: number;
  citation_string: string;
}

export interface ParsedCvDraft {
  full_name?: string;
  title?: string;
  current_institution?: string;
  institutional_role?: string;
  contact_email?: string;
  location?: string;
  biography?: string;
  credentials: ParsedDegreeSuggestion[];
  publications: ParsedPublicationSuggestion[];
  suggested_disciplines: string[];
  suggested_traditions: string[];
  languages: string[];
  personal_doctrinal_statement?: string;
  raw_line_count: number;
  confidence: 'high' | 'medium' | 'low';
}

const COMMON_DISCIPLINES = [
  { name: 'Old Testament & Hebrew Scriptures', keywords: ['old testament', 'hebrew bible', 'pentateuch', 'tanakh', 'ancient near east'] },
  { name: 'New Testament & Early Christianity', keywords: ['new testament', 'gospels', 'pauline epistles', 'pauline studies', 'johannine', 'early christianity'] },
  { name: 'Systematic Theology', keywords: ['systematic theology', 'dogmatics', 'doctrine of god', 'christology', 'pneumatology', 'soteriology', 'eschatology'] },
  { name: 'Historical Theology & Church History', keywords: ['church history', 'historical theology', 'patristics', 'reformation', 'medieval church', 'puritan'] },
  { name: 'Pastoral & Practical Theology', keywords: ['pastoral theology', 'homiletics', 'preaching', 'pastoral care', 'counseling', 'ministry leadership'] },
  { name: 'Biblical Languages', keywords: ['biblical hebrew', 'koine greek', 'biblical aramaic', 'hebrew syntax', 'greek exegesis'] },
  { name: 'Christian Ethics & Moral Theology', keywords: ['christian ethics', 'moral theology', 'bioethics', 'social ethics'] },
  { name: 'Philosophical Theology & Apologetics', keywords: ['apologetics', 'philosophical theology', 'philosophy of religion', 'epistemology'] },
  { name: 'Missions & Intercultural Studies', keywords: ['missiology', 'missions', 'intercultural', 'world christianity', 'evangelism'] }
];

const COMMON_TRADITIONS = [
  { name: 'Reformed & Presbyterian', keywords: ['reformed', 'presbyterian', 'calvinist', 'westminster'] },
  { name: 'Confessional Baptist', keywords: ['baptist', '1689', 'baptistic', 'anabaptist'] },
  { name: 'Anglican & Episcopalian', keywords: ['anglican', 'episcopal', '39 articles', 'book of common prayer'] },
  { name: 'Lutheran', keywords: ['lutheran', 'augsburg confession', 'book of concord'] },
  { name: 'Methodist & Wesleyan', keywords: ['wesleyan', 'methodist', 'holiness', 'arminian'] },
  { name: 'Evangelical Free & Independent', keywords: ['evangelical free', 'independent bible', 'non-denominational'] }
];

export function parseCvText(rawText: string): ParsedCvDraft {
  if (!rawText || !rawText.trim()) {
    return {
      credentials: [],
      publications: [],
      suggested_disciplines: [],
      suggested_traditions: [],
      languages: [],
      raw_line_count: 0,
      confidence: 'low'
    };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const draft: ParsedCvDraft = {
    credentials: [],
    publications: [],
    suggested_disciplines: [],
    suggested_traditions: [],
    languages: [],
    raw_line_count: lines.length,
    confidence: 'low'
  };

  // 1. Contact email extraction
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  for (const line of lines.slice(0, 20)) {
    const match = line.match(emailRegex);
    if (match) {
      draft.contact_email = match[1];
      break;
    }
  }

  // 2. Full Name extraction (typically line 0 or 1 before titles/emails)
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    if (
      !line.includes('@') &&
      !line.toLowerCase().startsWith('curriculum vitae') &&
      !line.toLowerCase().startsWith('resume') &&
      !line.toLowerCase().startsWith('page') &&
      !line.includes('http') &&
      line.length >= 3 &&
      line.length <= 60
    ) {
      // Clean titles like Dr. or Rev. from full name if present
      const cleaned = line.replace(/^(curriculum vitae|resume|cv)\s*:?\s*/i, '');
      draft.full_name = cleaned;
      break;
    }
  }

  // 3. Academic Role and Institution
  for (const line of lines.slice(0, 15)) {
    const lower = line.toLowerCase();
    if (
      (lower.includes('professor') ||
        lower.includes('fellow') ||
        lower.includes('lecturer') ||
        lower.includes('instructor') ||
        lower.includes('chair') ||
        lower.includes('dean')) &&
      !draft.title
    ) {
      draft.title = line;
      if (lower.includes('associate professor')) {
        draft.institutional_role = 'Associate Professor';
      } else if (lower.includes('assistant professor')) {
        draft.institutional_role = 'Assistant Professor';
      } else if (lower.includes('adjunct')) {
        draft.institutional_role = 'Adjunct Faculty';
      } else if (lower.includes('professor')) {
        draft.institutional_role = 'Professor';
      } else if (lower.includes('lecturer')) {
        draft.institutional_role = 'Lecturer';
      }
    }

    if (
      (lower.includes('seminary') ||
        lower.includes('university') ||
        lower.includes('college') ||
        lower.includes('institute') ||
        lower.includes('divinity school')) &&
      !draft.current_institution
    ) {
      draft.current_institution = line.replace(/^[•\-\*]\s*/, '');
    }
  }

  // 4. Section Slicing for Education, Publications, Faith
  let currentSection: 'education' | 'publications' | 'statement' | 'languages' | 'other' = 'other';
  const bioLines: string[] = [];

  const degreePatterns = [
    { regex: /\b(Ph\.?D\.?|Doctor of Philosophy)\b/i, degree: 'Ph.D.' },
    { regex: /\b(Th\.?D\.?|Doctor of Theology)\b/i, degree: 'Th.D.' },
    { regex: /\b(D\.?Min\.?|Doctor of Ministry)\b/i, degree: 'D.Min.' },
    { regex: /\b(Th\.?M\.?|Master of Theology)\b/i, degree: 'Th.M.' },
    { regex: /\b(M\.?Div\.?|Master of Divinity)\b/i, degree: 'M.Div.' },
    { regex: /\b(M\.?T\.?S\.?|Master of Theological Studies)\b/i, degree: 'M.T.S.' },
    { regex: /\b(M\.?A\.?|Master of Arts)\b/i, degree: 'M.A.' },
    { regex: /\b(B\.?A\.?|Bachelor of Arts)\b/i, degree: 'B.A.' },
    { regex: /\b(B\.?S\.?|Bachelor of Science)\b/i, degree: 'B.S.' }
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Section headers detection
    if (
      lower.startsWith('education') ||
      lower.startsWith('academic background') ||
      lower.startsWith('degrees')
    ) {
      currentSection = 'education';
      continue;
    } else if (
      lower.startsWith('publications') ||
      lower.startsWith('books') ||
      lower.startsWith('scholarly works') ||
      lower.startsWith('selected publications')
    ) {
      currentSection = 'publications';
      continue;
    } else if (
      lower.includes('doctrinal statement') ||
      lower.includes('confessional statement') ||
      lower.includes('faith statement')
    ) {
      currentSection = 'statement';
      continue;
    } else if (
      lower.startsWith('languages') ||
      lower.startsWith('ancient languages') ||
      lower.startsWith('research languages')
    ) {
      currentSection = 'languages';
      continue;
    } else if (
      lower.startsWith('experience') ||
      lower.startsWith('teaching') ||
      lower.startsWith('awards') ||
      lower.startsWith('references')
    ) {
      currentSection = 'other';
    }

    // Section-specific extraction
    if (currentSection === 'education') {
      for (const pattern of degreePatterns) {
        if (pattern.regex.test(line)) {
          const yearMatch = line.match(/\b(19\d\d|20\d\d)\b/);
          const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;
          
          // Try to isolate institution name
          let institution = line.replace(pattern.regex, '').replace(/\b(19\d\d|20\d\d)\b/, '').replace(/[,\-\(\)]/g, ' ').trim();
          if (!institution) institution = 'University / Seminary';

          draft.credentials.push({
            degree: pattern.degree,
            institution,
            year
          });
          break;
        }
      }
    } else if (currentSection === 'publications') {
      // Books or articles usually have a year (19xx or 20xx) and are > 20 characters
      const yearMatch = line.match(/\b(19\d\d|20\d\d)\b/);
      if (line.length > 20 && (line.includes('"') || line.includes('“') || line.includes(':') || yearMatch)) {
        let pubType: ParsedPublicationSuggestion['publication_type'] = 'other';
        if (line.toLowerCase().includes('press') || line.toLowerCase().includes('baker') || line.toLowerCase().includes('eerdmans') || line.toLowerCase().includes('ivp') || line.toLowerCase().includes('zondervan')) {
          pubType = 'book';
        } else if (line.toLowerCase().includes('journal') || line.toLowerCase().includes('vol.') || line.toLowerCase().includes('no.')) {
          pubType = 'journal_article';
        } else if (line.toLowerCase().includes('in ') || line.toLowerCase().includes('ed.')) {
          pubType = 'book_chapter';
        }

        draft.publications.push({
          title: line.replace(/^[•\-\*0-9\.]+\s*/, ''),
          publication_type: pubType,
          year: yearMatch ? parseInt(yearMatch[1], 10) : undefined,
          citation_string: line
        });
      }
    } else if (currentSection === 'statement') {
      if (line.length > 15) {
        draft.personal_doctrinal_statement = (draft.personal_doctrinal_statement ? draft.personal_doctrinal_statement + ' ' : '') + line;
      }
    } else if (currentSection === 'languages') {
      const recognizedLangs = ['Hebrew', 'Greek', 'Aramaic', 'Latin', 'German', 'French', 'Spanish', 'Dutch'];
      for (const lang of recognizedLangs) {
        if (lower.includes(lang.toLowerCase()) && !draft.languages.includes(lang)) {
          draft.languages.push(lang);
        }
      }
    } else if (currentSection === 'other' && i > 3 && i < 15) {
      if (line.length > 40 && !line.includes('@') && !line.includes('http')) {
        bioLines.push(line);
      }
    }
  }

  // 5. Build Biography if extracted
  if (bioLines.length > 0) {
    draft.biography = bioLines.slice(0, 3).join(' ');
  }

  // 6. Infer Suggested Disciplines and Traditions across the whole document
  const fullTextLower = rawText.toLowerCase();

  for (const disc of COMMON_DISCIPLINES) {
    if (disc.keywords.some((kw) => fullTextLower.includes(kw))) {
      draft.suggested_disciplines.push(disc.name);
    }
  }

  for (const trad of COMMON_TRADITIONS) {
    if (trad.keywords.some((kw) => fullTextLower.includes(kw))) {
      draft.suggested_traditions.push(trad.name);
    }
  }

  // Confidence calculation
  const score =
    (draft.full_name ? 1 : 0) +
    (draft.contact_email ? 1 : 0) +
    (draft.credentials.length > 0 ? 2 : 0) +
    (draft.publications.length > 0 ? 1 : 0) +
    (draft.suggested_disciplines.length > 0 ? 1 : 0);

  if (score >= 4) {
    draft.confidence = 'high';
  } else if (score >= 2) {
    draft.confidence = 'medium';
  } else {
    draft.confidence = 'low';
  }

  return draft;
}
