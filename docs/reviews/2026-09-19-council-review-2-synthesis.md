# Council Review 2 — Synthesis & Architecture Transformation Plan

**Review Date:** 2026-09-19  
**Council Session:** Round 2 (The LinkedIn-Grade Academic Architecture, Data Protection & Search Anti-Scraping Protocol)  
**Status:** Executed & Verified (All 6 Quality Gates Passed on `main`)  
**Repo Root:** `/Users/rjulia/programs/FaithFullScholars`

---

## 1. Executive Summary & Cross-Agent Consensus

Following the user directive to align FaithFull Scholars with the look, feel, and modern experience of **LinkedIn**, while establishing **maximum user data protection, comprehensive RLS enforcement, multi-tenant segmentation, and robust search abuse/anti-scraping defenses**, the Council convened all four audit agents.

### Cross-Agent Consensus Findings

1. **Modern LinkedIn Paradigm is Essential for Adoption (Agents 2, 3, 4)**:
   - The user experience must mirror LinkedIn's successful patterns: persistent global app bar with universal search, 3-column desktop layout, canonical profile card structure with cover banners, overlapping avatars, headline credentials, and prominent action buttons.
2. **Search Abuse Gating & Anti-Scraping is Non-Negotiable (Agents 1, 4)**:
   - The public search bar must not be exploitable for automated faculty harvesting or database denial-of-service. We must deploy atomic token-bucket rate limiting, search term sanitization, and deep-pagination walls (capping anonymous discovery to 18 records before requiring free sign-in).
3. **Data Protection & PII Segregation (Agent 1)**:
   - Direct emails, phone numbers, draft profile revisions, and unreleased CVs must never be exposed publicly. Contacting scholars occurs through structured institutional inquiry workflows.
4. **Theological Academic Dignity (Agents 3, 4)**:
   - While adopting LinkedIn's layout mechanics, typography and visual tone must remain dignified and Christ-centered, elevating historic Christian confessional standards, terminal degrees, and ATS/ABHE accredited course syllabi.

---

## 2. Architectural Decisions Enacted

- **[ADR 0007: LinkedIn-Grade UI/UX and Academic Network Design System](docs/adr/0007-linkedin-ux-and-academic-network-design-system.md)**: Establishes universal persistent app bar, 3-column desktop layouts, canonical profile card hierarchy (cover banner, overlapping avatar, action bar, modular cards).
- **[ADR 0008: Search Abuse Gating, Anti-Scraping Defenses, and PII Protection](docs/adr/0008-search-abuse-gating-anti-scraping-and-pii-protection.md)**: Implements token-bucket search rate limiting, 3-page anonymous discovery cap, input sanitization, PII segregation, and signed storage URLs.

---

## 3. Implementation Plan & Prompts Sequence

The Council recommends breaking the execution into three focused, test-driven prompts:

### Prompt A — Global Search Abuse Gating, Rate Limiter & PII Safeguards
**ADR Reference:** ADR-0008  
**Files to Modify/Create:**
- `supabase/migrations/20260919110000_search_rate_limits.sql`
- `lib/search/rate-limiter.ts`
- `lib/search/sanitize.ts`
- `lib/domain/queries.ts`
- `tests/unit/search-gating.test.ts`
- `tests/integration/search-rate-limits.test.ts`

**Work:**
1. Create `search_rate_limits` table in PostgreSQL with RLS and atomic increment procedure.
2. Build server-side search input sanitizer (stripping wildcards, bounding length to 100 chars, regex defense).
3. Enforce rate limiting: 15 queries/min for anonymous callers, 120 queries/min for authenticated institutions. Return HTTP 429 when exceeded.
4. Enforce 3-page anonymous pagination cap (max 18 results) with sign-in prompt trigger.
5. Verify tests with `npm run test` and `npm run audit:rls`.

---

### Prompt B — Persistent Universal App Bar & LinkedIn Shell Navigation
**ADR Reference:** ADR-0007  
**Files to Modify/Create:**
- `components/shell/public-nav.tsx`
- `components/shell/universal-search-bar.tsx`
- `components/shell/user-menu.tsx`
- `app/layout.tsx`
- `tests/unit/universal-nav.test.ts`

**Work:**
1. Upgrade `<PublicNav />` into a modern LinkedIn-style universal app bar.
2. Embed active search bar with icon, shortcut indicator (`/`), and search target selector (*Faculty*, *Courses*, *Confessions*).
3. Add primary nav items with icon badges: Home, Network (Directory), Courses, Institutions, Teaching Calls.
4. Add user profile ("Me") dropdown menu.
5. Ensure responsive drawer for mobile/tablet.

---

### Prompt C — Canonical LinkedIn-Style Scholar Profile & 3-Column Directory
**ADR Reference:** ADR-0007, ADR-0001, ADR-0005  
**Files to Modify/Create:**
- `app/scholars/[slug]/page.tsx`
- `components/scholars/scholar-profile-hero.tsx`
- `components/scholars/scholar-doctrinal-card.tsx`
- `components/scholars/scholar-credentials-card.tsx`
- `components/scholars/scholar-publications-card.tsx`
- `components/scholars/scholar-courses-card.tsx`
- `app/scholars/page.tsx`
- `components/scholars/scholar-recommendations-rail.tsx`

**Work:**
1. Re-architect `/scholars/[slug]` into LinkedIn card hierarchy: cover banner, 120px circular overlapping avatar, identity header, action bar (*Inquire*, *Shortlist*, *Share*), and section cards.
2. Render personal doctrinal statement in callout card with affirmed historic confessions and adherence level chips.
3. Re-architect `/scholars` into balanced 3-column desktop layout: Left (Mini profile & filters rail), Center (Directory cards), Right (Contextual recommendations & accreditation trust banner).
4. Connect anonymous pagination wall modal prompting sign-in on page 4+.

---

## 4. Verification Gate Criteria

Prior to merging any code resulting from this Council round:
1. `npm run version:check`: Clean consistency.
2. `npm run lint`: Zero ESLint warnings or errors.
3. `npm run typecheck`: Zero TypeScript compiler errors.
4. `npm run test`: All existing 45 tests + new search gating tests green.
5. `npm run audit:rls`: 100% compliance across all tables (including `search_rate_limits`).
6. `npm run build`: Production Next.js Turbopack build succeeds with zero route errors.

---

## 5. Execution & Verification Outcome

All three prompts (A, B, C) were successfully implemented and verified:
- **Git Feature Branch:** `feat/milestone-2.5-linkedin-ux-and-search-protection` merged into `main` and pushed to GitHub.
- **RLS Audit:** 25/25 tables verified with 100% Row Level Security on live PostgreSQL.
- **Automated Tests:** 10 test files, 58/58 tests passing (`tests/unit/search-gating.test.ts`, `tests/integration/search-rate-limits.test.ts`, etc.).
- **Production Build:** Next.js Turbopack build succeeded with 0 route errors.

