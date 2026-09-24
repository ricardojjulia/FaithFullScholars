# Council Review 6 — Agent 4: Feature Completeness & Competitive Gap Audit

**Date:** September 24, 2026  
**Auditor:** Council Agent 4 (Feature Completeness & Theological Competitive Strategist)  
**Status:** READ-ONLY AUDIT COMPLETE  
**Target Candidate Feature:** Phase 13 — Premium Scholar Profiles & Distinguished Faculty Dossiers (ADR 0014)  

---

### 1. Current Platform Completeness
Following the completion and verification of Phases 0–12 (Core MVP, Institutional Marketplace, Endorsements, Speaking Bureau, Subscriptions, Contracts, Consortia, Course Licensing, and ATS/ABHE Accreditation Badges), FaithFull Scholars demonstrates exceptional operational maturity across all user roles:

- **Scholar Role (98%)**: Comprehensive self-service profile lifecycle with isolated staging revisions (ADR 0005), AI-assisted CV parsing, course licensing, speaking bureau topics, contract signing, and analytics.
- **Institution Role (96%)**: Multi-seat search committee access, tiered subscriptions (ADR 0010), bilateral engagement contracts (ADR 0011), cross-campus consortium sharing (ADR 0012), candidate shortlists, and course licensing portal (ADR 0013).
- **Admin Role (97%)**: Side-by-side revision visual diff inspector (ADR 0003), institution approval queue, accreditation verification, and content moderation triage.
- **Public Visitor (100%)**: Fast, crawlable discovery across `/scholars`, `/courses`, `/speakers`, `/opportunities`, and SEO topic hubs (`/disciplines`, `/traditions`), shielded by anti-scraping token buckets and deep-pagination limits (ADR 0008).
- **Verification Baseline**: 100% RLS enforcement across all 35 tables (123 policies), 0 Splinter security findings, 194 vitest tests across 41 suites, and 36 Playwright E2E browser tests passing.

---

### 2. Domain & Market Gap Analysis (Phase 13 / ADR 0014)
Theological academia operates under distinct hiring and reputation dynamics where generic platforms (LinkedIn, Academia.edu, ResearchGate) fail:

- **Senior Faculty, Endowed Chairs & Independent Scholars**: Senior faculty and endowed chairs frequently undergo triennial sabbaticals, external tenure reviews, and visiting chair appointments requiring an authoritative, consolidated academic portfolio. Meanwhile, emeriti and independent scholars lack institutional server hosting. Phase 13 provides an enduring, institution-independent academic home that maintains professional visibility.
- **Print-Ready SBL/Chicago Dossier vs. Standard PDF CV**: Standard PDF uploads are unstructured, visually disjointed, unstandardized, and frequently format-corrupted when printed for board packets. A dynamic SBL (Society of Biblical Literature) / Chicago Manual of Style dossier compiles validated degrees, verified confessional affirmations, peer endorsements, and SBL-formatted citations into a pristine, print-ready document (`@media print`) ideal for seminary provosts and ATS accreditation audits.
- **Multimedia Showcase (Audio Lectures & Debates)**: Theological search committees prioritize classroom pedagogy, homiletical demeanor, and poise in theological disputation. Unlike secular academia where written bibliographies suffice, seminary deans require direct proof of spoken orthodox instruction. Sandboxed audio/video embeds (keynote lectures, chapel sermons, academic debates) directly accelerate search committee vetting from weeks to minutes.

---

### 3. Risks, Anti-Patterns & Academic Integrity Safeguards
In conservative evangelical, Reformed, and confessional higher education, commercialized prestige invites swift cynicism:

- **"Pay-to-Win" Perception Risk**: If paid tiers artificially boost search rankings or confer unearned academic badges, FaithFull Scholars will be dismissed as a "vanity press" or commercial job board. Confessional seminaries distrust monetized credibility.
- **Academic Integrity Safeguards**:
  1. *Search Ranking Neutrality*: Zero algorithmic boosting. Directory query ordering must remain strictly relevance- and discipline-based regardless of subscription status.
  2. *Objective Verification Gate*: Premium "Distinguished Faculty Dossier" status cannot be bought on an empty profile. Activation must require a verified terminal degree (Ph.D./Th.D.) and at least two verified peer endorsements or an authoritative institutional affiliation.
  3. *Utility-Driven Monetization*: Scholar subscriptions must pay strictly for advanced workflow tools (custom PDF/SBL export, syllabus watermarking, audio portfolio hosting, inbound analytics), never for manufactured prestige or doctrinal rubber-stamping.

---

### 4. Readiness Score: 92 / 100
- **Strengths (92 pts)**: The data infrastructure is battle-tested. The institutional dossier export engine (`lib/inquiries/export-dossier.ts`, `/institution/saved/dossier`) already proves print-ready DOM architecture; extending this to scholar-owned SBL dossiers is natural and low architectural risk.
- **Deductions (-8 pts)**: ADR 0014 must be formally authored with strict search-neutrality invariants; SBL 2nd edition citation formatting logic requires dedicated unit test suites; and audio/podcast media embeds require strict Content Security Policy (CSP) extension without weakening existing script sandboxing.

---

### 5. Council Vote & Mandatory Implementation Conditions
Council Agent 4 votes **APPROVE WITH CONDITIONS** for Phase 13 (ADR 0014).

**Mandatory Implementation Conditions:**
1. **Search Invariant**: Implement explicit test asserting that paid scholar status introduces zero weight in directory search ordering (`ORDER BY`) or AI matching.
2. **Prerequisite Verification**: Enforce backend DB check requiring `verified_at IS NOT NULL` and terminal degree before dossier export unlocks.
3. **CSP Whitelist**: Restrict audio/multimedia embeds strictly to approved platforms (SoundCloud, Apple Podcasts, YouTube, Vimeo, Spotify).
4. **SBL Handbook Alignment**: Format monograph and journal citations strictly conforming to SBL Handbook of Style (2nd ed.).
