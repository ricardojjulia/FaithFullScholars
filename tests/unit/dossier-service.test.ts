import { describe, it, expect } from 'vitest';
import { formatSblCitation } from '@/lib/profiles/dossier-service';
import { validateRevisionData, buildDraftSnapshot } from '@/lib/profiles/revision-actions';
import { computeRevisionDiff } from '@/lib/domain/diff';

describe('Dossier Service & SBL Citations (ADR 0014)', () => {
  describe('formatSblCitation', () => {
    it('uses existing citation_text if already present', () => {
      const citation = formatSblCitation({
        title: 'Reformed Dogmatics',
        publication_type: 'book',
        citation_text: 'Bavinck, Herman. Reformed Dogmatics. Grand Rapids: Baker Academic, 2008.',
      });
      expect(citation).toBe('Bavinck, Herman. Reformed Dogmatics. Grand Rapids: Baker Academic, 2008.');
    });

    it('formats a journal article in standard SBL / Chicago style', () => {
      const citation = formatSblCitation({
        title: 'The Covenant of Works in Early Reformed Scholasticism',
        publication_type: 'journal_article',
        publisher_or_journal: 'Westminster Theological Journal',
        year: 2021,
        doi_or_url: 'https://doi.org/10.1234/wtj.2021.01',
      });
      expect(citation).toBe(
        '"The Covenant of Works in Early Reformed Scholasticism." Westminster Theological Journal (2021). https://doi.org/10.1234/wtj.2021.01'
      );
    });

    it('formats a monograph or book in standard SBL / Chicago style', () => {
      const citation = formatSblCitation({
        title: 'Covenant and Eschatology',
        publication_type: 'monograph',
        publisher_or_journal: 'Eerdmans',
        year: 2019,
      });
      expect(citation).toBe('*Covenant and Eschatology*. Eerdmans, 2019.');
    });

    it('formats a book chapter in collected volume', () => {
      const citation = formatSblCitation({
        title: 'Post-Reformation Developments in Christology',
        publication_type: 'book_chapter',
        publisher_or_journal: 'The Oxford Handbook of Reformed Theology',
        year: 2020,
      });
      expect(citation).toBe(
        '"Post-Reformation Developments in Christology." In *The Oxford Handbook of Reformed Theology* (2020).'
      );
    });
  });

  describe('Academic Identifiers (ORCID & Google Scholar)', () => {
    it('validates correct ORCID format', () => {
      const valid = validateRevisionData({
        full_name: 'Dr. Cornelius Van Til',
        orcid_id: '0000-0002-1825-0097',
      });
      expect(valid.valid).toBe(true);
      expect(valid.errors).toHaveLength(0);
    });

    it('rejects malformed ORCID strings', () => {
      const invalid = validateRevisionData({
        full_name: 'Dr. Cornelius Van Til',
        orcid_id: '0000-1234-5678', // too short
      });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors[0]).toContain('ORCID');
    });

    it('validates official Google Scholar profile citations URL', () => {
      const valid = validateRevisionData({
        full_name: 'Dr. J. Gresham Machen',
        google_scholar_url: 'https://scholar.google.com/citations?user=ABCD1234EFG&hl=en',
      });
      expect(valid.valid).toBe(true);
    });

    it('rejects fraudulent Google Scholar URL', () => {
      const invalid = validateRevisionData({
        full_name: 'Dr. J. Gresham Machen',
        google_scholar_url: 'https://google.com/search?q=scholar',
      });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors[0]).toContain('Google Scholar');
    });

    it('preserves orcid_id and google_scholar_url in buildDraftSnapshot', () => {
      const draft = buildDraftSnapshot(null, {
        full_name: 'Dr. Calvin Edwards',
        orcid_id: '0000-0002-1825-0097',
        google_scholar_url: 'https://scholar.google.com/citations?user=CALVIN123',
      });
      expect(draft.orcid_id).toBe('0000-0002-1825-0097');
      expect(draft.google_scholar_url).toBe('https://scholar.google.com/citations?user=CALVIN123');
    });

    it('computes diff when orcid_id or google_scholar_url are added or modified', () => {
      const published = {
        full_name: 'Dr. Calvin Edwards',
        orcid_id: null,
        google_scholar_url: null,
      };
      const draft = {
        full_name: 'Dr. Calvin Edwards',
        orcid_id: '0000-0002-1825-0097',
        google_scholar_url: 'https://scholar.google.com/citations?user=CALVIN123',
      };
      const diff = computeRevisionDiff(published, draft);
      expect(diff.hasChanges).toBe(true);
      expect(diff.totalChanges).toBe(2);
      expect(diff.changes.map((c) => c.field)).toContain('orcid_id');
      expect(diff.changes.map((c) => c.field)).toContain('google_scholar_url');
    });
  });
});
