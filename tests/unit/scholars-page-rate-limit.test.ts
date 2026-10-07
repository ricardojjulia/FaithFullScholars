import { describe, it, expect, vi, beforeEach } from 'vitest';
import { covers } from '../support/covers';

covers('page:/scholars');

const checkSearchRequest = vi.fn();
const getPublicScholars = vi.fn();
let userId: string | null = null;

vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.9' }) }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }) },
  }),
}));
vi.mock('@/lib/search/rate-limiter', async (orig) => ({
  ...(await orig<typeof import('@/lib/search/rate-limiter')>()),
  checkSearchRequest: (...a: unknown[]) => checkSearchRequest(...a),
}));
vi.mock('@/lib/domain/queries', () => ({
  MAX_ANONYMOUS_SEARCH_PAGES: 3,
  getPublicScholars: (...a: unknown[]) => getPublicScholars(...a),
  getTaxonomies: async () => ({ disciplines: [], traditions: [], confessionalStandards: [] }),
}));
vi.mock('@/components/scholars/scholar-card', () => ({ ScholarCard: () => null }));
vi.mock('@/components/scholars/scholar-filters', () => ({ ScholarFilters: () => null }));
vi.mock('@/components/scholars/scholar-recommendations-rail', () => ({ ScholarRecommendationsRail: () => null }));
vi.mock('@/components/scholars/scholar-directory-header', () => ({ ScholarDirectoryHeader: () => null }));
vi.mock('@/components/shell/public-nav', () => ({ PublicNav: () => null }));
vi.mock('@/components/shell/public-footer', () => ({ PublicFooter: () => null }));

import ScholarsPage from '@/app/scholars/page';

/** Collects every string in a React element tree without rendering function components. */
function texts(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string' || typeof node === 'number') out.push(String(node));
  else if (Array.isArray(node)) node.forEach((n) => texts(n, out));
  else if (node && typeof node === 'object' && 'props' in node) {
    texts((node as { props: { children?: unknown } }).props.children, out);
  }
  return out;
}

const page = async (params: Record<string, string>) =>
  texts(await ScholarsPage({ searchParams: Promise.resolve(params) })).join('').replace(/\s+/g, ' ');

describe('/scholars rate limit (ADR 0008 / 0026)', () => {
  beforeEach(() => {
    userId = null;
    checkSearchRequest.mockReset();
    getPublicScholars.mockReset().mockResolvedValue([]);
  });

  it('shows a friendly limited state with the wait, and does not run the search', async () => {
    checkSearchRequest.mockResolvedValue({ allowed: false, currentCount: 16, remaining: 0, resetEpoch: Math.floor(Date.now() / 1000) + 20, limit: 15 });
    const html = await page({ search: 'calvin' });
    expect(html).toMatch(/Too many searches\. Try again in \d+ seconds\./);
    expect(getPublicScholars).not.toHaveBeenCalled();
  });

  it('runs the search when under the limit', async () => {
    checkSearchRequest.mockResolvedValue({ allowed: true, currentCount: 1, remaining: 14, resetEpoch: 0, limit: 15 });
    const html = await page({ search: 'calvin' });
    expect(html).not.toMatch(/Too many searches/);
    expect(getPublicScholars).toHaveBeenCalled();
  });

  it('does not count a plain visit with no search or filter parameters', async () => {
    await page({});
    expect(checkSearchRequest).not.toHaveBeenCalled();
    expect(getPublicScholars).toHaveBeenCalled();
  });

  it('keys signed-in users by account', async () => {
    userId = 'user-1';
    checkSearchRequest.mockResolvedValue({ allowed: true, currentCount: 1, remaining: 119, resetEpoch: 0, limit: 120 });
    await page({ discipline: 'systematic-theology' });
    expect(checkSearchRequest.mock.calls[0][1]).toBe('user-1');
  });

  it('stays available when the limiter fails open', async () => {
    // checkSearchRequest fails open by contract (allowed true); the page must serve results.
    checkSearchRequest.mockResolvedValue({ allowed: true, currentCount: 0, remaining: 15, resetEpoch: 0, limit: 15 });
    await page({ tradition: 'reformed' });
    expect(getPublicScholars).toHaveBeenCalled();
  });
});
