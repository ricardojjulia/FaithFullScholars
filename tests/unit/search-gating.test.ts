import { describe, it, expect } from 'vitest';
import { sanitizeSearchQuery } from '@/lib/search/sanitize';
import { getRateLimitHeaders, SEARCH_LIMITS, RateLimitResult } from '@/lib/search/rate-limiter';
import { MAX_ANONYMOUS_SEARCH_PAGES } from '@/lib/domain/queries';

describe('Search Abuse Gating & Input Sanitization (ADR 0008)', () => {
  describe('Input Sanitizer', () => {
    it('1. trims leading and trailing whitespace and collapses multiple spaces', () => {
      const res = sanitizeSearchQuery('   Historical    Theology   ');
      expect(res.isValid).toBe(true);
      expect(res.sanitized).toBe('Historical Theology');
      expect(res.isTruncated).toBe(false);
    });

    it('2. strips raw SQL wildcards (% and _) to prevent unbounded table scans', () => {
      const res = sanitizeSearchQuery('%Edwards%_%');
      expect(res.isValid).toBe(true);
      expect(res.sanitized).toBe('Edwards');
      expect(res.sanitized).not.toContain('%');
      expect(res.sanitized).not.toContain('_');
    });

    it('3. strips control characters and dangerous non-printable bytes', () => {
      const res = sanitizeSearchQuery('Calvin\x00\x08\x1B Edwards');
      expect(res.isValid).toBe(true);
      expect(res.sanitized).toBe('Calvin Edwards');
    });

    it('4. truncates long queries exceeding 100 characters', () => {
      const longText = 'a'.repeat(150);
      const res = sanitizeSearchQuery(longText);
      expect(res.isValid).toBe(true);
      expect(res.sanitized.length).toBe(100);
      expect(res.isTruncated).toBe(true);
    });

    it('5. flags empty, whitespace-only, or invalid non-string inputs as invalid', () => {
      expect(sanitizeSearchQuery('').isValid).toBe(false);
      expect(sanitizeSearchQuery('   ').isValid).toBe(false);
      expect(sanitizeSearchQuery(null).isValid).toBe(false);
      expect(sanitizeSearchQuery(undefined).isValid).toBe(false);
      expect(sanitizeSearchQuery(123).isValid).toBe(false);
    });
  });

  describe('Rate Limiter & RFC Header Generation', () => {
    it('generates standard rate-limit headers when allowed', () => {
      const result: RateLimitResult = {
        allowed: true,
        currentCount: 5,
        remaining: 10,
        resetEpoch: 1774000000,
        limit: SEARCH_LIMITS.ANONYMOUS,
      };

      const headers = getRateLimitHeaders(result);
      expect(headers['X-RateLimit-Limit']).toBe('15');
      expect(headers['X-RateLimit-Remaining']).toBe('10');
      expect(headers['X-RateLimit-Reset']).toBe('1774000000');
      expect(headers['Retry-After']).toBeUndefined();
    });

    it('includes Retry-After header when rate limit is exceeded', () => {
      const nowEpoch = Math.floor(Date.now() / 1000);
      const result: RateLimitResult = {
        allowed: false,
        currentCount: 16,
        remaining: 0,
        resetEpoch: nowEpoch + 30,
        limit: SEARCH_LIMITS.ANONYMOUS,
      };

      const headers = getRateLimitHeaders(result);
      expect(headers['X-RateLimit-Remaining']).toBe('0');
      expect(headers['Retry-After']).toBeDefined();
      expect(Number(headers['Retry-After'])).toBeGreaterThanOrEqual(25);
    });
  });

  describe('Anti-Scraping Deep-Pagination Boundary', () => {
    it('restricts anonymous discovery to maximum 3 pages (ADR 0008)', () => {
      expect(MAX_ANONYMOUS_SEARCH_PAGES).toBe(3);

      const checkAccess = (page: number, isAuthenticated: boolean) => {
        if (page > MAX_ANONYMOUS_SEARCH_PAGES && !isAuthenticated) {
          return { allowed: false, reason: 'auth_required' };
        }
        return { allowed: true };
      };

      expect(checkAccess(1, false).allowed).toBe(true);
      expect(checkAccess(2, false).allowed).toBe(true);
      expect(checkAccess(3, false).allowed).toBe(true);
      expect(checkAccess(4, false).allowed).toBe(false);
      expect(checkAccess(4, true).allowed).toBe(true);
    });
  });
});
