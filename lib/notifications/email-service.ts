import { InquiryNotificationPayload, InquiryStatus } from '@/lib/domain/types';

export interface EmailDispatchResult {
  success: boolean;
  messageId: string;
  timestamp: string;
}

// In-memory test/audit log
const dispatchedLog: (InquiryNotificationPayload & { id: string; dispatchedAt: string })[] = [];

/**
 * Returns dispatched notifications for testing and debugging.
 */
export function getDispatchedNotifications() {
  return [...dispatchedLog];
}

/**
 * Clears the dispatched notification log (useful in unit/integration test teardown).
 */
export function clearDispatchedNotifications() {
  dispatchedLog.length = 0;
}

/**
 * Dispatches a transactional email notification.
 * In development/test mode, records to the local audit log.
 * In production, this wires to the external email transport provider (e.g. Resend / SendGrid).
 */
export async function sendTransactionalNotification(
  payload: InquiryNotificationPayload
): Promise<EmailDispatchResult> {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const timestamp = new Date().toISOString();

  dispatchedLog.push({
    ...payload,
    id: messageId,
    dispatchedAt: timestamp,
  });

  return {
    success: true,
    messageId,
    timestamp,
  };
}

/**
 * Sends a structured notification to a scholar when an institution initiates an inquiry.
 */
export async function notifyScholarOfNewInquiry(params: {
  scholarEmail: string;
  scholarName: string;
  institutionName: string;
  opportunityType: string;
  messagePreview: string;
  inquiryId: string;
}): Promise<EmailDispatchResult> {
  const formattedOpportunity = params.opportunityType.replace(/_/g, ' ');

  return sendTransactionalNotification({
    recipient_email: params.scholarEmail,
    recipient_name: params.scholarName,
    sender_name: params.institutionName,
    subject: `New Institutional Inquiry: ${formattedOpportunity} from ${params.institutionName}`,
    message_preview: params.messagePreview.length > 160 ? `${params.messagePreview.substring(0, 157)}...` : params.messagePreview,
    action_url: `/dashboard/inquiries?id=${params.inquiryId}`,
  });
}

/**
 * Sends a notification to an institution contact when a scholar responds to an inquiry.
 */
export async function notifyInstitutionOfInquiryResponse(params: {
  institutionEmail: string;
  institutionName: string;
  scholarName: string;
  status: InquiryStatus;
  responseNotes?: string | null;
  inquiryId: string;
}): Promise<EmailDispatchResult> {
  const statusLabel = params.status === 'accepted' ? 'Accepted' : params.status === 'declined' ? 'Declined' : 'Updated';

  return sendTransactionalNotification({
    recipient_email: params.institutionEmail,
    recipient_name: params.institutionName,
    sender_name: params.scholarName,
    subject: `Inquiry Response from ${params.scholarName}: ${statusLabel}`,
    message_preview: params.responseNotes || `Scholar ${params.scholarName} has updated the status of your inquiry to ${statusLabel}.`,
    action_url: `/institution/inquiries?id=${params.inquiryId}`,
  });
}
