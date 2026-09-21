# Council Review 3 — Synthesis & Architecture Strategy

**Review Date:** 2026-09-21  
**Council Session:** Round 3 (Strategic Backlog Expansion: Conference Speaker & Keynote Lecture Bureau)  
**Status:** Synthesis Complete — Awaiting Human Approval  
**Repo Root:** `/Users/rjulia/programs/FaithFullScholars`

---

## 1. Executive Summary & Cross-Agent Consensus

Following the successful remediation and verification of all GitHub Copilot review comments and the formal codification of the Copilot Pre-Merge Triage Gate into `AGENTS.md` and `improve-software.md`, the Council convened all four audit agents to evaluate the current platform state and identify the next strategic capability from **§21 Post-MVP Platform Capabilities**.

### Cross-Agent Consensus Findings

1. **Platform Foundations & Security Are Rock Solid (Agents 1, 3, 4)**:
   - 100% PostgreSQL Row Level Security enforced across all 28 tables.
   - 0 Splinter database security advisor findings.
   - 25 passing test suites (134 tests) and 9 Playwright browser journeys.
   - Strict edge security headers and sanitized error boundaries.
2. **High-Value Market Opportunity: Speaking Bureau & Lecture Series (Agents 1, 2, 4)**:
   - Theological seminaries, university Christian fellowships, academic societies (ETS, SBL, IBR), and churches conduct constant searches for verified, confessional keynote speakers, chapel preachers, and annual lecture series presenters (e.g. Staley Lectures, Payton Lectures, Reformation Day addresses).
   - While scholars currently have boolean flags in `availability_profiles`, the platform lacks a dedicated **Theological Speakers & Lecture Bureau** surface (`/speakers`) where event coordinators can discover scholars by lecture topics, listen to sample recordings, and submit structured speaking invitations.
3. **UX & Discovery Enhancement (Agents 2, 3)**:
   - Creating a dedicated `/speakers` discovery hub eliminates search friction for event committees and complements the Faculty (`/scholars`), Courses (`/courses`), and Opportunities (`/opportunities`) directories in the universal app bar.

---

## 2. Architectural Decisions Proposed

- **[ADR 0009: Theological Conference Speaker Directory & Institutional Speaking Bureau](docs/adr/0009-theological-speaker-directory-and-speaking-bureau.md)**:
  - Defines the schema and data models for scholar speaking topics, keynote lecture titles, audio/video sample links, and structured lecture invitation workflows.
  - Gating & Multi-tenant RLS: Only approved scholars with active speaking availability are indexed; scholars manage their own topics; speaking invitations are tracked via `inquiries` with `opportunity_type = 'conference_speaking'` or `'guest_lecturer'`.

---

## 3. Implementation Prompts Sequence

The Council recommends executing this feature in three sequential prompts:

### Prompt A — Database Migration & Speaking Bureau Domain Models
**ADR Reference:** ADR-0009  
**Files:**
- `supabase/migrations/20260921130000_speaking_bureau.sql`
- `lib/speakers/speaker-service.ts`
- `tests/unit/speaker-bureau.test.ts`
- `tests/integration/speaker-bureau-rls.test.ts`

**Work:**
1. Create `speaker_topics` table linked to `scholars` with title, description, theological tags, sample media URL, and RLS policies.
2. Add speaker metadata columns to `availability_profiles` (e.g. `travel_range`, `speaker_bio_summary`, `sample_audio_url`).
3. Implement `speaker-service.ts` with queries for featured speakers, topic searching, and scholar speaker topic management.
4. Verify tests with `npm run test`, `npm run audit:rls`, and `npm run audit:security`.

---

### Prompt B — Public Speaking Bureau Directory & Speaker Profile Card
**ADR Reference:** ADR-0009, ADR-0007  
**Files:**
- `app/speakers/page.tsx`
- `components/speakers/speaker-card.tsx`
- `components/scholars/scholar-speaker-topics-card.tsx`
- `app/scholars/[slug]/page.tsx`
- `components/shell/public-nav.tsx`
- `tests/e2e/speaker-discovery.spec.ts`

**Work:**
1. Add "Speakers" navigation link to universal app bar (`public-nav.tsx`).
2. Build `/speakers` directory with filterable topic chips, tradition badges, and speaker search.
3. Add interactive "Speaking Topics & Keynote Lectures" card to the public scholar dossier (`/scholars/[slug]`).
4. Connect "Invite Speaker" button directly to the structured inquiry modal with pre-selected `opportunity_type: 'conference_speaking'`.

---

### Prompt C — Scholar Dashboard Speaking Topic Management & Pre-Flight Verification
**ADR Reference:** ADR-0009  
**Files:**
- `app/dashboard/availability/page.tsx`
- `scripts/verify-deployment.ts`
- `scripts/seed-pilot-cohort.ts`
- `supabase/seed.sql`

**Work:**
1. Extend `/dashboard/availability` allowing scholars to add, edit, and reorder speaking topics and paste sample video/audio URLs.
2. Add reference speaker topics to seed cohort fixtures.
3. Update `verify-deployment.ts` to assert 29 tables and active speaker topic entries.
4. Run full `npm run verify` and Playwright E2E browser tests.
