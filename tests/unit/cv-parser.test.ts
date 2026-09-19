import { describe, it, expect } from 'vitest';
import { parseCvText } from '@/lib/profiles/cv-parser';

describe('CV Ingestion Parser (Task 3.0)', () => {
  it('handles empty or whitespace string without throwing an unhandled exception', () => {
    const result = parseCvText('');
    expect(result.confidence).toBe('low');
    expect(result.credentials).toHaveLength(0);
    expect(result.publications).toHaveLength(0);
    expect(result.raw_line_count).toBe(0);

    const whitespaceResult = parseCvText('   \n\n   \t  ');
    expect(whitespaceResult.confidence).toBe('low');
    expect(whitespaceResult.credentials).toHaveLength(0);
  });

  it('correctly extracts identity, credentials, publications, and disciplines from academic CV text', () => {
    const sampleCv = `
Dr. Benjamin H. Edwards, Ph.D.
Professor of New Testament Studies
Westminster Theological Seminary
Email: bedwards@wts.edu
Location: Glenside, PA

EDUCATION
Ph.D. in New Testament, University of Cambridge, 2018
Th.M. in Biblical Studies, Westminster Theological Seminary, 2014
M.Div., Reformed Theological Seminary, 2012
B.A. in History, Wheaton College, 2008

RESEARCH LANGUAGES
Biblical Hebrew, Koine Greek, Biblical Aramaic, German, Latin

PUBLICATIONS
Books:
The Gospel According to Paul: Justification and Union with Christ. Baker Academic, 2021.
Pauline Pneumatology in Historical Context. Eerdmans, 2023.

Articles:
"The Faithfulness of Christ in Galatians 2:16." Journal of Biblical Literature, Vol. 139, No. 2, 2020.
"Covenant and Justification in Early Second Temple Judaism." Westminster Theological Journal, 2019.

DOCTRINAL STATEMENT
I affirm the full inerrancy and infallibility of the Holy Scriptures as the supreme rule of faith and practice. I heartily subscribe to the Westminster Confession of Faith and the historic Reformed confessions.
`;

    const parsed = parseCvText(sampleCv);

    // Identity assertions
    expect(parsed.full_name).toContain('Benjamin H. Edwards');
    expect(parsed.title).toContain('Professor of New Testament Studies');
    expect(parsed.institutional_role).toBe('Professor');
    expect(parsed.contact_email).toBe('bedwards@wts.edu');
    expect(parsed.current_institution).toContain('Westminster Theological Seminary');

    // Credentials assertions
    expect(parsed.credentials.length).toBeGreaterThanOrEqual(4);
    const degrees = parsed.credentials.map((c) => c.degree);
    expect(degrees).toContain('Ph.D.');
    expect(degrees).toContain('Th.M.');
    expect(degrees).toContain('M.Div.');
    expect(degrees).toContain('B.A.');

    const phd = parsed.credentials.find((c) => c.degree === 'Ph.D.');
    expect(phd?.year).toBe(2018);

    // Publications assertions
    expect(parsed.publications.length).toBeGreaterThanOrEqual(2);
    expect(parsed.publications.some((p) => p.title.includes('Gospel According to Paul'))).toBe(true);

    // Discipline and Tradition inferences
    expect(parsed.suggested_disciplines).toContain('New Testament & Early Christianity');
    expect(parsed.suggested_disciplines).toContain('Biblical Languages');
    expect(parsed.suggested_traditions).toContain('Reformed & Presbyterian');

    // Language extraction
    expect(parsed.languages).toContain('Greek');
    expect(parsed.languages).toContain('Hebrew');

    // Faith statement extraction
    expect(parsed.personal_doctrinal_statement).toContain('inerrancy and infallibility of the Holy Scriptures');

    // High confidence due to matching multiple criteria
    expect(parsed.confidence).toBe('high');
  });

  it('tolerates non-academic documents and assigns low confidence gracefully', () => {
    const groceryList = `
Grocery List:
- Milk
- Eggs
- Coffee
- Bread
`;
    const parsed = parseCvText(groceryList);
    expect(parsed.confidence).toBe('low');
    expect(parsed.credentials).toHaveLength(0);
    expect(parsed.publications).toHaveLength(0);
  });
});
