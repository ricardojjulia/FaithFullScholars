import { describe, it, expect, beforeEach } from 'vitest';
import {
  notifyScholarOfNewInquiry,
  notifyInstitutionOfInquiryResponse,
  getDispatchedNotifications,
  clearDispatchedNotifications,
} from '@/lib/notifications/email-service';

describe('Inquiry Notification Validation', () => {
  beforeEach(() => {
    clearDispatchedNotifications();
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
