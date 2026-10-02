# Council Review #11 — Synthesis & Action Plan

**Date:** 2026-10-02  
**Chair:** Automated Engineering Factory / Council Coordinator  
**Council Composition:**
- Agent 1: Data & API Audit
- Agent 2: Routes & Pages Audit
- Agent 3: UX & Shell Quality Audit
- Agent 4: Feature Completeness & Competitive Gap Analysis
- Agent 5: The Wildcard (Innovation & Lateral Thinking Catalyst)

---

## 1. Executive Summary

Council Review #11 audited the FaithFull Scholars repository across data architecture, route inventory, accessibility, competitive positioning, and lateral product innovation.

The council established strong consensus on two pillars of action:
1. **System & Shell Hardening**:
   - Add `print:hidden` to shell navigation (`PublicNav`, `PublicFooter`, `InstitutionNav`, `AdminNav`) to prevent navigation elements from appearing on printed candidate dossiers and ATS self-study matrices.
   - Add active route highlighting and `aria-current="page"` to `PublicNav` using `usePathname()`.
   - Fix modal dialog accessibility (`role="dialog"`, boolean `aria-modal={true}`, `aria-labelledby`) across `ExpressInterestModal`, `IssueEndorsementModal`, `CourseLicensingModal`, `StructuredInquiryModal`, `AIFacultyMatcherModal`, and `PostingApplicantMatrix`. Add `scope="col"` to matrix tables.
   - Sanitize raw database error messages in `lib/inquiries/actions.ts` and `lib/admin/actions.ts`.
   - Secure `GET/PATCH /api/institution/contracts/[id]` with authenticated session checks.
   - Mount `CourseLicensingModal` directly on course details (`/courses/[slug]`) so syllabus distribution agreements can be initiated.
   - Add root loading state `app/loading.tsx` with academic card skeletons.
   - Mount repository root `middleware.ts` connecting `lib/supabase/middleware.ts` for SSR session refresh.
2. **Wildcard Innovation — ADR 0021**:
   - Unanimously approved Agent 5's **Theological Guild Annual Conference (ETS/SBL/EPS) Mobile Interview & Presentation Hub**.
   - With the annual joint meetings of the Evangelical Theological Society (ETS), Society of Biblical Literature (SBL), and Evangelical Philosophical Society (EPS) taking place in mid-November (6 weeks away), over 70% of theological faculty hiring and doctoral screening occurs at this event.
   - FaithFull Scholars introduces conference presentation tracking, convention interview scheduling, and a mobile-optimized floor docket (`/institution/conferences`) with real-time committee deliberation notes and confessional fit indicators.

---

## 2. Cross-Agent Consensus & Findings Triage

### Priority 1: Security & API Hardening (Agent 1)
- **Finding**: `GET/PATCH /api/institution/contracts/[id]` lacks authenticated session verification. `lib/inquiries/actions.ts` and `lib/admin/actions.ts` leak raw Postgres error strings.
- **Action**: Add session checks to contract route handler; sanitize all error responses with safe user-facing error messages.

### Priority 2: Shell & Accessibility Hardening (Agent 2 & Agent 3)
- **Finding**:
  - `PublicNav`, `PublicFooter`, `InstitutionNav`, and `AdminNav` omit `print:hidden`, leaking web navigation bars onto printed candidate dossiers and board accreditation reports.
  - `PublicNav` omits `usePathname()` and active link visual indication.
  - Modals omit `role="dialog"`, `aria-labelledby`, or pass string literals for `aria-modal`.
  - Zero `loading.tsx` exists in the `app/` hierarchy.
  - `CourseLicensingModal` is unmounted on `/courses/[slug]`.
- **Action**: Add `print:hidden` to shell bars; add `usePathname()` active indicator; fix modal ARIA attributes; mount `CourseLicensingModal` on `/courses/[slug]`; create `app/loading.tsx`.

### Priority 3: Wildcard Innovation — Conference Interview Suite (Agent 5 & Agent 4)
- **Finding**: Theological hiring operates around the November ETS/SBL annual meetings. The platform currently operates in a calendar vacuum.
- **Action**: Adopt **ADR 0021: Theological Guild Annual Conference (ETS/SBL/EPS) Mobile Interview & Presentation Hub**.
  - Route: `/institution/conferences` rendering candidate floor docket, scheduled convention interviews, and confidential committee scoring notes.
  - Profile Integration: `<ConferencePresentationBadge />` on `/scholars/[slug]` and `<PostingApplicantMatrix />`.
  - Modal: `<ConferenceInterviewModal />` for 1-click convention interview dispatch.
  - Service: `lib/conferences/conference-service.ts` managing conference appearances, session schedules, and committee interview dockets.

---

## 3. Architecture Decision Record (ADR 0021)
Drafted under `docs/adr/0021-theological-guild-annual-conference-interview-hub.md`.

---

## 4. Factory Execution Plan

1. **Architecture & ADR**: Author ADR 0021.
2. **System & Shell Hardening**:
   - Add `print:hidden` to `components/shell/public-nav.tsx`, `components/shell/public-footer.tsx`, `components/institution/institution-nav.tsx`, `components/admin/admin-nav.tsx`.
   - Add active link state and `aria-current="page"` to `components/shell/public-nav.tsx`.
   - Fix modal dialog ARIA semantics and table headers across components.
   - Sanitize error messages in `lib/inquiries/actions.ts` and `lib/admin/actions.ts`.
   - Add session check to `app/api/institution/contracts/[id]/route.ts`.
   - Mount `CourseLicensingModal` on `app/courses/[slug]/page.tsx`.
   - Create root `app/loading.tsx` and mount root `middleware.ts`.
3. **Conference Hub (ADR 0021)**:
   - Create `lib/conferences/conference-types.ts` and `lib/conferences/conference-service.ts`.
   - Build UI components: `<ConferencePresentationBadge />` and `<ConferenceInterviewModal />`.
   - Mount `/institution/conferences` route for search committee floor dockets.
   - Add "Conferences" link to `components/institution/institution-nav.tsx`.
   - Add internationalization tokens in `en.json` and `es.json` under `conferences` namespace.
   - Author comprehensive unit tests in `tests/unit/conference-service.test.ts`.
4. **Verification**:
   - Vitest unit & integration tests (`npm run test`).
   - RLS and Splinter security checks (`npm run audit:rls`, `npm run audit:security`).
   - Pilot and deployment checks (`npm run verify:pilot`, `npm run verify:deploy`).
   - Playwright E2E browser tests (`npm run test:e2e`).
   - Next.js Turbopack build (`npm run build`).
5. **Documenter Close-Out**:
   - Update `docs/FAITHFULL_SCHOLARS_FULL_PLAN.md` with Phase 18.
   - Update `CHANGELOG.md` and author daily run report.
