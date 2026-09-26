# FaithFull Scholars: MVP & Competitive Status Report

**Document Version:** 2.0  
**Date:** September 25, 2026  
**Status:** MVP 100% Delivered & Production Ready (Post-Phase 11 + Council Review #7 Wildcard Trifecta)  
**Target Architecture:** Next.js 16 (App Router / Turbopack) on Vercel · Supabase Postgres (35 Tables, 100% RLS) · Google Gemini AI  
**Repository:** `FaithFullScholars`

---

## Executive Summary

FaithFull Scholars is the purpose-built academic discovery, confessional alignment, and faculty mobility network for theological higher education. It bridges the gap between Christian academic institutions (seminaries, Bible colleges, Christian universities, divinity schools) and qualified theological faculty (professors, adjuncts, visiting scholars, researchers, and conference speakers).

As of September 2026, **the FaithFull Scholars MVP is 100% complete and fully verified**, having successfully progressed through all 11 foundational and strategic roadmap phases, 17 Architectural Decision Records (ADRs), and 7 Council Audit Reviews. The platform has evolved from an initial directory into an authoritative theological faculty ecosystem featuring AI-assisted matching, institutional recruitment dockets for Boards of Trustees, doctrinal compatibility matrices, an institutional speaking bureau, and a sabbatical exchange network.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               FAITHFULL SCHOLARS ECOSYSTEM                             │
├─────────────────────────┬──────────────────────────┬───────────────────────────────────┤
│    SCHOLAR WORKSPACE    │   INSTITUTIONAL PORTAL   │         PUBLIC & CONSORTIUM       │
├─────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ • Assisted CV Onboarding│ • AI Faculty Matcher     │ • Faceted Faculty Search          │
│ • Staged Revisions (RLS)│ • Board Search Dockets   │ • Confessional Alignment Matrix   │
│ • Doctrinal Affiliation │ • Shortlists & CSV Export│ • Speaking Bureau Directory       │
│ • Syllabi & Media Hub   │ • Structured Inquiries   │ • SabbaticalSwap Exchange         │
│ • Contract Management   │ • Milestone Agreements   │ • 100% Bilingual (EN / ES)        │
└─────────────────────────┴──────────────────────────┴───────────────────────────────────┘
```

---

## 1. MVP Status: Deliverables & Verification Baseline

The MVP is fully implemented and passes all rigorous software-factory automated quality gates.

### Core Metrics Summary
- **Unit & Integration Tests:** 228 / 228 tests passing across 45 suites (`npm run test`).
- **End-to-End Browser Tests:** 38 / 38 Playwright tests passing across 6 journey suites (`npm run test:e2e`).
- **PostgreSQL Row Level Security (RLS):** 35 / 35 tables PASS with 123 active RLS policies (`npm run audit:rls`). Zero cross-tenant data leaks.
- **Security & SQL Advisor:** 0 Splinter findings across foreign keys, connection parameters, and search path safety (`npm run audit:security`).
- **Build Quality:** Clean Turbopack compilation across 58 server and client routes (0 TypeScript errors, 0 ESLint warnings).
- **Localization:** 100% symmetric English (`en`) and Spanish (`es`) translation catalogs across all public, dashboard, institution, and admin interfaces.

---

### Module-by-Module MVP Completion Status

| Platform Module | Specification / ADR | MVP Status | Key Functional Capabilities |
| :--- | :--- | :---: | :--- |
| **Domain & Multi-Tenancy** | ADR 0001, ADR 0008 | **100%** | Multi-tenant isolation for Scholars, Institutions, Admins, and Public visitors; 35 relational tables. |
| **Public Discovery & Gating** | ADR 0007, ADR 0008 | **100%** | Faceted filtering by discipline, tradition, confession, and availability; token-bucket rate limiter; 3-page anonymous scrape defense. |
| **Assisted CV Onboarding** | ADR 0002, ADR 0009 | **100%** | Automated PDF text extraction and Gemini AI parsing for degrees, publications, and disciplines. |
| **Scholar Revision Staging** | ADR 0005 | **100%** | Dual-protection revision state machine: draft edits do not unpublish live public profiles until approved. |
| **Admin Trust Governance** | ADR 0003, ADR 0005 | **100%** | Side-by-side visual diff inspector (`RevisionDiffViewer`), review audit logs, institution accreditation verifier. |
| **Institutional Inquiries** | ADR 0004, ADR 0008 | **100%** | Structured opportunity outreach (adjunct, intensive, guest lecture) with rate limiting and transactional notifications. |
| **AI Faculty Matcher** | ADR 0009 | **100%** | Google Gemini LLM combined with deterministic theological taxonomy heuristic, generating citation-grounded fit scores (0–100%). |
| **Institutional Endorsements** | ADR 0012 | **100%** | Official verified institutional crests (Current Faculty, Former Faculty, Visiting Fellow) distinct from peer commendations. |
| **Speaking Bureau** | ADR 0013 | **100%** | Searchable directory (`/speakers`) with target audience filtering (academic, pastoral, church-wide) and 1-click booking. |
| **Contracts & Milestones** | ADR 0010, ADR 0011 | **100%** | Tiered institutional subscriptions (Basic, Verified, Premier), formal engagement contracts, and milestone payment schedules. |
| **Board Executive Dockets** | ADR 0015 | **100%** | 1-click print-ready search committee dossier generator with candidate tiering and confidential deliberation notes for Trustees. |
| **Confessional Lens Matrix** | ADR 0016 | **100%** | Granular doctrinal compatibility index (0–100%) mapping scholar affirmations against historic confessional standards. |
| **SabbaticalSwap Exchange** | ADR 0017 | **100%** | Bilateral faculty exchange and visiting fellowship marketplace with stipend and housing negotiation workflows. |

---

## 2. Competitive Landscape & Market Positioning

The theological higher education sector has historically relied on fragmented, generic, or manual channels for faculty hiring, adjunct recruitment, and scholarly collaboration.

```
High Confessional Precision
                      ▲
                      │
                      │         ★ FAITHFULL SCHOLARS
                      │         (Theological Niche + AI Matching +
                      │          Confessional Lens + Board Dockets)
                      │
                      │  ETS / SBL Job Boards
                      │  (Static listings, non-interactive)
                      │
                      │
◄─────────────────────┼────────────────────────────────────────►
Low Academic Workflow │                        High Academic Workflow
                      │                        (Shortlists, Contracts,
                      │                         Sabbaticals, Inquiries)
                      │
                      │  HigherEdJobs / Chronicle Vitae
                      │  (Generic higher ed, broad ATS)
                      │
                      │  LinkedIn / Academia.edu / ResearchGate
                      │  (Generic social network, no doctrinal indexing)
                      │
                      ▼
Low Confessional Precision
```

### Detailed Competitor Comparison

| Feature / Dimension | FaithFull Scholars | LinkedIn | Academia.edu / ResearchGate | HigherEdJobs / Chronicle | ETS / SBL Job Boards |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Doctrinal & Confessional Filtering** | **Native & Granular** (Matrix Scoring 0–100%) | ❌ None | ❌ None | ❌ Binary Keyword Only | ⚠️ Manual Text Search |
| **Academic Credential Rigor** | **High** (ATS/ABHE accredited hierarchy) | Low (Self-reported) | Moderate (Paper focus) | High (Job post focused) | High (Static resumes) |
| **Dual-Protection Profile Staging** | **Yes (ADR 0005)** | ❌ No (Live edits only) | ❌ No | ❌ N/A | ❌ N/A |
| **Board of Trustees Search Dockets** | **Native 1-Click Dossier** | ❌ None | ❌ None | ❌ None | ❌ None |
| **Institutional Speaking Bureau** | **Integrated (`/speakers`)** | ❌ None | ❌ None | ❌ None | ❌ None |
| **Sabbatical & Visiting Exchange** | **Integrated (SabbaticalSwap)** | ❌ None | ❌ None | ❌ None | ❌ None |
| **AI Faculty Semantic Matcher** | **Yes (Theological Grounding)** | ⚠️ Generic Recruiter AI | ❌ None | ❌ None | ❌ None |
| **Bilingual Parity (EN / ES)** | **100% Symmetric** | ⚠️ Partial UI | ⚠️ Partial UI | ❌ English Only | ❌ English Only |
| **Anti-Scraping & PII Protection** | **PostgreSQL RLS + Rate Limits** | ⚠️ Walled Garden | ⚠️ Freemium Walls | ⚠️ Traditional ATS | ❌ Open/Unprotected |
| **Contract & Milestone Tracking** | **Built-in Workspace** | ❌ None | ❌ None | ❌ None | ❌ None |

---

## 3. FaithFull Scholars Competitive Moat

FaithFull Scholars establishes an insurmountable competitive moat in theological academia through four core pillars:

### 1. The Confessional Lens & Doctrinal Compatibility Matrix
Generic platforms (LinkedIn, HigherEdJobs) cannot capture the doctrinal nuances required by confessional seminaries and Bible colleges. FaithFull Scholars models historic standards (Westminster Standards, 1689 London Baptist Confession, Three Forms of Unity, Thirty-Nine Articles, Nicene Creed, Lausanne Covenant, Chicago Statement on Inerrancy) with granular subscription weighting and gap analysis.

### 2. Trust-First Revision Staging & Accreditation Guardrails
Tenured and adjunct faculty often hesitate to edit public profiles on open networks for fear of signaling premature career moves. Our **Dual-Protection Staging Engine (ADR 0005)** lets professors experiment with CV updates and course proposals in an isolated draft state reviewed by administrators before public promotion. Furthermore, verified institutional crests (ADR 0012) authenticate ATS, ABHE, TRACS, and regional accreditation relationships.

### 3. End-to-End Academic Recruitment Pipeline
Unlike static job boards (Chronicle Vitae, ETS), FaithFull Scholars manages the complete recruitment lifecycle:
1. Provost/Dean semantic search via **AI Faculty Matcher**.
2. Committee collaboration and shortlisting with **RFC-4180 CSV & Dossier Exports**.
3. **1-Click Board of Trustees Executive Search Dockets** with tiering and confidential deliberation notes.
4. Structured institutional inquiries and **Milestone Engagement Agreements**.

### 4. Pan-American Bilingual Reach (Spanish / English)
The rapid expansion of theological education in Latin America and the Hispanic church in North America requires native bilingual infrastructure. FaithFull Scholars is 100% localized in English and Spanish across all routes, metadata, and communications, unlocking international consortium partnerships.

---

## 4. Current Deployment & Infrastructure Status

| Environment | Host / Provider | Status | URL / Identifier |
| :--- | :--- | :---: | :--- |
| **Production Web App** | Vercel (Next.js 16 App Router) | **Active** | [`https://faithfull-scholars.vercel.app`](https://faithfull-scholars.vercel.app) |
| **Production Database** | Supabase Postgres (`us-east-1`) | **Active** | Project `faithfull-scholars-prod` (`yxrvrjkzlumenlvczqjd`) |
| **Storage Infrastructure** | Supabase Storage (Encrypted) | **Active** | Buckets: `profile-assets`, `cv-files`, `course-documents` |
| **Continuous Integration** | GitHub Actions & Quality Gates | **Active** | Turbopack build, Vitest, Playwright, RLS auditor, Splinter |

---

## 5. Pilot Launch Execution Recommendations

With the MVP completed and verified, the recommended next milestone is the **Phase 1 Pilot Rollout**:

1. **Target Pilot Cohort:**
   - **20–40 Theological Scholars:** Across Biblical Studies, Systematic Theology, Church History, Pastoral Ministry, and Ethics.
   - **3–7 Accredited Seminaries / Colleges:** Representing Reformed, Baptist, Evangelical, and Anglican traditions.
2. **Key Pilot Workflows to Monitor:**
   - Assisted CV onboarding conversion rate.
   - Search committee dossier export utilization during fall hiring cycles.
   - Speaking bureau invitations for spring lecture series and chapel keynotes.
   - Spanish language adoption across Latin American partner faculties.
3. **Operational Readiness:**
   - Admin review console (`/admin/reviews`) staffed for 24-hour turnaround on profile submissions.
   - Automated deployment pre-flight verification (`npm run verify:deploy`) integrated into release workflows.

---

*Report prepared by the Engineering & Architecture Team following the Council Review and Software Factory Baseline.*
