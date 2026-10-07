/**
 * ==============================================================================
 * FaithFull Scholars — Legacy taxonomy aliases (ADR 0025)
 * A CLOSED list mapping legacy editor ids, editor slugs and CV-parser display
 * names to the canonical database slug. Keys are normalised (trimmed, lower
 * case). It is deliberately a code list, not a table: it never grows after this
 * change and a table would add a write surface and a second source of truth.
 * Every target slug must exist in supabase/seed.sql (a parity integration test
 * enforces it).
 * ==============================================================================
 */

export type TaxonomyKind = 'discipline' | 'tradition' | 'confession';

export const TAXONOMY_ALIASES: Record<TaxonomyKind, Record<string, string>> = {
  confession: {
    // Legacy editor ids (components/forms/confessional-standards-selector.tsx)
    'standard-westminster': 'westminster-confession',
    'standard-1689': '1689-london-baptist',
    'standard-nicene': 'nicene-creed',
    'standard-39articles': 'thirty-nine-articles',
    'standard-augsburg': 'augsburg-confession',
    'standard-chicago': 'chicago-statement-inerrancy',
    'standard-heidelberg': 'heidelberg-catechism',
    'standard-lausanne': 'lausanne-covenant',
    // The editor's own (wrong) Chicago slug
    'chicago-inerrancy': 'chicago-statement-inerrancy',
  },
  discipline: {
    // CV-parser display names that differ from the seeded rows
    'new testament & early christianity': 'new-testament',
    'historical theology & church history': 'church-history',
    'pastoral & practical theology': 'pastoral-ministry',
    'biblical languages': 'biblical-languages',
    'christian ethics & moral theology': 'christian-ethics',
    'philosophical theology & apologetics': 'apologetics',
    'missions & intercultural studies': 'missiology',
  },
  tradition: {
    'confessional baptist': 'baptist',
    'anglican & episcopalian': 'anglican',
    'methodist & wesleyan': 'wesleyan-methodist',
    'evangelical free & independent': 'evangelical',
  },
};
