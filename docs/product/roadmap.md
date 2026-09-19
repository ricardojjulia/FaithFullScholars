# FaithFull Scholars Roadmap

## Current Position
Phase 0 (Foundation), Phase 1 (Domain Foundation), Phase 2 (Public Discovery), **Milestone 2.5 (LinkedIn-Grade UI/UX & Search Abuse Gating)**, **Task 3.0 (Assisted CV Ingestion & Onboarding)**, **Phase 3 (Scholar Dashboard & Revision Staging)**, **Phase 4 (Admin Review, Visual Diff Inspector & Trust Governance)**, **Phase 5 (Institution Inquiry & Shortlist Workflows)**, and **Phase 6 (MVP Release Hardening & Deployment Preparation)** along with the **Platform Language Translation Pipeline (Spanish `es`)** are fully implemented, audited, and verified across all 6 gates (101 tests, 25/25 RLS tables). Ready for live Vercel & Supabase pilot deployment.

## Phase 0: Foundation

Goal: Create the runnable app scaffold and quality gates.

Deliverables:

- Next.js TypeScript app.
- Vercel project configuration.
- Supabase local/remote configuration.
- Lint, build, unit test, and e2e test scripts.
- Baseline layout and homepage.

Exit criteria:

- `npm run verify` passes.
- App starts locally.

## Phase 1: Domain Foundation

Goal: Model the theological scholar network domain.

Deliverables:

- Database schema (including `confessional_standards`, `scholar_confessions`, and `scholar_profile_revisions`).
- Seed data for theological disciplines, traditions, and historical confessional standards.
- Domain types.
- Initial taxonomy.
- Supabase SQL migrations and RLS policies supporting live vs. draft revisions.
- Supabase Storage buckets for CV/profile assets and doctrinal statement files.

Exit criteria:

- Database can be created from schema.
- Seed data loads.
- Domain types match product spec.
- RLS blocks unauthorized direct access.

## Phase 2: Public Discovery

Goal: Let visitors discover approved scholars and courses.

Deliverables:

- Scholar directory.
- Scholar profile page (displaying credentials, courses, publications, confessional affirmations, and doctrinal statements).
- Course directory.
- Course detail page.
- Public search filters (discipline, availability, delivery mode, tradition, confessional standard, doctrinal statement).

Exit criteria:

- Draft profiles and unapproved revisions are never public.
- Approved scholars and public courses are discoverable with multi-criteria filters.

## Milestone 2.5: LinkedIn-Grade UI/UX & Search Abuse Gating

Goal: Elevate the public discovery experience to modern LinkedIn standards while implementing robust search rate-limiting, anti-scraping defenses, and PII protection (ADR 0007, ADR 0008).

Deliverables:

- Persistent universal top application bar with integrated search typeahead and scope selectors.
- Modern 3-column desktop layout for directory and discovery feeds (mini-profile & filters on left, main directory in center, recommendations & trust rail on right).
- Canonical LinkedIn-style profile card hierarchy: cover banner, 120px overlapping avatar, credential headline, action bar, and modular cards for degrees, publications, syllabi, and doctrinal affirmations.
- Distributed token-bucket search rate limiter (`search_rate_limits` table) with 15 req/min for anonymous callers and 120 req/min for verified institutions.
- 3-page anonymous discovery cap (max 18 results) with sign-in wall preventing automated candidate harvesting.
- Search input sanitization and PII segregation.

Exit criteria:

- Directory and profile pages look and feel like modern LinkedIn tailored for theological academia.
- Automated rate limiter blocks search abuse with HTTP 429.
- Anonymous pagination beyond page 3 triggers authentication prompt.
- All quality gates (`npm run verify`) pass.

## Phase 3: Scholar Dashboard & Revision Staging (Completed)

Goal: Let scholars onboard easily, manage profiles, courses, media, CVs, availability, and submit revisions.

Deliverables:

- Assisted CV onboarding (PDF extraction, text paste, heuristic extraction of degrees, institutions, publications, disciplines).
- Profile editor with doctrinal statement and confessional standards management.
- Revision staging manager (ADR 0005): changes save to draft revisions without breaking live profiles, with real-time diff preview.
- Course and syllabi manager with modal creation and delivery mode tags.
- Availability manager for teaching formats, opportunity types, and academic terms.
- LinkedIn-grade profile preview matching public discovery look and feel.
- Complete platform i18n translation framework with Spanish (`es`) catalog and language switcher.

Exit criteria:

- [x] Scholars can onboard via CV upload or manual entry.
- [x] Scholars can submit complete profiles or revision diffs for review.
- [x] Ownership checks prevent cross-profile edits.
- [x] All 6 quality gates pass (`npm run verify`).

## Phase 4: Admin Review, Visual Diff Inspector & Trust Governance (Completed)

Goal: Protect platform trust before public listing and moderate profile edits (ADR 0003, ADR 0005).

Deliverables:

- Review queue for initial profile submissions and revision diffs (`/admin/reviews`).
- Visual diff viewer (`RevisionDiffViewer`) comparing published baseline snapshot with submitted revision.
- Approve, request changes, reject, and hide actions with reviewer notes and publication promotion.
- Review history and audit log (`profile_reviews` table).
- Institution verification queue (`/admin/institutions`) with verify and reject workflows.
- Reported content moderation queue (`/admin/reports`) with dismiss, warn, hide, and remove actions.
- Persistent admin sub-navigation bar across reviews, institutions, reports, and error triage.

Exit criteria:

- [x] Admins control initial profile publication and revision promotions.
- [x] Review actions are auditable in `profile_reviews` table.
- [x] Institutions can be verified or rejected with audit trails.
- [x] Reported content items can be reviewed and moderated.
- [x] All 6 quality gates pass (`npm run verify`).

## Phase 5: Institution Inquiry & Shortlist Workflows (Completed)

Goal: Let approved institutions contact scholars through structured opportunity requests and manage recruitment shortlists (ADR 0008).

Deliverables:

- Structured faculty outreach inquiry modal (`StructuredInquiryModal`) for adjunct teaching, modular courses, guest lectures, etc.
- Candidate shortlisting and course bookmarking systems (`saved_scholars`, `saved_courses`) with persistence.
- Scholar Inquiry Inbox (`/dashboard/inquiries`) with status transitions (pending, accepted, declined, archived) and decision feedback.
- Institution Portal workspace (`/institution`, `/institution/inquiries`, `/institution/saved`, `/institution/profile`).
- Anti-spam rate limiting (10 inquiries/hr per institution) and input validation.
- Transactional email notification service abstraction (`email-service.ts`) with event logging.
- Unit and database integration tests verifying end-to-end communication workflows.

Exit criteria:

- [x] Approved institution users can send inquiries.
- [x] Unapproved institutions are blocked at API and RLS layers.
- [x] Spam-prone routes are rate-limited.
- [x] Scholar inbox displays incoming inquiries and allows accept/decline responses.
- [x] Candidates and courses can be shortlisted and viewed in the institution portal.
- [x] All 6 quality gates pass (`npm run verify`).

## Phase 6: MVP Release Hardening & Deployment Preparation (Completed)

Goal: Harden platform edge security, validate complete user journeys end-to-end, and prepare for production Vercel deployment and pilot cohort onboarding.

Deliverables:

- Strict Edge HTTP Security Headers (`next.config.ts`): CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Permissions-Policy`, and frame ancestor blocking.
- Comprehensive End-to-End User Journey Integration test suite (`tests/integration/e2e-user-journeys.test.ts`) covering all 4 core personas (scholar onboarding, admin trust review, public discovery, institutional hiring).
- Production Release Readiness Checklist (`docs/deployment/release-readiness-checklist.md`).
- Pilot Cohort Diagnostic Inspector script (`scripts/verify-pilot-readiness.ts` / `npm run verify:pilot`).
- 100% passing automated quality gates (`npm run verify`).

Exit criteria:

- [x] Strict security headers enforced on all application routes.
- [x] All 4 persona flows verified in automated end-to-end integration tests.
- [x] Release checklist published and documented.
- [x] Diagnostic script verifies pilot seed baseline (taxonomy, confessions, traditions, RLS).
- [x] All 6 quality gates pass (`npm run verify` = 101 tests across 18 files, 25/25 tables RLS enforced).
- [x] MVP is ready to support a controlled pilot cohort of scholars and institutions.

## Pilot Recommendation

Pilot with:

- 20 to 40 scholars.
- 3 to 7 theological institutions.
- 6 to 10 disciplines.
- Public profiles with at least one course or media item per scholar.
- Inquiry tracking focused on adjunct, guest lecture, and course review opportunities.
