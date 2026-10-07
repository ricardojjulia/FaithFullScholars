import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadLiveProfileSnapshot, loadTaxonomy } from '@/lib/profiles/revision-service';

/**
 * Live baseline loader (ADR 0025): the editor start point and admin diff baseline
 * come from the scholar's real rows, and a failed read must never produce a
 * partial baseline (that would reintroduce the first-approval data-loss trap).
 */

type Result = { data: unknown; error: unknown };

function fakeClient(tables: Record<string, Result>): SupabaseClient {
  const chain = (table: string) => {
    const builder: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order']) builder[m] = () => builder;
    builder.maybeSingle = async () => tables[table] ?? { data: null, error: null };
    builder.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve(tables[table] ?? { data: [], error: null }).then(resolve);
    return builder;
  };
  return { from: (table: string) => chain(table) } as unknown as SupabaseClient;
}

const scholarRow = {
  id: 's1',
  slug: 'dr-a',
  full_name: 'Dr. A',
  title: null,
  current_institution: null,
  institutional_role: null,
  biography: 'Bio',
  location: null,
  timezone: 'UTC',
  doctrinal_statement_text: null,
  orcid_id: null,
  google_scholar_url: null,
  profile_status: 'approved',
  verification_status: 'unverified',
  published_revision_id: null,
  draft_revision_id: null,
};

describe('loadLiveProfileSnapshot', () => {
  it('returns the scalars plus the five relational lists', async () => {
    const snapshot = await loadLiveProfileSnapshot(
      fakeClient({
        scholars: { data: scholarRow, error: null },
        credentials: { data: [{ degree: 'Ph.D.', field_of_study: 'NT', institution_name: 'E', year_awarded: null, is_terminal: true }], error: null },
        publications: { data: [], error: null },
        scholar_confessions: { data: [{ adherence_level: 'full_subscription', exception_notes: null, confessional_standards: { slug: 'nicene-creed' } }], error: null },
        scholar_disciplines: { data: [{ is_primary: true, disciplines: { slug: 'old-testament' } }, { is_primary: false, disciplines: null }], error: null },
        scholar_traditions: { data: [{ is_primary: true, traditions: [{ slug: 'lutheran' }] }], error: null },
      }),
      's1'
    );
    expect(snapshot).toMatchObject({
      full_name: 'Dr. A',
      biography: 'Bio',
      disciplines: ['old-testament'],
      traditions: ['lutheran'],
      publications: [],
    });
    expect(snapshot?.credentials).toHaveLength(1);
    expect(snapshot?.confessions).toEqual([
      { confessional_standard_id: 'nicene-creed', adherence_level: 'full_subscription', exception_notes: null },
    ]);
  });

  it('returns null when the scholar is not readable, and throws (no partial baseline) when a list fails', async () => {
    expect(await loadLiveProfileSnapshot(fakeClient({ scholars: { data: null, error: null } }), 's1')).toBeNull();
    await expect(
      loadLiveProfileSnapshot(
        fakeClient({
          scholars: { data: scholarRow, error: null },
          credentials: { data: null, error: { code: 'XX000', message: 'secret' } },
        }),
        's1'
      )
    ).rejects.toThrow('live_profile_unavailable');
  });
});

describe('loadTaxonomy', () => {
  it('throws a generic error rather than returning an empty taxonomy', async () => {
    await expect(
      loadTaxonomy(fakeClient({ disciplines: { data: null, error: { message: 'secret' } } }))
    ).rejects.toThrow('taxonomy_unavailable');
  });
});
