import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkInquiryRateLimit,
  recordInquirySent,
  resetInquiryRateLimits,
} from '@/lib/inquiries/rate-limiter';
import {
  notifyScholarOfNewInquiry,
  notifyInstitutionOfInquiryResponse,
  getDispatchedNotifications,
  clearDispatchedNotifications,
} from '@/lib/notifications/email-service';

describe('Inquiry Rate Limiting & Notification Validation', () => {
  beforeEach(() => {
    resetInquiryRateLimits();
    clearDispatchedNotifications();
  });

  describe('Rate Limiter', () => {
    const institutionId = 'inst-uuid-1234-5678';

    it('allows inquiries up to the 10 inquiries/hr limit', () => {
      const initial = checkInquiryRateLimit(institutionId);
      expect(initial.allowed).toBe(true);
      expect(initial.remaining).toBe(10);

      for (let i = 0; i < 10; i++) {
        expect(checkInquiryRateLimit(institutionId).allowed).toBe(true);
        recordInquirySent(institutionId);
      }

      const capped = checkInquiryRateLimit(institutionId);
      expect(capped.allowed).toBe(false);
      expect(capped.remaining).toBe(0);
    });

    it('recovers capacity after the 1-hour window expires', () => {
      const now = 1000000;
      const oneHourPlus = now + 60 * 60 * 1000 + 1000;

      for (let i = 0; i < 10; i++) {
        recordInquirySent(institutionId, now);
      }

      expect(checkInquiryRateLimit(institutionId, now).allowed).toBe(false);
      expect(checkInquiryRateLimit(institutionId, oneHourPlus).allowed).toBe(true);
      expect(checkInquiryRateLimit(institutionId, oneHourPlus).remaining).toBe(10);
    });
  });

  describe('Notification Dispatch', () => {
    it('dispatches structured notification to scholar on new inquiry', async () => {
      const result = await notifyScholarOfNewInquiry({
        scholarEmail: 'scholar@seminary.edu',
        scholarName: 'Dr. Sarah Edwards',
        institutionName: 'Westminster Theological Seminary',
        opportunityType: 'adjunct',
        messagePreview: 'We would love to invite you to teach Reformed Epistemology.',
        inquiryId: 'inq-999',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toContain('msg_');

      const logs = getDispatchedNotifications();
      expect(logs).toHaveLength(1);
      expect(logs[0].recipient_email).toBe('scholar@seminary.edu');
      expect(logs[0].subject).toContain('adjunct');
      expect(logs[0].action_url).toBe('/dashboard/inquiries?id=inq-999');
    });

    it('dispatches response notification to institution on scholar response', async () => {
      const result = await notifyInstitutionOfInquiryResponse({
        institutionEmail: 'dean@seminary.edu',
        institutionName: 'Trinity Evangelical Divinity School',
        scholarName: 'Dr. David Bruce',
        status: 'accepted',
        responseNotes: 'I would be delighted to discuss adjunct instruction for Spring 2027.',
        inquiryId: 'inq-1001',
      });

      expect(result.success).toBe(true);

      const logs = getDispatchedNotifications();
      expect(logs).toHaveLength(1);
      expect(logs[0].recipient_email).toBe('dean@seminary.edu');
      expect(logs[0].subject).toContain('Accepted');
      expect(logs[0].action_url).toBe('/institution/inquiries?id=inq-1001');
    });
  });
});
