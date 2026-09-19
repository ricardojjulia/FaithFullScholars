# FaithFull Scholars Roadmap

## Current Position

Phase 0 (Foundation), Phase 1 (Domain Foundation), and Phase 2 (Public Discovery) are fully implemented and verified. Per Council Review Round 2 consensus and user mandate, we are executing **Milestone 2.5: LinkedIn-Grade UI/UX & Search Abuse Gating** (ADR 0007, ADR 0008) to deliver a modern LinkedIn-style application experience with robust anti-scraping and PII defenses before advancing to Phase 3 (Scholar Dashboard & CV Onboarding).

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

## Phase 3: Scholar Dashboard

Goal: Let scholars onboard easily, manage profiles, courses, media, CVs, availability, and submit revisions.

Deliverables:

- Assisted CV onboarding (PDF extraction to pre-fill draft profile fields).
- Profile editor with doctrinal statement and confessional standards management.
- Revision staging manager (ADR 0005): changes save to draft revisions without breaking live profiles.
- Course and media manager.
- Availability manager.
- Profile preview.

Exit criteria:

- Scholars can onboard via CV upload or manual entry.
- Scholars can submit complete profiles or revision diffs for review.
- Ownership checks prevent cross-profile edits.

## Phase 4: Admin Review

Goal: Protect platform trust before public listing and moderate profile edits.

Deliverables:

- Review queue for initial profile submissions and revision diffs.
- Visual diff viewer comparing published snapshot with submitted revision.
- Approve, request changes, reject, and hide actions.
- Review history and audit log.
- Reported content queue.

Exit criteria:

- Admins control initial profile publication and revision promotions.
- Review actions are auditable.

## Phase 5: Institution Inquiry

Goal: Let approved institutions contact scholars through structured opportunity requests.

Deliverables:

- Institution user flow.
- Inquiry form.
- Inquiry dashboard.
- Email notification abstraction.

Exit criteria:

- Approved institution users can send inquiries.
- Spam-prone routes are rate-limited.

## Phase 6: MVP Release Hardening

Goal: Prepare the platform for a controlled pilot.

Deliverables:

- E2E smoke tests.
- Accessibility checks.
- Release checklist.
- Pilot seed content policy.

Exit criteria:

- MVP can support a small pilot cohort of scholars and institutions.

## Pilot Recommendation

Pilot with:

- 20 to 40 scholars.
- 3 to 7 theological institutions.
- 6 to 10 disciplines.
- Public profiles with at least one course or media item per scholar.
- Inquiry tracking focused on adjunct, guest lecture, and course review opportunities.
