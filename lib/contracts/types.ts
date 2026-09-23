export type OpportunityContractType =
  | 'adjunct_course'
  | 'modular_intensive'
  | 'guest_lecture'
  | 'curriculum_review'
  | 'speaking_engagement'
  | 'doctoral_supervision'
  | 'other';

export type ContractStatus =
  | 'draft'
  | 'offered'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'declined'
  | 'cancelled';

export type MilestoneStatus = 'pending' | 'submitted' | 'verified' | 'paid';

export interface ContractMilestone {
  id: string;
  contract_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  compensation_amount: number;
  status: MilestoneStatus;
  display_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstitutionContract {
  id: string;
  institution_id: string;
  scholar_id: string;
  inquiry_id: string | null;
  opportunity_type: OpportunityContractType;
  title: string;
  scope_of_work: string;
  start_date: string;
  end_date: string | null;
  total_compensation_amount: number;
  currency: string;
  payment_terms: string | null;
  status: ContractStatus;
  institution_notes: string | null;
  scholar_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations
  institution?: {
    id: string;
    name: string;
    city?: string;
    state_province?: string;
  };
  scholar?: {
    id: string;
    full_name: string;
    email?: string;
    current_title?: string;
    primary_institution?: string;
  };
  milestones?: ContractMilestone[];
}

export interface CreateContractInput {
  institution_id: string;
  scholar_id: string;
  inquiry_id?: string | null;
  opportunity_type: OpportunityContractType;
  title: string;
  scope_of_work: string;
  start_date: string;
  end_date?: string | null;
  total_compensation_amount: number;
  currency?: string;
  payment_terms?: string | null;
  institution_notes?: string | null;
  milestones?: Array<{
    title: string;
    description?: string;
    due_date?: string;
    compensation_amount: number;
    display_order?: number;
  }>;
}

export function formatContractType(type: OpportunityContractType): string {
  switch (type) {
    case 'adjunct_course':
      return 'Adjunct Semester Course';
    case 'modular_intensive':
      return 'Modular / Intensive Course';
    case 'guest_lecture':
      return 'Guest Lecture / Masterclass';
    case 'curriculum_review':
      return 'Curriculum Review & Consultation';
    case 'speaking_engagement':
      return 'Keynote Conference Speaking';
    case 'doctoral_supervision':
      return 'Doctoral / Thesis Supervision';
    case 'other':
      return 'Special Academic Engagement';
    default:
      return type;
  }
}

export function formatContractStatus(status: ContractStatus): { label: string; variant: 'neutral' | 'info' | 'success' | 'warning' | 'danger' } {
  switch (status) {
    case 'draft':
      return { label: 'Draft', variant: 'neutral' };
    case 'offered':
      return { label: 'Offer Sent', variant: 'info' };
    case 'accepted':
      return { label: 'Accepted', variant: 'success' };
    case 'in_progress':
      return { label: 'In Progress', variant: 'info' };
    case 'completed':
      return { label: 'Completed', variant: 'success' };
    case 'declined':
      return { label: 'Declined', variant: 'danger' };
    case 'cancelled':
      return { label: 'Cancelled', variant: 'neutral' };
    default:
      return { label: status, variant: 'neutral' };
  }
}
