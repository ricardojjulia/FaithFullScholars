# Council Review #10 — Synthesis & Action Plan

**Date:** 2026-09-30  
**Chair:** Automated Engineering Factory / Council Coordinator  
**Council Composition:**
- Agent 1: Data & API Audit
- Agent 2: Routes & Pages Audit
- Agent 3: UX & Shell Quality Audit
- Agent 4: Feature Completeness & Competitive Gap Analysis
- Agent 5: The Wildcard (Innovation & Lateral Thinking Catalyst)

---

## 1. Executive Summary

Council Review #10 audited the complete FaithFull Scholars repository across data architecture, route inventory, accessibility, competitive positioning, and lateral product innovation.

The council established strong consensus on two pillars of action:
1. **System & Shell Hardening**: Fix unauthenticated endpoints in `app/api/institution/saved-scholars` and `saved-courses`; harmonize sub-navigation across `/dashboard` and `/institution`; add missing `app/global-error.tsx` and `app/loading.tsx` skeletons; suppress persistent navigation when printing board/accreditation dossiers; and sanitize all raw database errors.
2. **Wildcard Innovation — ADR 0020**: Unanimously approved Agent 5's **Confessional Common Application & Search Committee Applicant Matrix**. Inverting job postings from passive notice boards into an automated candidate clearinghouse allows theological scholars to submit 1-click verified dossiers (ATS Standard 3 credentials, affirmed confessions, sample syllabi) while search committees review side-by-side comparative matrices scored by confessional and doctoral alignment.

---

## 2. Cross-Agent Consensus & Findings Triage

### Priority 1: Security & API Authorization (Agent 1)
- **Finding**: Route handlers for saved scholars (`/api/institution/saved-scholars`), saved courses (`/api/institution/saved-courses`), and inquiry response (`/api/inquiries/[id]`) execute database mutations without validating authenticated sessions.
- **Action**: Add session checks via `createClient()` and verify institution ownership before mutations.

### Priority 2: Shell & Navigation Integrity (Agent 2)
- **Finding**:
  - `app/dashboard/layout.tsx` omits `/dashboard/media` and `/dashboard/licensing` from sub-navigation, and statically hardcodes active styling on "Draft Preview".
  - `components/institution/institution-nav.tsx` omits `/institution/licensing`.
  - In `app/dashboard/contracts/page.tsx`, the inspect link routes scholars into the institution workspace.
- **Action**: Add missing navigation items, dynamically compute active links using `usePathname()`, and scope contract drilldowns cleanly.

### Priority 3: UX, Accessibility & Print Polish (Agent 3)
- **Finding**:
  - `app/(institution)/institution/layout.tsx` prints `PublicNav` and `InstitutionNav` onto formal ATS/ABHE board compliance dossiers.
  - No `loading.tsx` or `global-error.tsx` exist in the root application.
  - Raw database errors risk exposure in action handlers.
- **Action**: Add `print:hidden` to institutional layouts; create `app/loading.tsx` and `app/global-error.tsx`; sanitize all error returns.

### Priority 4: Wildcard Innovation — Confessional Common App (Agent 5 & 4)
- **Finding**: Search committees are overwhelmed with unstandardized PDF packets, while scholars duplicate effort across dozens of seminary portals.
- **Action**: Adopt **ADR 0020: Confessional Common Application & Search Committee Applicant Matrix**.
  - Route: `/institution/postings/[id]/applicants` rendering side-by-side applicant comparison with confessional match badges.
  - Action: 1-click "Submit Common App" on `/opportunities/[slug]` snapshotting ATS Standard 3 credentials, affirmed confessions, and sample syllabi into applicant dossiers.
  - Data: Leverage existing `inquiries` schema with structured inquiry type `opportunity_application` and metadata JSONB, guaranteeing 100% RLS compliance without risky migrations.

---

## 3. Architecture Decision Record (ADR 0020)
Drafted under `docs/adr/0020-confessional-common-application-and-applicant-matrix.md`.

---

## 4. Factory Execution Plan

1. **Architecture & ADR**: Author ADR 0020.
2. **API & Security Hardening**:
   - Secure `/api/institution/saved-scholars`, `/api/institution/saved-courses`, and `/api/inquiries/[id]`.
   - Sanitize error messages in `lib/inquiries/actions.ts` and `lib/admin/actions.ts`.
3. **Shell, Navigation & Print Hardening**:
   - Update `app/dashboard/layout.tsx` with dynamic sub-nav, including Media and Licensing.
   - Update `components/institution/institution-nav.tsx` to include Licensing.
   - Add `print:hidden` in `app/(institution)/institution/layout.tsx`.
   - Create `app/loading.tsx` and `app/global-error.tsx`.
4. **Common App & Applicant Matrix (ADR 0020)**:
   - Create `lib/postings/applicant-service.ts` for applicant package generation and triage.
   - Create `components/institution/posting-applicant-matrix.tsx`.
   - Mount `/institution/postings/[id]/applicants/page.tsx`.
   - Add 1-click application modal and status tracking on `/opportunities/[slug]`.
   - Add internationalization tokens in `en.json` and `es.json`.
5. **Verification**:
   - Run Vitest unit & integration tests (`npm run test`).
   - Run Playwright E2E browser tests (`npm run test:e2e`).
   - Run RLS audit (`npm run audit:rls`) and Splinter security (`npm run audit:security`).
   - Run Next.js Turbopack build (`npm run build`).
6. **Documenter Close-Out**:
   - Update `FAITHFULL_SCHOLARS_FULL_PLAN.md`, `README.md`, `CHANGELOG.md`, and author daily run report.
