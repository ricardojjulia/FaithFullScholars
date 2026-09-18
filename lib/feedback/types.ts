export type FeedbackCategory =
  | 'BUG'
  | 'ERROR'
  | 'UNEXPECTED_RESULT'
  | 'IMPROVEMENT';

export const FEEDBACK_CATEGORIES: readonly FeedbackCategory[] = [
  'BUG',
  'ERROR',
  'UNEXPECTED_RESULT',
  'IMPROVEMENT',
] as const;

export type TriageAction =
  | 'FIXED_IN_CODE'
  | 'NO_ACTION_NEEDED'
  | 'ACKNOWLEDGED'
  | 'IMPLEMENTED'
  | 'RECEIVED_AND_CLOSED';

export const TRIAGE_ACTIONS: readonly TriageAction[] = [
  'FIXED_IN_CODE',
  'NO_ACTION_NEEDED',
  'ACKNOWLEDGED',
  'IMPLEMENTED',
  'RECEIVED_AND_CLOSED',
] as const;

export interface FeedbackSubmissionPayload {
  sessionId: string;
  route: string;
  category: FeedbackCategory;
  note?: string;
  errorMessage?: string;
  breadcrumbs?: string[];
  appVersion?: string;
  sessionDurationSeconds?: number | null;
  metadata?: Record<string, unknown>;
}

export interface PilotFeedbackRecord {
  id: string;
  fingerprint: string;
  session_id: string;
  route: string;
  category: FeedbackCategory;
  error_message: string | null;
  note: string | null;
  breadcrumbs: string[];
  user_email: string | null;
  user_role: string | null;
  app_version: string | null;
  session_duration_seconds: number | null;
  hit_count: number;
  metadata: Record<string, unknown>;
  processed: boolean;
  action: TriageAction | null;
  created_at: string;
  updated_at: string;
}

export interface TriageFilterOptions {
  status?: 'open' | 'done' | 'all';
  category?: FeedbackCategory | 'ALL';
  query?: string;
  startDate?: string;
  endDate?: string;
}
