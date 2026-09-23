import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getConsortium, POST as postConsortium } from '@/app/api/institution/consortium/route';
import { POST as postMember, DELETE as deleteMember } from '@/app/api/institution/consortium/members/route';

describe('Consortium API Routes Authorization & Input Validation (ADR 0012)', () => {
  describe('GET /api/institution/consortium', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await getConsortium();
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error).toContain('Authentication required');
    });
  });

  describe('POST /api/institution/consortium', () => {
    it('returns 401 when unauthenticated', async () => {
      const req = new NextRequest('http://localhost:3000/api/institution/consortium', {
        method: 'POST',
        body: JSON.stringify({ name: 'Consortium of Reformed Seminaries' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await postConsortium(req);
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error).toContain('Authentication required');
    });
  });

  describe('POST /api/institution/consortium/members', () => {
    it('returns 401 when unauthenticated', async () => {
      const req = new NextRequest('http://localhost:3000/api/institution/consortium/members', {
        method: 'POST',
        body: JSON.stringify({
          consortiumId: 'c8000000-0000-0000-0000-000000000001',
          institutionId: 'e1000000-0000-0000-0000-000000000002',
          role: 'member',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await postMember(req);
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error).toContain('Authentication required');
    });
  });

  describe('DELETE /api/institution/consortium/members', () => {
    it('returns 401 when unauthenticated', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/institution/consortium/members?consortiumId=c8000000-0000-0000-0000-000000000001&institutionId=e1000000-0000-0000-0000-000000000002',
        { method: 'DELETE' }
      );

      const res = await deleteMember(req);
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error).toContain('Authentication required');
    });
  });
});
