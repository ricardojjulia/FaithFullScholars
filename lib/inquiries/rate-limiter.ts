/**
 * In-memory token-bucket / sliding-window rate limiter for institutional inquiries.
 * Prevents automated outreach abuse and directory scraping (ADR 0008).
 */

interface RateLimitRecord {
  timestamps: number[];
}

const MAX_INQUIRIES_PER_HOUR = 10;
const ONE_HOUR_MS = 60 * 60 * 1000;

const inquiryTracker = new Map<string, RateLimitRecord>();

/**
 * Checks if an institution is within its allowable inquiry rate limit.
 */
export function checkInquiryRateLimit(
  institutionId: string,
  now: number = Date.now()
): { allowed: boolean; remaining: number; resetTime: number } {
  const record = inquiryTracker.get(institutionId) || { timestamps: [] };

  // Filter timestamps within the last hour
  const validTimestamps = record.timestamps.filter((ts) => now - ts < ONE_HOUR_MS);
  inquiryTracker.set(institutionId, { timestamps: validTimestamps });

  const remaining = Math.max(0, MAX_INQUIRIES_PER_HOUR - validTimestamps.length);
  const oldestTimestamp = validTimestamps.length > 0 ? Math.min(...validTimestamps) : now;
  const resetTime = oldestTimestamp + ONE_HOUR_MS;

  return {
    allowed: validTimestamps.length < MAX_INQUIRIES_PER_HOUR,
    remaining,
    resetTime,
  };
}

/**
 * Records an inquiry dispatch against the institution's quota.
 */
export function recordInquirySent(institutionId: string, now: number = Date.now()): void {
  const record = inquiryTracker.get(institutionId) || { timestamps: [] };
  const validTimestamps = record.timestamps.filter((ts) => now - ts < ONE_HOUR_MS);
  validTimestamps.push(now);
  inquiryTracker.set(institutionId, { timestamps: validTimestamps });
}

/**
 * Resets inquiry rate limit tracker (for testing).
 */
export function resetInquiryRateLimits(): void {
  inquiryTracker.clear();
}
