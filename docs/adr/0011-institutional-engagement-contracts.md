# ADR 0011: Institutional Engagement Contracts & Milestone Workflow

## Status
Accepted

## Context
When a seminary or college agrees with a scholar on an opportunity (such as teaching an adjunct course, delivering a modular intensive, conducting a curriculum review, or delivering keynote conference lectures), moving from unstructured emails/inquiries to a clear engagement agreement creates trust and operational clarity.

## Decision
We introduce a structured **Institutional Engagement Contracts & Milestone Workflow**:
1. **Contract Structure:** Captured in `public.institution_contracts` with type (`adjunct_course`, `modular_intensive`, `guest_lecture`, `curriculum_review`, `speaking_engagement`, `doctoral_supervision`), title, scope of work, honorarium/compensation amount, currency, terms acknowledgment, and status lifecycle (`draft` → `offered` → `accepted` → `in_progress` → `completed` | `declined` | `cancelled`).
2. **Milestones Tracking:** Captured in `public.contract_milestones` for scheduled deliverables (e.g. syllabus submission, midterm grading, keynote delivery, final report), supporting due dates and completion verification.
3. **Role-Based Workflows:**
   - Deans draft terms, add milestones, and submit official offers.
   - Scholars review contract terms in `/dashboard/contracts`, accepting or declining with structured notes.
   - Both parties track milestones and acknowledge completion.

## Consequences
- **Positive:** Closes the loop from candidate discovery and inquiry to formal academic engagement; eliminates contract ambiguity.
- **Negative:** Requires rigorous multi-tenant RLS to ensure contracts are strictly private to the signatory institution and assigned scholar.
