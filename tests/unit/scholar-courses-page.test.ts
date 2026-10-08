import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * /dashboard/courses is a server page: guarded before any fetch, loads only the
 * session scholar's courses, and shows an error panel (never sample data) when
 * the load fails.
 */

const state = vi.hoisted(() => ({
  session: { userId: 'u1', role: 'scholar', scholarId: 'sch-1', institutionIds: [] as string[], lookupFailed: false } as {
    userId: string;
    role: string;
    scholarId: string | null;
    institutionIds: string[];
    lookupFailed: boolean;
  },
  signedOut: false,
}));
const loaders = vi.hoisted(() => ({
  fetchOwnCoursesOrThrow: vi.fn(),
  fetchDisciplineOptionsOrThrow: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ marker: 'user-client' }) }));
vi.mock('@/lib/auth/guards', () => ({
  requireSignedIn: vi.fn(async () => {
    if (state.signedOut) throw new Error('NEXT_REDIRECT:/login');
    return state.session;
  }),
}));
vi.mock('@/lib/courses/course-service', () => loaders);

import ScholarCoursesPage from '@/app/dashboard/courses/page';
import { requireSignedIn } from '@/lib/auth/guards';
import { covers } from '../support/covers';

covers('page:/dashboard/courses');

const render = async () => renderToStaticMarkup(await ScholarCoursesPage());

const course = (over: Record<string, unknown> = {}) => ({
  id: 'c-1',
  title: 'My Real Course',
  slug: 'my-real-course',
  description: null,
  level: 'graduate',
  primary_discipline_id: 'd-1',
  delivery_modes: ['online_async'],
  reading_list: null,
  visibility: 'private',
  created_at: '2026-10-08T00:00:00Z',
  updated_at: '2026-10-08T00:00:00Z',
  ...over,
});

beforeEach(() => {
  state.signedOut = false;
  state.session = { userId: 'u1', role: 'scholar', scholarId: 'sch-1', institutionIds: [], lookupFailed: false };
  loaders.fetchOwnCoursesOrThrow.mockReset();
  loaders.fetchDisciplineOptionsOrThrow.mockReset();
  loaders.fetchDisciplineOptionsOrThrow.mockResolvedValue([{ id: 'd-1', name: 'Systematic Theology' }]);
});

describe('/dashboard/courses page', () => {
  it('stops at the guard before loading any data when signed out', async () => {
    state.signedOut = true;
    await expect(ScholarCoursesPage()).rejects.toThrow('NEXT_REDIRECT:/login');
    expect(loaders.fetchOwnCoursesOrThrow).not.toHaveBeenCalled();
  });

  it('loads the courses of the session scholar with the user client', async () => {
    loaders.fetchOwnCoursesOrThrow.mockResolvedValue([course()]);
    const html = await render();
    expect(requireSignedIn).toHaveBeenCalled();
    expect(loaders.fetchOwnCoursesOrThrow).toHaveBeenCalledWith({ marker: 'user-client' }, 'sch-1');
    expect(html).toContain('My Real Course');
    expect(html).toContain('Systematic Theology');
    expect(html).toContain('Private');
  });

  it('shows an empty state for a scholar with no courses', async () => {
    loaders.fetchOwnCoursesOrThrow.mockResolvedValue([]);
    const html = await render();
    expect(html).toContain('courses-empty');
    expect(html).not.toContain('data-testid="course-row"');
  });

  it('shows the error panel, and no sample courses, when the load fails', async () => {
    loaders.fetchOwnCoursesOrThrow.mockRejectedValue(new Error('courses_unavailable'));
    const html = await render();
    expect(html).toContain('data-testid="data-error-panel"');
    expect(html).not.toContain('courses-empty');
    expect(html).not.toContain('Exegesis of Romans');
  });

  it('prompts a user without a scholar profile to onboard, without loading', async () => {
    state.session.scholarId = null;
    const html = await render();
    expect(html).toContain('/dashboard/onboarding');
    expect(loaders.fetchOwnCoursesOrThrow).not.toHaveBeenCalled();
  });
});
