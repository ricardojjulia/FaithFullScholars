# Council Review #11 — Agent 4: Feature Completeness & Competitive Gap Analysis

**Auditor:** Council Agent 4 (Feature & Competitive Analysis)  
**Date:** 2026-10-02  
**Status:** Complete (READ-ONLY)  
**Repository Root:** `/Users/rjulia/programs/FaithFullScholars`

---

## 1. Workflow Completion (% Complete)

| Core MVP Module | % Complete | Implementation Reality & Status |
| :--- | :---: | :--- |
| **Public Scholar Directory & Filters** | **100%** | Multi-facet filtering, token-bucket rate limiting (60 req/min), and 3-page anonymous search cap. |
| **Public Scholar Profile (Doctrinal & Confessional)** | **100%** | Hero header, SBL citations, doctrinal statement, and Confessional Lens alignment matrix. |
| **Course Showcase (Syllabi & Media)** | **90%** | Public showcase and licensing modals render live data. However, the dashboard course manager uses local state (`INITIAL_COURSES`) without database persistence. |
| **Assisted CV Onboarding & Draft Ingestion** | **85%** | PDF heuristic and Gemini extraction populate draft fields. However, wizard completion stages to `sessionStorage` without inserting to `scholar_profile_revisions`. |
| **Scholar Profile Dashboard & Revision Staging (ADR 0005)** | **80%** | Staging schema, diff calculations, and admin approval exist. However, `app/dashboard/profile` stages to `sessionStorage` rather than persisting to PostgreSQL. |
| **Institution Inquiry System** | **95%** | Multi-tenant RLS on `inquiries`, rate limiting (10/hr), and tier quota enforcement fully operational. |
| **Admin Review & Diff Inspection (ADR 0003, ADR 0005)** | **100%** | Live in `/admin/reviews`; computes field diffs, promotes approved snapshots to `scholars`, and logs audit trails in `profile_reviews`. |
| **Confessional Common App & Applicant Matrix (ADR 0020)** | **95%** | Sealed candidate dossier dispatch, ATS Standard 3 terminal doctorate verification, and applicant comparison matrix. |

---

## 2. User Role Coverage
- **Scholar (85%)**: PostgreSQL RLS is robust across all 35 tables, isolating draft profiles and inquiries. However, `app/dashboard/layout.tsx` lacks server-side session checks, leaving several dashboard pages on mock data.
- **Institution User (88%)**: API routes enforce `institution_users` checks, but `app/(institution)/institution/layout.tsx` lacks server-side layout auth guards.
- **Admin (96%)**: Protected via `verifyStaffUser()` checking `accounts.role = 'admin'` at the layout boundary and across API routes.
- **Public Visitor (98%)**: Strict query filtering hides unapproved drafts. Anti-scraping rate limits, pagination walls, and PII suppression are enforced.

---

## 3. Core Operations Workflows
- **Draft Isolation (88%)**: Revision staging decouples published snapshots from pending reviews. However, `app/dashboard/profile` relies on `sessionStorage` rather than persisting staged rows.
- **Credential Publication (92%)**: Decouples self-attestations from verified credentials and terminal doctorates.
- **Applicant Matrix Evaluation (95%)**: Search committees evaluate candidates side-by-side with automated confessional fit scoring and terminal degree checks.
- **Institution Inquiry Vetting (90%)**: Quota-metered with anti-spam protections.

---

## 4. Domain Gap: Theological Academic Recruitment Realities
1. **Annual Guild Hiring Cycles (ETS / SBL / EPS)**: Seminary hiring revolves around November annual meetings (6 weeks away). The platform operates as an evergreen board, lacking convention-specific interview suite scheduling and seasonal cycle tracking.
2. **ATS/ABHE Accreditation**: Standard 3 (Credentials) and Standard 4/5 (Doctoral Supervision) engines exist. Gap: Lacks automated live directory sync with ATS/ABHE to verify institutional accreditation.
3. **Confessional Alignment & Scruples**: Confessional Lens scores adherence to historic creeds. Gap: Denominational scruples remain free-form text rather than searchable, clause-level tags.
4. **Syllabus IP Rights**: ADR 0013 establishes bilateral licensing contracts. Gap: Relies on scholar self-attestation of IP ownership without verifying faculty handbook work-for-hire restrictions.

---

## 5. Readiness Score & Justification

**Readiness Score: 87 / 100**

**Justification:**  
The data architecture, RLS security (100% across 35 tables), search anti-scraping gating, admin diff inspection, and ADR 0020 Common Application matrix are exceptionally solid.  
The 13-point deduction is strictly justified by:
1. **Dashboard Data Disconnect:** `/dashboard/profile`, `/dashboard/onboarding`, and `/dashboard/courses` stage to `sessionStorage` or local state rather than persisting draft revisions and courses to PostgreSQL.
2. **Shell Auth Enforcement:** Dashboard and institutional layouts lack server-side session guards.
3. **Guild Hiring Cycle Blind Spot:** Zero integration with the pivotal November ETS/SBL hiring convention cycle.
4. **Unstructured Scruples & IP Validation:** Lack of clause-level confessional exception filtering and institutional work-for-hire verification.
