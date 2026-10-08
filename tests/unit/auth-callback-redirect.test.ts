import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { exchangeCodeForSession: async () => ({ error: null }) },
  }),
}));

import { GET } from '@/app/auth/callback/route';
import { safeNextPath } from '@/lib/auth/redirect';
import { covers } from '../support/covers';

covers(
  'api:GET /auth/callback'
);

describe('auth callback post-login redirect', () => {
  it.each([
    ['https://evil.com', '/dashboard'],
    ['//evil.com', '/dashboard'],
    ['/\\evil.com', '/dashboard'],
    ['evil.com', '/dashboard'],
    [null, '/dashboard'],
    ['/institution/saved?tab=courses', '/institution/saved?tab=courses'],
    // Browsers and the WHATWG URL parser strip tab/CR/LF, turning these into //evil.com.
    ['/\t/evil.com', '/dashboard'],
    ['/\n/evil.com', '/dashboard'],
    ['/\r/evil.com', '/dashboard'],
    ['/\u0000/evil.com', '/dashboard'],
    ['/x\\evil.com', '/dashboard'],
    ['/%2Fevil.com', '/%2Fevil.com'],
  ])('safeNextPath(%s) → %s', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each(['https://evil.com', '//evil.com', '/\\evil.com', '/\t/evil.com', '/\n/evil.com', '\t//evil.com'])(
    'never redirects off-site for next=%s',
    async (next) => {
      const res = await GET(
        new NextRequest(`https://faithfullscholars.org/auth/callback?code=abc&next=${encodeURIComponent(next)}`)
      );
      const location = new URL(res.headers.get('location')!);
      expect(location.origin).toBe('https://faithfullscholars.org');
    }
  );
});
