# FaithFull Scholars — Production Release Readiness Checklist (Phase 6 MVP)

> **Specification & Architecture:** [`docs/FAITHFULL_SCHOLARS_FULL_PLAN.md`](../FAITHFULL_SCHOLARS_FULL_PLAN.md) §18 (Phases 7 & 8)  
> **Deployment Architecture:** [`docs/deployment/vercel-supabase.md`](vercel-supabase.md) & [ADR 0004](../adr/0004-vercel-supabase-platform.md)  
> **Security Mandate:** 100% PostgreSQL Row Level Security (RLS) enforcement across all tables with zero client-side secret leakage.

---

## 1. Executive Summary

This release checklist serves as the authoritative pre-flight gate before promoting FaithFull Scholars to public production on Vercel and Supabase. Every item in this checklist must be verified and signed off prior to opening the platform to the initial pilot cohort (20–40 scholars, 3–7 accredited theological institutions).

---

## 2. Pre-Flight Verification Gates

### A. Database & Multi-Tenant Data Isolation (PostgreSQL / Supabase)

- [ ] **RLS Enforcement (100% Coverage):**
  - Run `npm run audit:rls` against the target database.
  - All 25 production tables must return `PASS` with RLS explicitly enabled:
    - `accounts`, `scholars`, `scholar_profile_revisions`, `profile_reviews`, `disciplines`, `traditions`, `confessional_standards`, `scholar_confessions`, `academic_credentials`, `academic_publications`, `courses`, `media_links`, `availability`, `institutions`, `institution_inquiries`, `institution_memberships`, `saved_scholars`, `saved_courses`, `rate_limit_buckets`, `content_reports`, `error_telemetry`, `feedback_items`, `audit_logs`, `pilot_invitations`, `app_settings`.
- [ ] **Migration Synchronization:**
  - Verify that all migrations in `supabase/migrations/` have been applied in ascending order.
  - Confirm `supabase migration list` shows zero unapplied migrations on the target instance.
- [ ] **Seed Data Baseline:**
  - Standard theological taxonomy loaded:
    - 9 primary theological disciplines (`Old Testament`, `Systematic Theology`, `Church History`, etc.).
    - 5 historic confessional standards (`Westminster Confession of Faith`, `1689 London Baptist Confession`, `Nicene Creed`, `Thirty-Nine Articles`, `Chicago Statement on Biblical Inerrancy`).
    - Core traditions (`Reformed & Presbyterian`, `Confessional Baptist`, `Anglican & Episcopalian`, `Lutheran`, `Methodist & Wesleyan`).
  - Pilot cohort accounts and baseline test fixtures provisioned.

### B. Supabase Storage Security & Public/Private Buckets

- [ ] **Storage Bucket Access Policies:**
  - `profile-photos`: Public read access enabled; authenticated upload restricted to owning scholar ID.
  - `cv-files`: Public read access restricted (only published or shared revisions); write access restricted to profile owner.
  - `syllabi`: Public download allowed only when associated course has `public_preview_enabled = true`.
  - Max file upload size enforced at 15MB.
  - MIME types restricted to `application/pdf`, `image/jpeg`, `image/png`, `image/webp`.

### C. Edge Security Headers & Network Protections

- [ ] **Strict HTTP Security Headers ([`next.config.ts`](../../next.config.ts)):**
  - `Content-Security-Policy (CSP)`: Restricted script/style execution; whitelisted image sources (Supabase Storage, Gravatar, Unsplash); frame sources restricted to YouTube (`https://www.youtube.com`, `https://www.youtube-nocookie.com`).
  - `Strict-Transport-Security (HSTS)`: `max-age=63072000; includeSubDomains; preload`.
  - `X-Frame-Options`: `DENY` (prevents clickjacking).
  - `X-Content-Type-Options`: `nosniff` (prevents MIME type sniffing).
  - `Referrer-Policy`: `strict-origin-when-cross-origin`.
  - `Permissions-Policy`: `camera=(), microphone=(), geolocation=()`.
  - `frame-ancestors`: `'none'`.
- [ ] **Rate Limiting & Anti-Scraping Defenses ([ADR 0008](../adr/0008-search-abuse-gating-anti-scraping-and-pii-protection.md)):**
  - Anonymous search limited to 15 queries/minute.
  - Verified institution search granted 120 queries/minute.
  - Anonymous directory browsing capped at 3 pages (max 18 scholars) before requiring sign-in.
  - Institutional inquiry dispatch rate-limited to 10 inquiries/hour per institution.

### D. Environment Variables & Secret Quarantine

- [ ] **Client vs. Server Variable Separation:**
  - Verify that `SUPABASE_SERVICE_ROLE_KEY` is **NEVER** prefixed with `NEXT_PUBLIC_`.
  - Run bundle inspection (`npm run build`) to ensure zero service role keys or database connection strings leak into client-side JS bundles.
  - Production Environment Variables configured in Vercel:
    ```env
    # Public Client Variables
    NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=<public-anon-key>
    NEXT_PUBLIC_SITE_URL=https://faithfullscholars.org

    # Server-Only Variables (Quarantined)
    SUPABASE_SERVICE_ROLE_KEY=<service-role-secret>
    DATABASE_URL=postgresql://postgres:<password>@db.<project-id>.supabase.co:5432/postgres
    RESEND_API_KEY=re_<secret-key> # Or transactional SMTP credentials
    ADMIN_NOTIFICATION_EMAIL=admin@faithfullscholars.org
    ```

### E. Quality Gates & Automated Verification

- [ ] **Full 6-Gate Test Pass (`npm run verify`):**
  1. `version:check` — Confirms Node.js >= 20.
  2. `lint` — Next.js ESLint passes with 0 warnings/errors.
  3. `typecheck` — TypeScript compiler passes with 0 type errors.
  4. `test` — Full Vitest test suite passes (including unit, integration, and E2E user journeys).
  5. `audit:rls` — PostgreSQL live RLS audit script passes across all 25 tables.
  6. `build` — Next.js production build succeeds with Turbopack.

---

## 3. Rollout & Pilot Launch Procedure

1. **Staging Smoke Test:**
   - Deploy build artifact to Vercel Preview environment.
   - Run diagnostic script: `npx tsx scripts/verify-pilot-readiness.ts`.
   - Verify health check route responds `HTTP 200`.
2. **Production Database Verification:**
   - Execute dry-run RLS verification against production pooler:
     ```bash
     DATABASE_URL="<PROD_URL>" npm run audit:rls
     ```
3. **Domain & SSL Finalization:**
   - Verify DNS CNAME pointing to `cname.vercel-dns.com`.
   - Confirm automatic Let's Encrypt TLS certificate issuance with HTTP/2 and HTTP/3 support.
4. **Pilot Scholar Onboarding:**
   - Issue invite links to the 5 initial reference pilot scholars.
   - Assist in CV onboarding and review first batch of revision submissions in `/admin/reviews`.
