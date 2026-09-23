import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/ai/match-faculty/route';

describe('AI Faculty Matcher Route Authorization & Validation (ADR 0012)', () => {
  it('returns 400 if search query is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai/match-faculty', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('A search query is required');
  });

  it('returns 400 if search query is too short', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai/match-faculty', {
      method: 'POST',
      body: JSON.stringify({ query: 'a' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('Search query is too short');
  });

  it('returns 401 if caller is unauthenticated', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai/match-faculty', {
      method: 'POST',
      body: JSON.stringify({ query: 'Systematic Theology Westminster Confession' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    // In unauthenticated test context without Supabase session cookie
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toContain('Authentication required');
  });
});
