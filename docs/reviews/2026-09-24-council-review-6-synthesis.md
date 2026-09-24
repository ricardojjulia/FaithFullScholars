# Council Review 6 Synthesis — Phase 13: Premium Scholar Profiles & Distinguished Faculty Dossiers

**Date:** September 24, 2026  
**Auditors:** Council Agents 1 (Data/API), 2 (Routes/Pages), 3 (UX/Shell), 4 (Feature/Competitive)  
**Target Proposal:** Phase 13 — Premium Scholar Profiles & Distinguished Faculty Dossiers (ADR 0014)  
**Overall Verdict:** **UNANIMOUS APPROVAL WITH CONDITIONS** (Readiness Score: 92/100)

---

## 1. Cross-Agent Consensus

All 4 Council agents independently concluded that Phase 13 addresses a genuine theological academic need (SBL/Chicago printable dossier packets for search committees, accredited media lecture showcases, and persistent independent faculty identity) while warning against commercialized "pay-to-win" anti-patterns.

### Key Mandates & Non-Negotiable Conditions:
1. **Search Neutrality Invariant:** `profile_tier` (`'distinguished_fellow'`) must **never** boost search ranking or AI Matcher scores. Directory query ordering remains strictly relevance, verified credential, and discipline-based.
2. **Privilege Escalation Defense:** Scholars must **not** be allowed to self-promote to `profile_tier = 'distinguished_fellow'` via direct SQL updates. A PostgreSQL trigger (`prevent_scholar_tier_escalation`) or admin-only mutation function must enforce immutability for non-admin accounts.
3. **ADR 0005 Revision Isolation:** New scholarly identifiers (`orcid_id`, `google_scholar_url`) are trust assertions; they must stage through `scholar_profile_revisions.snapshot_data`, diff in admin review (`ProfileRevisionDiff`), and promote upon administrative approval.
4. **Restrained Academic Design:** No commercial badges ("VIP", "Featured"). Use dignified institutional designations: *"Distinguished Fellow"*, *"Endowed Chair / Senior Scholar"* with restrained Oxford navy / burnished gold academic seals (`<ShieldCheck />` or `<Award />`).
5. **Zero-CLS Multimedia Showcase:** Video and audio embeds (YouTube, Vimeo, podcasts) must utilize responsive `aspect-video` facade wrappers with click-to-play hydration, strict CSP domain whitelisting, and zero auto-play.
6. **Print-Ready SBL/Chicago Dossier (`/scholars/[slug]/dossier`):** High-fidelity physical print stylesheet (`@media print`, `print:hidden` for navigation shells, `print:break-inside-avoid`) compiling verified degrees, affirmed confessional standards, SBL-formatted publications, syllabi, and faculty commendations into a search-committee-ready binder packet.

---

## 2. Architectural Decision Record (ADR 0014)

See [`docs/adr/0014-premium-scholar-profiles-and-distinguished-faculty-dossiers.md`](../adr/0014-premium-scholar-profiles-and-distinguished-faculty-dossiers.md).

---

## 3. Sequenced Implementation Prompts

### Prompt A — Data Layer: Schema Migrations, RLS Security & Escalation Triggers
- **ADR Reference:** ADR 0014
- **Files:** `supabase/migrations/20260924140000_distinguished_scholar_dossiers.sql`, `lib/domain/types.ts`
- **Scope:** Add `profile_tier`, `orcid_id`, `google_scholar_url` to `public.scholars`, `is_featured`, `thumbnail_url`, `duration_seconds` to `public.media_links`, update `snapshot_data` schema, add privilege escalation defense trigger, and update TypeScript domain types.
- **Verification:** `npm run audit:rls`, `npm run audit:security`.

### Prompt B — Domain Services & Validation: SBL Citation Formatter, Media Sanitizer & Dossier Compiler
- **ADR Reference:** ADR 0014
- **Files:** `lib/media/showcase-service.ts`, `lib/profiles/dossier-service.ts`, `lib/domain/diff.ts`, `lib/profiles/revision-actions.ts`, `tests/unit/dossier-service.test.ts`, `tests/unit/media-showcase.test.ts`
- **Scope:** Build URL sanitization and responsive embed metadata extraction for YouTube/Vimeo/podcasts, implement SBL 2nd edition monograph/journal citation formatter, single-scholar dossier data loader, and update revision diffing.
- **Verification:** `npm run test` (targeted unit tests).

### Prompt C — UI Components: Academic Seal, Media Showcase & Dossier Print View
- **ADR Reference:** ADR 0014
- **Files:** `components/scholars/distinguished-badge.tsx`, `components/scholars/scholar-media-showcase.tsx`, `app/scholars/[slug]/dossier/page.tsx`, `app/scholars/[slug]/page.tsx`, `components/scholars/scholar-header.tsx`
- **Scope:** Create `<DistinguishedBadge />` with restrained academic styling, `<ScholarMediaShowcase />` with zero-CLS click-to-play facade, integrate into `/scholars/[slug]`, and build board-ready print page `/scholars/[slug]/dossier`.
- **Verification:** `npm run build`, `npm run lint`.

### Prompt D — Scholar Workspace: Media & Lecture Showcase Manager
- **ADR Reference:** ADR 0014
- **Files:** `app/dashboard/media/page.tsx`, `app/api/scholars/media/route.ts`, `app/api/scholars/media/[id]/route.ts`, `components/shell/user-menu.tsx`, `tests/integration/scholar-media.test.ts`
- **Scope:** Implement authenticated CRUD for scholar media showcase links in `/dashboard/media`, linked from UserMenu and Profile dashboard.
- **Verification:** `npm run test`, `npm run audit:rls`.

### Prompt E — Multi-Journey End-to-End Tests & Pilot Fixtures
- **ADR Reference:** ADR 0014
- **Files:** `tests/e2e/distinguished-dossier.spec.ts`, `scripts/seed-pilot-cohort.ts`, `scripts/verify-pilot-readiness.ts`
- **Scope:** Add Playwright browser tests covering distinguished scholar badge rendering, print dossier view, media showcase playback, and seed Dr. Calvin Edwards as a Distinguished Fellow with sample lecture embeds.
- **Verification:** `npm run verify`, `npm run test:e2e`, `npm run verify:pilot`, `npm run verify:deploy`.
