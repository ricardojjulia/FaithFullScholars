# FaithFull Scholars MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable FaithFull Scholars MVP: a trusted scholar profile network with public discovery, scholar-managed profiles, course showcases, availability, institution inquiries, and admin review.

**Architecture:** Start with a single modular Next.js App Router application deployed on Vercel and backed by Supabase Auth, Supabase Postgres, Row Level Security, and Supabase Storage. Keep public discovery, scholar dashboard, institution inquiry, and admin review as separate modules with explicit authorization and visibility rules. Use external media embeds for YouTube and other links instead of hosting video.

**Tech Stack:** Next.js App Router, TypeScript, Vercel, Supabase Auth, Supabase Postgres, Supabase RLS, Supabase Storage, `@supabase/supabase-js`, `@supabase/ssr`, Tailwind CSS, shadcn/ui or equivalent accessible components, Playwright for browser tests, Vitest or Jest for unit tests, and an email provider for transactional notifications.

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
  supabase/
  db/
  profiles/
  courses/
  search/
  inquiries/
  review/
  media/
  taxonomy/
supabase/
  config.toml
  migrations/
  seed.sql
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
- Create: `vercel.json`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `README.md` updates as needed

- [x] **Step 1: Scaffold the app**

Run the selected framework scaffold command. For the recommended stack:

```bash
npx create-next-app@latest . --ts --eslint --tailwind --app --src-dir false --import-alias "@/*"
```

Expected: project files are created in the repository root without overwriting the existing docs.

- [x] **Step 2: Add Vercel project defaults**

Create `vercel.json`:

```json
{
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

Expected: Vercel recognizes the project as a Next.js app and deploys server routes in the selected region unless project settings override it.

- [x] **Step 3: Verify scaffold**

```bash
npm run lint
npm run build
```

Expected: both commands pass.

- [x] **Step 4: Commit**

```bash
git add .
git commit -m "chore: initialize FaithFull Scholars app"
```

### Task 0.2: Add Quality Gates

**Files:**

- Modify: `package.json`
- Create: `tests/README.md`
- Create: `playwright.config.ts`

- [x] **Step 1: Add test dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom playwright @playwright/test
```

Expected: dependencies install successfully.

- [x] **Step 2: Add scripts**

Add scripts:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "verify": "npm run lint && npm run test && npm run build"
}
```

- [x] **Step 3: Add test documentation**

Create `tests/README.md`:

```markdown
# Tests

Use unit tests for pure business rules, integration tests for server actions and data access, and Playwright tests for public discovery, scholar onboarding, admin review, and institution inquiry flows.
```

- [x] **Step 4: Verify**

```bash
npm run verify
```

Expected: lint, tests, and build pass. If there are no tests yet, the test runner should exit successfully with the configured empty-suite behavior.

- [x] **Step 5: Commit**

```bash
git add package.json package-lock.json playwright.config.ts tests/README.md
git commit -m "chore: add verification gates"
```

### Task 0.3: Configure Supabase and Vercel Environment Contracts

**Files:**

- Create: `.env.example`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`
- Create: `middleware.ts`
- Modify: `package.json`

- [x] **Step 1: Add Supabase dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Expected: Supabase client libraries install successfully.

- [x] **Step 2: Add environment contract**

Create `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PROJECT_ID=
```

Expected: public variables contain only URL and publishable key. `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be referenced by browser code.

- [x] **Step 3: Add Supabase browser client**

Create `lib/supabase/client.ts` with a browser-safe client factory that uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

- [x] **Step 4: Add Supabase server client**

Create `lib/supabase/server.ts` with a cookie-backed server client using the current Supabase SSR helper pattern for Next.js.

- [x] **Step 5: Add middleware session refresh**

Create `middleware.ts` and `lib/supabase/middleware.ts` to refresh Supabase sessions for authenticated routes.

- [x] **Step 6: Add Vercel environment setup notes**

Update README setup instructions to require these Vercel environment variables in Preview and Production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_ID`

- [x] **Step 7: Verify**

```bash
npm run verify
```

Expected: lint, tests, and build pass.

- [x] **Step 8: Commit**

```bash
git add .env.example lib/supabase middleware.ts package.json package-lock.json README.md
git commit -m "chore: configure Supabase and Vercel environment contracts"
```

## Phase 1: Domain and Database Foundation

### Task 1.1: Define Domain Schema

**Files:**

- Create: `supabase/config.toml`
- Create: `supabase/migrations/<timestamp>_initial_schema.sql`
- Create: `lib/db/client.ts`
- Create: `lib/profiles/types.ts`
- Create: `lib/courses/types.ts`
- Create: `lib/inquiries/types.ts`

- [x] **Step 1: Initialize Supabase**

```bash
npx supabase --help
npx supabase init
```

Expected: Supabase config files are created. Use the CLI help output to verify command syntax before running project-specific commands.

- [x] **Step 2: Create initial migration**

Use the Supabase CLI migration command:

```bash
npx supabase migration new initial_schema
```

Expected: a timestamped SQL migration file is created under `supabase/migrations/`.

- [x] **Step 3: Define schema tables**

Add SQL tables for:

- accounts
- scholars
- scholar_profile_revisions
- institutions
- institution_users
- disciplines
- scholar_disciplines
- traditions
- scholar_traditions
- confessional_standards
- scholar_confessions
- credentials
- publications
- courses
- course_disciplines
- media_links
- availability_profiles
- inquiries
- saved_scholars
- saved_courses
- profile_reviews
- reports

Required enum concepts:

- AccountRole
- ProfileStatus
- RevisionStatus
- VerificationStatus
- ConfessionAffirmationType
- AvailabilityStatus
- OpportunityType
- DeliveryMode
- InquiryStatus
- ReviewDecision

- [x] **Step 4: Enable RLS**

Enable RLS for every table in the exposed `public` schema. Initial policies must support:

- Public reads for approved scholar profiles, approved revisions, and approved public courses.
- Draft revision isolation: in-progress edits are readable and writable only by the owning scholar.
- Scholar-owned draft writes.
- Institution-owned saved records and inquiries.
- Admin-only review and revision promotion operations.

- [x] **Step 5: Apply migration locally**

```bash
npx supabase start
npx supabase db reset
```

Expected: local Supabase starts and the schema applies cleanly.

- [x] **Step 6: Generate database types**

```bash
npx supabase gen types typescript --local > lib/db/database.types.ts
```

Expected: TypeScript database types are generated from the local Supabase schema.

- [x] **Step 7: Commit**

```bash
git add supabase lib/db lib/profiles lib/courses lib/inquiries
git commit -m "feat: define Supabase domain schema"
```

### Task 1.2: Add Seed Data

**Files:**

- Create: `supabase/seed.sql`
- Modify: `package.json`

- [x] **Step 1: Add SQL seed data**

Seed data should include:

- Disciplines across biblical studies, theology, history, and ministry.
- Traditions with neutral labels.
- Historical confessional standards (Apostles' Creed, Nicene Creed, Westminster Confession, 1689 London Baptist, Lausanne Covenant, Chicago Inerrancy).
- Three approved sample scholars using fictional names, with sample confessional affirmations and personal doctrinal statements.
- One approved scholar with a pending draft revision to verify the revision staging model (ADR 0005).
- One draft scholar.
- Six sample courses.
- YouTube-style media links using clearly fake or placeholder URLs unless real permission exists.
- One approved institution.

- [x] **Step 2: Reset local database with seed**

```bash
npx supabase db reset
```

Expected: database schema applies and seed data loads.

- [x] **Step 3: Verify seeded data**

```bash
npx supabase status
```

Expected: local Supabase is running. Use a SQL query through the local database or Supabase Studio to confirm approved and draft scholar records exist.

- [x] **Step 4: Commit**

```bash
git add supabase/seed.sql package.json package-lock.json
git commit -m "chore: seed scholar network data"
```

### Task 1.3: Add Supabase Storage Buckets and Policies

**Files:**

- Create: `supabase/migrations/<timestamp>_storage_policies.sql`
- Create: `lib/media/storage.ts`
- Test: `tests/integration/storage-policies.test.ts`

- [x] **Step 1: Create storage migration**

```bash
npx supabase migration new storage_policies
```

Expected: a timestamped storage policy migration exists.

- [x] **Step 2: Define buckets**

Create buckets for:

- `profile-assets`
- `cv-files`
- `course-documents`

Default behavior:

- Profile assets may be public only when tied to approved public profiles.
- CV files are private by default.
- Course documents are private or public according to course preview settings and profile approval.

- [x] **Step 3: Define storage policies**

Policies must allow:

- Scholars to upload and replace their own files.
- Admins to read files during review.
- Public users to read only explicitly public files tied to approved profiles or courses.

- [x] **Step 4: Verify locally**

```bash
npx supabase db reset
npm run test -- storage-policies
```

Expected: storage policy tests pass.

- [x] **Step 5: Commit**

```bash
git add supabase/migrations lib/media tests/integration
git commit -m "feat: add Supabase storage policies"
```

## Phase 2: Public Discovery

### Task 2.1: Scholar Directory

**Files:**

- Create: `app/scholars/page.tsx`
- Create: `components/search/scholar-search.tsx`
- Create: `components/profiles/scholar-card.tsx`
- Create: `lib/search/scholars.ts`
- Test: `tests/unit/search-scholars.test.ts`

- [x] **Step 1: Write failing test**

Test that search results only include approved scholars and filter by discipline, availability, theological tradition, and confessional standards affirmed.

- [x] **Step 2: Implement search query**

Implement `searchScholars(filters)` with approved-profile filtering, tradition/confessional filtering, and multi-criteria ranking built in.

- [x] **Step 3: Render directory**

Render search controls (including confessional standards dropdown/toggles) and scholar cards.

- [x] **Step 4: Verify**

```bash
npm run test -- search-scholars
npm run build
```

Expected: tests and build pass.

- [x] **Step 5: Commit**

```bash
git add app/scholars components/search components/profiles lib/search tests/unit
git commit -m "feat: add public scholar directory with confessional filters"
```

### Task 2.2: Scholar Profile Page

**Files:**

- Create: `app/scholars/[slug]/page.tsx`
- Create: `components/profiles/scholar-profile.tsx`
- Create: `components/profiles/cv-summary.tsx`
- Create: `components/profiles/doctrinal-statement-panel.tsx`
- Create: `components/profiles/availability-panel.tsx`
- Create: `components/courses/course-list.tsx`
- Create: `lib/profiles/public-profile.ts`
- Test: `tests/integration/public-profile-visibility.test.ts`

- [x] **Step 1: Write visibility test**

Test that approved profiles load and draft, hidden, rejected, or submitted profiles return not found. Test that when an approved scholar has a pending draft revision, only the approved snapshot data is served publicly.

- [x] **Step 2: Implement public profile loader**

Implement a loader that fetches only approved scholar data (or promoted revision data), affirmed confessional standards, personal doctrinal statement, and public courses/media.

- [x] **Step 3: Render profile**

Include identity, biography, disciplines, confessional standards, personal doctrinal statement (or PDF link), CV summary, publications, courses, media, and availability.

- [x] **Step 4: Verify**

```bash
npm run test -- public-profile-visibility
npm run build
```

Expected: tests and build pass.

- [x] **Step 5: Commit**

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

- [x] **Step 1: Write tests**

Test that public course queries exclude courses owned by unapproved scholars and include courses with free preview content.

- [x] **Step 2: Implement loaders**

Add course list and course detail loaders.

- [x] **Step 3: Render pages**

Render course details, scholar link, delivery mode, syllabus link, reading list, and media previews.

- [x] **Step 4: Verify**

```bash
npm run test -- public-courses
npm run build
```

Expected: tests and build pass.

- [x] **Step 5: Commit**

```bash
git add app/courses components/courses lib/courses tests/unit
git commit -m "feat: add public course discovery"
```

### Milestone 2.5: LinkedIn-Grade UI/UX & Search Abuse Gating (ADR 0007, ADR 0008)

**Files:**

- Create: `supabase/migrations/20260919110000_search_rate_limits.sql`
- Create: `lib/search/rate-limiter.ts`
- Create: `lib/search/sanitize.ts`
- Create: `components/shell/universal-search-bar.tsx`
- Create: `components/shell/user-menu.tsx`
- Modify: `components/shell/public-nav.tsx`
- Create: `components/scholars/scholar-profile-hero.tsx`
- Create: `components/scholars/scholar-doctrinal-card.tsx`
- Create: `components/scholars/scholar-recommendations-rail.tsx`
- Modify: `app/scholars/page.tsx`
- Modify: `app/scholars/[slug]/page.tsx`
- Test: `tests/unit/search-gating.test.ts`
- Test: `tests/unit/universal-nav.test.ts`
- Test: `tests/integration/search-rate-limits.test.ts`

- [x] **Step 1: Enact ADRs & Council Concurrence**
- [x] **Step 2: Implement database rate limiting & 100% RLS on table 25**
- [x] **Step 3: Implement input sanitization and token-bucket search defense**
- [x] **Step 4: Build persistent universal top navigation bar & "Me" dropdown**
- [x] **Step 5: Build 3-column discovery layout & 3-page anonymous search cap**
- [x] **Step 6: Build academic profile cards & hero banner**
- [x] **Step 7: Verify all 6 quality gates pass (`npm run verify`)**
- [x] **Step 8: Commit & push**

## Phase 3: Scholar Dashboard

### Task 3.0: Assisted CV Ingestion and Onboarding

**Files:**

- Create: `app/dashboard/onboarding/page.tsx`
- Create: `components/forms/cv-upload-parser.tsx`
- Create: `lib/profiles/cv-parser.ts`
- Test: `tests/unit/cv-parser.test.ts`
- Test: `tests/integration/cv-onboarding.test.ts`

- [ ] **Step 1: Write parser unit tests**

Test PDF text extraction for contact info, degrees, publications, and suggested disciplines. Ensure parsing errors fail gracefully and return partial drafts.

- [ ] **Step 2: Implement CV parser helper**

Implement `parseCvDocument(fileBuffer)` extracting structured draft profile fields. Ensure output is strictly labeled as draft suggestions.

- [ ] **Step 3: Implement onboarding wizard**

Provide CV upload dropzone. When parsed, populate editable form fields and prompt the scholar to review, correct, and confirm all data.

- [ ] **Step 4: Verify**

```bash
npm run test -- cv-parser
npm run test -- cv-onboarding
npm run build
```

Expected: tests and build pass.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/onboarding components/forms/cv-upload-parser.tsx lib/profiles/cv-parser.ts tests
git commit -m "feat: add assisted CV ingestion onboarding"
```

### Task 3.1: Profile Editor and Revision Staging

**Files:**

- Create: `app/dashboard/profile/page.tsx`
- Create: `components/forms/scholar-profile-form.tsx`
- Create: `components/forms/confessional-standards-selector.tsx`
- Create: `components/forms/doctrinal-statement-form.tsx`
- Create: `lib/profiles/profile-actions.ts`
- Create: `lib/profiles/revision-actions.ts`
- Test: `tests/integration/scholar-profile-edit.test.ts`
- Test: `tests/integration/profile-revisions.test.ts`

- [ ] **Step 1: Write authorization and revision tests**

Test that a scholar can edit only their own profile. Test that saving changes to an approved profile creates an active `draft` revision without mutating the published snapshot (ADR 0005).

- [ ] **Step 2: Implement profile update and revision actions**

Validate required fields, ownership, and save updates into the working draft revision.

- [ ] **Step 3: Render editor**

Render fields for name, title, institution, biography, location, disciplines, traditions, confessional standards affirmed, personal doctrinal statement (text or PDF link), links, and contact preference.

- [ ] **Step 4: Verify**

```bash
npm run test -- scholar-profile-edit
npm run test -- profile-revisions
npm run build
```

Expected: tests and build pass.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard components/forms lib/profiles tests/integration
git commit -m "feat: add scholar profile editor and revision staging"
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

### Task 4.1: Profile Submission, Revision Diffs, and Review

**Files:**

- Create: `app/admin/reviews/page.tsx`
- Create: `components/admin/profile-review-list.tsx`
- Create: `components/admin/profile-review-detail.tsx`
- Create: `components/admin/revision-diff-viewer.tsx`
- Create: `lib/review/profile-review-actions.ts`
- Test: `tests/integration/profile-review.test.ts`
- Test: `tests/integration/revision-review.test.ts`

- [ ] **Step 1: Write workflow and diff tests**

Test draft to submitted, submitted to approved, submitted to changes requested, and approved to hidden. Test revision staging: an approved profile with an in-review revision remains publicly visible, and approval promotes the revision to the published snapshot (ADR 0005).

- [ ] **Step 2: Implement submit action**

Scholars can submit their initial profile or a pending revision when required fields are complete.

- [ ] **Step 3: Implement admin review and promotion actions**

Admins can approve, request changes with notes, reject, or hide profiles. For existing profiles with submitted revisions, approval promotes the revision data into the live snapshot.

- [ ] **Step 4: Render admin queue and diff viewer**

Render submitted profiles and revisions, visual diff view comparing published snapshot against submitted changes, decision controls, and review history.

- [ ] **Step 5: Verify**

```bash
npm run test -- profile-review
npm run test -- revision-review
npm run build
```

Expected: tests and build pass.

- [ ] **Step 6: Commit**

```bash
git add app/admin components/admin lib/review tests/integration
git commit -m "feat: add admin profile review and revision diff workflow"
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

### Task 6.0: Vercel and Supabase Deployment Setup

**Files:**

- Create: `docs/deployment/vercel-supabase.md`
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Document Vercel project linking**

Create `docs/deployment/vercel-supabase.md` with:

```markdown
# Vercel and Supabase Deployment

## Vercel

Connect the Git repository to Vercel. Use preview deployments for pull requests and production deployments from `main`.

Required Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_ID`

Never expose `SUPABASE_SERVICE_ROLE_KEY` to client components or `NEXT_PUBLIC_` variables.

## Supabase

Use separate Supabase projects or clearly separated environments for local, preview, and production data. Apply migrations before production deployment.

Required checks:

- RLS enabled on all exposed tables.
- Storage policies deployed.
- Seed data is fictional or permissioned.
- Admin account bootstrap path is documented.
```

- [ ] **Step 2: Pull Vercel env locally**

```bash
vercel pull --yes
```

Expected: `.vercel/project.json` exists locally and `.env.local` contains project environment values. Do not commit `.vercel/` or `.env.local`.

- [ ] **Step 3: Verify Supabase migrations against target**

```bash
npx supabase migration list
```

Expected: local and remote migration status is visible. Apply pending migrations only after reviewing RLS and storage policies.

- [ ] **Step 4: Build with Vercel settings**

```bash
vercel build
```

Expected: local Vercel build succeeds with pulled environment variables.

- [ ] **Step 5: Commit docs**

```bash
git add docs/deployment/vercel-supabase.md README.md .env.example
git commit -m "docs: add Vercel and Supabase deployment setup"
```

### Task 6.1: End-to-End User Journey Integration Tests (Completed)

**Files:**

- Create: `tests/integration/e2e-user-journeys.test.ts`

- [x] **Step 1: Add public discovery test**

Test unauthenticated multi-criteria search, anonymous rate limiting, scholar profile, and course preview.

- [x] **Step 2: Add scholar onboarding and revision review test**

Test curriculum vitae parsing, draft revision staging, visual diff inspection, and admin approval with snapshot promotion.

- [x] **Step 3: Add institution inquiry and shortlist test**

Test institution candidate bookmarking, structured inquiry dispatch, transactional email notification, and scholar inbox response.

- [x] **Step 4: Verify**

```bash
npm run test tests/integration/e2e-user-journeys.test.ts
npm run verify
```

Expected: e2e journeys, lint, unit tests, and build pass.

- [x] **Step 5: Commit**

```bash
git add tests/integration/e2e-user-journeys.test.ts
git commit -m "test: add comprehensive end-to-end user journeys integration suite"
```

### Task 6.2: Documentation and Release Readiness Closeout (Completed)

**Files:**

- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/product/roadmap.md`
- Modify: `docs/FAITHFULL_SCHOLARS_FULL_PLAN.md`
- Create: `docs/deployment/release-readiness-checklist.md`
- Create: `scripts/verify-pilot-readiness.ts`

- [x] **Step 1: Add release readiness checklist**

Checklist includes:
- Public profile visibility verified.
- Draft profiles and unapproved revisions are strictly segregated from public discovery.
- Institution inquiries require authorized institution status.
- Admin review history and immutable audit trail preserved in `profile_reviews`.
- YouTube links and external media embeds sanitized and CSP-controlled.
- PostgreSQL RLS verified across all 25 tables.
- Supabase Storage policies verified for CV files and profile photos.
- Vercel preview and production environment variables quarantined.
- Edge security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) enforced in `next.config.ts`.
- Pilot readiness diagnostic script verifies seed baseline.

- [x] **Step 2: Update README and CHANGELOG**

Add pilot diagnostic commands (`npm run verify:pilot`), security headers documentation, and updated roadmap status.

- [x] **Step 3: Verify docs and build**

```bash
npm run verify
```

Expected: all 6 quality gates pass with zero errors.

- [x] **Step 4: Commit**

```bash
git add README.md docs package.json scripts
git commit -m "docs: close out Phase 6 MVP release hardening and deployment readiness"
```

## Recommended Build Order

1. Phase 0: Repository baseline.
2. Phase 1: Domain and database foundation.
3. Phase 2: Public discovery.
4. Phase 3: Scholar dashboard.
5. Phase 4: Admin review and trust.
6. Phase 5: Institution inquiry.
7. Phase 6: Vercel/Supabase deployment setup and release hardening.

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
