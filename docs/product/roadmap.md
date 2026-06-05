# FaithFull Scholars Roadmap

## Current Position

The repository contains the initial software layout, product plan, architecture review, software factory definition, ADRs, and MVP execution plan. Runtime application code has not been implemented yet.

## Phase 0: Foundation

Goal: Create the runnable app scaffold and quality gates.

Deliverables:

- Next.js TypeScript app.
- Lint, build, unit test, and e2e test scripts.
- Baseline layout and homepage.

Exit criteria:

- `npm run verify` passes.
- App starts locally.

## Phase 1: Domain Foundation

Goal: Model the theological scholar network domain.

Deliverables:

- Database schema.
- Seed data.
- Domain types.
- Initial taxonomy.

Exit criteria:

- Database can be created from schema.
- Seed data loads.
- Domain types match product spec.

## Phase 2: Public Discovery

Goal: Let visitors discover approved scholars and courses.

Deliverables:

- Scholar directory.
- Scholar profile page.
- Course directory.
- Course detail page.
- Public search filters.

Exit criteria:

- Draft profiles are never public.
- Approved scholars and public courses are discoverable.

## Phase 3: Scholar Dashboard

Goal: Let scholars manage profiles, courses, media, CVs, and availability.

Deliverables:

- Profile editor.
- Course and media manager.
- Availability manager.
- Profile preview.

Exit criteria:

- Scholars can submit complete profiles for review.
- Ownership checks prevent cross-profile edits.

## Phase 4: Admin Review

Goal: Protect platform trust before public listing.

Deliverables:

- Review queue.
- Approve, request changes, reject, and hide actions.
- Review history.
- Reported content queue.

Exit criteria:

- Admins control profile publication.
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
