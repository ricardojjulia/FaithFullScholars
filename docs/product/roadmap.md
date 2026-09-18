# FaithFull Scholars Roadmap

## Current Position

The repository contains the initial software layout, product plan, architecture review, software factory definition, ADRs, and MVP execution plan. Runtime application code has not been implemented yet. The selected platform baseline is Vercel-hosted Next.js backed by Supabase Auth, Supabase Postgres, RLS, and Supabase Storage.

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
