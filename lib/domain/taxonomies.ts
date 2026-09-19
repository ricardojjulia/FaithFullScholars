/**
-- ==============================================================================
-- FaithFull Scholars — Taxonomy Formatting and Query Helpers
-- Utility helpers for presenting theological disciplines, traditions, and
-- historic confessional standards.
-- ==============================================================================
 */

import { AdherenceLevel } from './types';

export function formatAdherenceLevel(level: AdherenceLevel): string {
  switch (level) {
    case 'full_subscription':
      return 'Full Subscription (Ex animo)';
    case 'strict_subscription':
      return 'Strict Subscription';
    case 'general_agreement':
      return 'General Agreement';
    case 'substantial_agreement':
      return 'Substantial Agreement';
    case 'with_exceptions':
      return 'Subscription with Exceptions';
    default:
      return level;
  }
}

export function formatOpportunityType(type: string): string {
  switch (type) {
    case 'adjunct_teaching':
      return 'Adjunct Teaching';
    case 'online_instruction':
      return 'Online Instruction';
    case 'intensives_modular':
      return 'Modular Intensives';
    case 'guest_lecturing':
      return 'Guest Lecturing';
    case 'doctoral_supervision':
      return 'Doctoral Supervision';
    case 'curriculum_consulting':
      return 'Curriculum Consulting';
    case 'conference_speaking':
      return 'Conference Speaking';
    default:
      return type.replace(/_/g, ' ');
  }
}

export function formatDeliveryMode(mode: string): string {
  switch (mode) {
    case 'online_async':
      return 'Online (Asynchronous)';
    case 'online_sync':
      return 'Online (Synchronous / Live)';
    case 'in_person_modular':
      return 'In-Person (Modular Intensive)';
    case 'in_person_semester':
      return 'In-Person (Full Semester)';
    default:
      return mode.replace(/_/g, ' ');
  }
}
