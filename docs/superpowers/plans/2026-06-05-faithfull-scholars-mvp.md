# FaithFull Scholars MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable FaithFull Scholars MVP: a trusted scholar profile network with public discovery, scholar-managed profiles, course showcases, availability, institution inquiries, and admin review.

**Architecture:** Start with a single modular web application backed by a relational database. Keep public discovery, scholar dashboard, institution inquiry, and admin review as separate modules with explicit authorization and visibility rules. Use external media embeds for YouTube and other links instead of hosting video.

**Tech Stack:** Recommended baseline is Next.js App Router, TypeScript, PostgreSQL, Prisma or Drizzle ORM, Tailwind CSS, shadcn/ui or equivalent accessible components, Playwright for browser tests, Vitest or Jest for unit tests, and an email provider for transactional notifications.

---

## Scope

This plan creates the software foundation and MVP feature set. It does not implement payments, contracts, synchronous chat, LMS delivery, credential verification automation, or direct video hosting.

## File Structure Target

The initial implementation should create a structure similar to:

```text
app/
  (public)/
    page.tsx
    scholars/page.tsx
    scholars/[slug]/page.tsx
    courses/page.tsx
    courses/[slug]/page.tsx
  dashboard/
    profile/page.tsx
    cv/page.tsx
    publications/page.tsx
    courses/page.tsx
    availability/page.tsx
    inquiries/page.tsx
  institution/
    saved/page.tsx
    inquiries/page.tsx
  admin/
    reviews/page.tsx
    taxonomy/page.tsx
components/
  profiles/
  courses/
  search/
  forms/
  admin/
lib/
  auth/
  db/
  profiles/
  courses/
  search/
  inquiries/
  review/
  media/
  taxonomy/
prisma/
  schema.prisma
  seed.ts
tests/
  unit/
  integration/
  e2e/
```

If a different framework is selected, preserve the same module boundaries.

## Phase 0: Repository Baseline

### Task 0.1: Initialize Application Stack

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `README.md` updates as needed

- [ ] **Step 1: Scaffold the app**

Run the selected framework scaffold command. For the recommended stack:

```bash
npx create-next-app@latest . --ts --eslint --tailwind --app --src-dir false --import-alias "@/*"
```

Expected: project files are created in the repository root without overwriting the existing docs.

- [ ] **Step 2: Verify scaffold**

```bash
npm run lint
npm run build
```

Expected: both commands pass.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "chore: initialize FaithFull Scholars app"
```

### Task 0.2: Add Quality Gates

**Files:**

- Modify: `package.json`
- Create: `tests/README.md`
- Create: `playwright.config.ts`

- [ ] **Step 1: Add test dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom playwright @playwright/test
```

Expected: dependencies install successfully.

- [ ] **Step 2: Add scripts**

Add scripts:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "verify": "npm run lint && npm run test && npm run build"
}
```

- [ ] **Step 3: Add test documentation**

Create `tests/README.md`:

```markdown
# Tests

Use unit tests for pure business rules, integration tests for server actions and data access, and Playwright tests for public discovery, scholar onboarding, admin review, and institution inquiry flows.
```

- [ ] **Step 4: Verify**

```bash
npm run verify
```

Expected: lint, tests, and build pass. If there are no tests yet, the test runner should exit successfully with the configured empty-suite behavior.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json playwright.config.ts tests/README.md
git commit -m "chore: add verification gates"
```

## Phase 1: Domain and Database Foundation

### Task 1.1: Define Domain Schema

**Files:**

- Create: `prisma/schema.prisma`
- Create: `lib/db/client.ts`
- Create: `lib/profiles/types.ts`
- Create: `lib/courses/types.ts`
- Create: `lib/inquiries/types.ts`

- [ ] **Step 1: Add ORM**

```bash
npm install @prisma/client
npm install -D prisma
npx prisma init
```

Expected: Prisma config files are created.

- [ ] **Step 2: Define schema models**

Add models for:

- Account
- Scholar
- Institution
- InstitutionUser
- Discipline
- ScholarDiscipline
- Tradition
- ScholarTradition
- Credential
- Publication
- Course
- CourseDiscipline
- MediaLink
- AvailabilityProfile
- Inquiry
- SavedScholar
- SavedCourse
- ProfileReview
- Report

Required enum concepts:

- AccountRole
- ProfileStatus
- VerificationStatus
- AvailabilityStatus
- OpportunityType
- DeliveryMode
- InquiryStatus
- ReviewDecision

- [ ] **Step 3: Generate ORM client**

```bash
npx prisma generate
```

Expected: client generation succeeds.

- [ ] **Step 4: Commit**

```bash
git add prisma lib/db lib/profiles lib/courses lib/inquiries
git commit -m "feat: define FaithFull Scholars domain schema"
```

### Task 1.2: Add Seed Data

**Files:**

- Create: `prisma/seed.ts`
- Modify: `package.json`

- [ ] **Step 1: Add seed script**

Seed data should include:

- Disciplines across biblical studies, theology, history, and ministry.
- Traditions with neutral labels.
- Three approved sample scholars using fictional names.
- One draft scholar.
- Six sample courses.
- YouTube-style media links using clearly fake or placeholder URLs unless real permission exists.
- One approved institution.

- [ ] **Step 2: Add package seed command**

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

Install `tsx` if needed:

```bash
npm install -D tsx
```

- [ ] **Step 3: Run seed**

```bash
npx prisma db push
npx prisma db seed
```

Expected: database schema applies and seed data loads.

- [ ] **Step 4: Commit**

```bash
git add prisma package.json package-lock.json
git commit -m "chore: seed scholar network data"
```

## Phase 2: Public Discovery

### Task 2.1: Scholar Directory

**Files:**

- Create: `app/scholars/page.tsx`
- Create: `components/search/scholar-search.tsx`
- Create: `components/profiles/scholar-card.tsx`
- Create: `lib/search/scholars.ts`
- Test: `tests/unit/search-scholars.test.ts`

- [ ] **Step 1: Write failing test**

Test that search results only include approved scholars and filter by discipline and availability.

- [ ] **Step 2: Implement search query**

Implement `searchScholars(filters)` with approved-profile filtering built in.

- [ ] **Step 3: Render directory**

Render search controls and scholar cards.

- [ ] **Step 4: Verify**

```bash
npm run test -- search-scholars
npm run build
```

Expected: tests and build pass.

- [ ] **Step 5: Commit**

```bash
git add app/scholars components/search components/profiles lib/search tests/unit
git commit -m "feat: add public scholar directory"
```

### Task 2.2: Scholar Profile Page

**Files:**

- Create: `app/scholars/[slug]/page.tsx`
- Create: `components/profiles/scholar-profile.tsx`
- Create: `components/profiles/cv-summary.tsx`
- Create: `components/profiles/availability-panel.tsx`
- Create: `components/courses/course-list.tsx`
- Create: `lib/profiles/public-profile.ts`
- Test: `tests/integration/public-profile-visibility.test.ts`

- [ ] **Step 1: Write visibility test**

Test that approved profiles load and draft, hidden, rejected, or submitted profiles return not found.

- [ ] **Step 2: Implement public profile loader**

Implement a loader that fetches only approved scholar data and public courses/media.

- [ ] **Step 3: Render profile**

Include identity, biography, disciplines, CV summary, publications, courses, media, and availability.

- [ ] **Step 4: Verify**

```bash
npm run test -- public-profile-visibility
npm run build
```

Expected: tests and build pass.

- [ ] **Step 5: Commit**

```bash
git add app/scholars components/profiles components/courses lib/profiles tests/integration
git commit -m "feat: add public scholar profiles"
```

### Task 2.3: Course Directory and Course Pages

**Files:**

- Create: `app/courses/page.tsx`
- Create: `app/courses/[slug]/page.tsx`
- Create: `components/courses/course-card.tsx`
- Create: `components/courses/course-detail.tsx`
- Create: `components/courses/media-preview.tsx`
- Create: `lib/courses/public-courses.ts`
- Test: `tests/unit/public-courses.test.ts`

- [ ] **Step 1: Write tests**

Test that public course queries exclude courses owned by unapproved scholars and include courses with free preview content.

- [ ] **Step 2: Implement loaders**

Add course list and course detail loaders.

- [ ] **Step 3: Render pages**

Render course details, scholar link, delivery mode, syllabus link, reading list, and media previews.

- [ ] **Step 4: Verify**

```bash
npm run test -- public-courses
npm run build
```

Expected: tests and build pass.

- [ ] **Step 5: Commit**

```bash
git add app/courses components/courses lib/courses tests/unit
git commit -m "feat: add public course discovery"
```

## Phase 3: Scholar Dashboard

### Task 3.1: Profile Editor

**Files:**

- Create: `app/dashboard/profile/page.tsx`
- Create: `components/forms/scholar-profile-form.tsx`
- Create: `lib/profiles/profile-actions.ts`
- Test: `tests/integration/scholar-profile-edit.test.ts`

- [ ] **Step 1: Write authorization test**

Test that a scholar can edit only their own profile and cannot edit another scholar profile.

- [ ] **Step 2: Implement profile update action**

Validate required fields and ownership before saving.

- [ ] **Step 3: Render editor**

Render fields for name, title, institution, biography, location, disciplines, traditions, links, and contact preference.

- [ ] **Step 4: Verify**

```bash
npm run test -- scholar-profile-edit
npm run build
```

Expected: tests and build pass.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard components/forms lib/profiles tests/integration
git commit -m "feat: add scholar profile editor"
```

### Task 3.2: Course and Media Manager

**Files:**

- Create: `app/dashboard/courses/page.tsx`
- Create: `components/forms/course-form.tsx`
- Create: `components/forms/media-link-form.tsx`
- Create: `lib/courses/course-actions.ts`
- Create: `lib/media/url-validation.ts`
- Test: `tests/unit/media-url-validation.test.ts`
- Test: `tests/integration/course-management.test.ts`

- [ ] **Step 1: Write URL validation tests**

Test accepted YouTube video URLs, YouTube playlist URLs, website URLs, and rejected unsafe or malformed URLs.

- [ ] **Step 2: Implement validation**

Normalize provider type and reject unsupported URL schemes.

- [ ] **Step 3: Implement course actions**

Allow scholars to create, edit, and hide their own courses.

- [ ] **Step 4: Render manager**

Render course list, course form, media link form, syllabus link, and free preview toggle.

- [ ] **Step 5: Verify**

```bash
npm run test -- media-url-validation
npm run test -- course-management
npm run build
```

Expected: tests and build pass.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/courses components/forms lib/courses lib/media tests
git commit -m "feat: add course and media management"
```

### Task 3.3: Availability Manager

**Files:**

- Create: `app/dashboard/availability/page.tsx`
- Create: `components/forms/availability-form.tsx`
- Create: `lib/profiles/availability-actions.ts`
- Test: `tests/integration/availability-management.test.ts`

- [ ] **Step 1: Write ownership test**

Test that scholars can update only their own availability profile.

- [ ] **Step 2: Implement availability update action**

Validate status, opportunity types, delivery modes, travel willingness, languages, and notes.

- [ ] **Step 3: Render availability form**

Use checkboxes or segmented controls for opportunity types and delivery modes.

- [ ] **Step 4: Verify**

```bash
npm run test -- availability-management
npm run build
```

Expected: tests and build pass.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/availability components/forms lib/profiles tests/integration
git commit -m "feat: add scholar availability management"
```

## Phase 4: Admin Review and Trust

### Task 4.1: Profile Submission and Review

**Files:**

- Create: `app/admin/reviews/page.tsx`
- Create: `components/admin/profile-review-list.tsx`
- Create: `components/admin/profile-review-detail.tsx`
- Create: `lib/review/profile-review-actions.ts`
- Test: `tests/integration/profile-review.test.ts`

- [ ] **Step 1: Write workflow tests**

Test draft to submitted, submitted to approved, submitted to changes requested, and approved to hidden.

- [ ] **Step 2: Implement submit action**

Scholars can submit only their own profile when required fields are complete.

- [ ] **Step 3: Implement admin review actions**

Admins can approve, request changes with notes, reject, or hide profiles.

- [ ] **Step 4: Render admin queue**

Render submitted profiles, review detail, decision controls, and review history.

- [ ] **Step 5: Verify**

```bash
npm run test -- profile-review
npm run build
```

Expected: tests and build pass.

- [ ] **Step 6: Commit**

```bash
git add app/admin components/admin lib/review tests/integration
git commit -m "feat: add admin profile review workflow"
```

### Task 4.2: Reports and Moderation Notes

**Files:**

- Create: `app/admin/reports/page.tsx`
- Create: `components/admin/report-list.tsx`
- Create: `lib/review/report-actions.ts`
- Test: `tests/integration/report-content.test.ts`

- [ ] **Step 1: Write report tests**

Test public reporting for scholar profiles and admin-only report resolution.

- [ ] **Step 2: Implement report action**

Capture reason, reporter email, URL, notes, and target record.

- [ ] **Step 3: Render admin report queue**

Render unresolved reports and resolution controls.

- [ ] **Step 4: Verify**

```bash
npm run test -- report-content
npm run build
```

Expected: tests and build pass.

- [ ] **Step 5: Commit**

```bash
git add app/admin/reports components/admin lib/review tests/integration
git commit -m "feat: add content reporting workflow"
```

## Phase 5: Institution Inquiry

### Task 5.1: Structured Inquiry Form

**Files:**

- Create: `components/forms/inquiry-form.tsx`
- Create: `lib/inquiries/inquiry-actions.ts`
- Create: `app/institution/inquiries/page.tsx`
- Test: `tests/integration/inquiry-submission.test.ts`

- [ ] **Step 1: Write inquiry tests**

Test that approved institution users can send inquiries to approved scholars, and public anonymous users cannot use the formal inquiry route.

- [ ] **Step 2: Implement inquiry action**

Validate institution, scholar, opportunity type, proposed term, delivery mode, message, and contact email.

- [ ] **Step 3: Add rate-limit hook**

Add a simple server-side guard that can later be backed by Redis or database counters.

- [ ] **Step 4: Render inquiry form**

Render opportunity type, proposed term, delivery mode, message, contact email, and optional course reference.

- [ ] **Step 5: Verify**

```bash
npm run test -- inquiry-submission
npm run build
```

Expected: tests and build pass.

- [ ] **Step 6: Commit**

```bash
git add components/forms lib/inquiries app/institution tests/integration
git commit -m "feat: add structured institution inquiries"
```

### Task 5.2: Inquiry Notifications

**Files:**

- Create: `lib/notifications/email.ts`
- Create: `lib/inquiries/inquiry-notifications.ts`
- Test: `tests/unit/inquiry-notifications.test.ts`

- [ ] **Step 1: Write notification test**

Test that notification payloads include scholar name, institution name, opportunity type, proposed term, and safe dashboard link.

- [ ] **Step 2: Implement email abstraction**

Create an email sender interface with a no-op development implementation.

- [ ] **Step 3: Wire inquiry notification**

Trigger notification after successful inquiry creation.

- [ ] **Step 4: Verify**

```bash
npm run test -- inquiry-notifications
npm run build
```

Expected: tests and build pass.

- [ ] **Step 5: Commit**

```bash
git add lib/notifications lib/inquiries tests/unit
git commit -m "feat: notify scholars about institution inquiries"
```

## Phase 6: Release Hardening

### Task 6.1: End-to-End Smoke Tests

**Files:**

- Create: `tests/e2e/public-discovery.spec.ts`
- Create: `tests/e2e/profile-review.spec.ts`
- Create: `tests/e2e/inquiry-flow.spec.ts`

- [ ] **Step 1: Add public discovery test**

Test homepage to scholar directory to scholar profile to course preview.

- [ ] **Step 2: Add profile review test**

Test scholar draft submission and admin approval.

- [ ] **Step 3: Add inquiry flow test**

Test institution user finds approved scholar and submits inquiry.

- [ ] **Step 4: Verify**

```bash
npm run test:e2e
npm run verify
```

Expected: e2e, lint, unit tests, and build pass.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e
git commit -m "test: add MVP end-to-end smoke coverage"
```

### Task 6.2: Documentation Closeout

**Files:**

- Modify: `README.md`
- Modify: `docs/product/master-plan.md`
- Modify: `docs/architecture/architecture-review.md`
- Create: `docs/product/mvp-release-checklist.md`

- [ ] **Step 1: Add release checklist**

Checklist must include:

- Public profile visibility verified.
- Draft profiles are not public.
- Institution inquiries require authorized institution user.
- Admin review history is preserved.
- YouTube links are validated.
- Accessibility smoke check completed.
- Seed data does not contain real unverifiable scholar claims.

- [ ] **Step 2: Update README**

Add setup, development, test, and verification commands.

- [ ] **Step 3: Verify docs and build**

```bash
npm run verify
```

Expected: verification passes.

- [ ] **Step 4: Commit**

```bash
git add README.md docs
git commit -m "docs: close out MVP release readiness"
```

## Recommended Build Order

1. Phase 0: Repository baseline.
2. Phase 1: Domain and database foundation.
3. Phase 2: Public discovery.
4. Phase 3: Scholar dashboard.
5. Phase 4: Admin review and trust.
6. Phase 5: Institution inquiry.
7. Phase 6: Release hardening.

## Post-MVP Backlog

- AI-assisted CV import into draft profile fields.
- AI-assisted syllabus tagging.
- Institution subscriptions.
- Public topic hubs for SEO.
- Scholar analytics.
- Shortlist export to PDF.
- Course licensing workflow.
- Contract and booking workflow.
- Verified credential partnerships.
- Conference speaker directory.
