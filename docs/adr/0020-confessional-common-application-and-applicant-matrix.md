# ADR 0020: Confessional Common Application & Search Committee Applicant Matrix

## Status
Accepted (Council Review #10 / Phase 17 Strategic Capability). **Partially superseded by [ADR 0027](0027-posting-applications-and-frozen-dossiers.md)** (2026-10-08): applications now live in `posting_applications`, not `inquiries`, and the dossier is sealed in SQL. The product intent below stands.

## Context
In theological higher education, faculty recruitment processes suffer from acute structural friction on both sides of the market:
1. **Search Committees & Deans**: Upon publishing an academic opening (adjunct faculty, visiting chair, modular intensive, or tenure-track appointment), institutional search committees receive 50+ unstructured applicant email packets containing diverse CV formats, unindexed publication lists, and disparate doctrinal statements. Committee members spend dozens of hours collating and standardizing candidate data to assess basic qualifications: terminal degrees from accredited institutions (ATS Standard 3), teaching discipline alignment, and confessional/doctrinal conformity.
2. **Scholars & Candidates**: Doctoral graduates and adjunct professors spend hours re-typing publications, degree credentials, and confessional subscription statements across fragmented institutional portals and email chains for every individual opportunity.
3. **Previous Architectural Baseline**: The platform's job board (`/opportunities`) previously operated primarily as a passive notice board, where candidates could only submit a generic contact form (`POST /api/postings/[id]/express-interest`). Inbound candidate data was not integrated into structured institutional workflows or comparative analysis matrices.

## Decision
1. **Confessional Common Application**:
   - Invert the opportunities marketplace from a passive job board into an automated candidate clearinghouse.
   - When a verified scholar applies to an opportunity (`/opportunities/[slug]`), the system packages their profile data into a sealed **Candidate Application Dossier Snapshot**:
     - Contact & identification attributes (name, title, current institution, location).
     - Verified terminal degrees and awarding institutions (ATS Standard 3 qualifications).
     - Confessional standards affirmed, subscription levels (`full_subscription` vs `with_exceptions`), and detailed scruple notes.
     - Primary and secondary theological disciplines.
     - Sample syllabi, course previews, and CV URL.
     - Candidate cover note tailored to the specific posting.
2. **Search Committee Applicant Comparison Matrix**:
   - Mount a dedicated search committee workspace at `/institution/postings/[id]/applicants`.
   - Render the `<PostingApplicantMatrix />` component providing:
     - Side-by-side comparative table of all applicants.
     - Confessional alignment scoring against the institution's doctrinal baseline.
     - Terminal doctorate verification badge.
     - Applicant status workflow controls (`submitted`, `under_review`, `interview_scheduled`, `declined`).
     - 1-click drilldown into the candidate's canonical academic profile and CV.
3. **Data Architecture & Multi-Tenant RLS**:
   - Model applications via the hardened `public.inquiries` architecture using `inquiry_type = 'opportunity_application'` and JSONB `metadata` holding the sealed dossier snapshot and posting reference, or via direct posting applicant querying.
   - Strict multi-tenant isolation: Only authenticated members of the posting's sponsoring institution can view and triage applicant dossiers.
   - Scholars can view and track their own submitted applications under their dashboard workspace.
4. **Platform Hardening & Resilience**:
   - Secure previously unauthenticated institution endpoints (`/api/institution/saved-scholars`, `/api/institution/saved-courses`, and `/api/inquiries/[id]`).
   - Add missing `app/global-error.tsx` root error boundary and `app/loading.tsx` visual skeleton.
   - Update navigation bars in `app/dashboard/layout.tsx` and `components/institution/institution-nav.tsx` to include Media and Licensing.
   - Suppress persistent navigation printing on formal institutional dossiers (`print:hidden`).
   - Maintain 100% symmetric English (`en.json`) and Spanish (`es.json`) localization under the `common_app` namespace.

## Consequences
- **Positive**: Eliminates 30+ hours of manual application collation for search committees by delivering instant, standardized applicant matrices with confessional fit indicators.
- **Positive**: Eliminates redundant data entry for scholars, allowing 1-click applications with verified academic dossiers.
- **Data Model**: Leverages existing robust RLS-enforced inquiry structures without requiring schema migrations or downtime.
- **Security & RLS**: All candidate dossiers are isolated strictly between the applicant scholar and authorized committee members of the sponsoring institution.
