# Council Review 5 — Agent 1: Data & API Audit

**Date**: 2026-09-23  
**Auditor**: Council Agent 1 (Data & API Architect)  
**Scope**: Schema definitions, RLS enforcement, API endpoints, multi-tenant isolation, and ADR 0012 data model.

---

### 1. Schema & Migration Inventory
- **Current Tables**: 34 tables in `public` schema (expanded from 32 with `consortiums` and `consortium_members`).
- **RLS Status**: 100% of tables have `FORCE ROW LEVEL SECURITY`. Total active security policies: 117.
- **Resolved Gaps**:
  - `institution_subscriptions`, `institution_contracts`, and `contract_milestones` now have production seed fixtures in `supabase/seed.sql` and programmatic fixtures in `scripts/seed-pilot-cohort.ts`.
  - Added enterprise checks to `scripts/verify-deployment.ts` and `scripts/verify-pilot-readiness.ts`.

### 2. Candidate Feature Data Architecture: ADR 0012
- Tables created: `public.consortiums` and `public.consortium_members`.
- Covering indexes added:
  - `idx_consortiums_lead_institution`
  - `idx_consortium_members_consortium`
  - `idx_consortium_members_institution`
- Triggers configured with `SET search_path = public, pg_temp` per Splinter 0011.
- Scalar subqueries `(SELECT auth.uid())` implemented for auth evaluation per Splinter 0003.

### 3. API Routes & Endpoint Security
- Audited all 26 Route Handlers across `app/api/**`.
- **Security Finding Resolved**:
  - `POST /api/ai/match-faculty` previously allowed unauthenticated calls with admin privileges.
  - Hardened with authenticated session checks (`createClient()`), institutional account validation (`institution_users`), and subscription tier verification (`verified_seminary` or `premier_partner` required).
- Implemented `GET /api/institution/consortium`, `POST /api/institution/consortium`, `POST /api/institution/consortium/members`, and `DELETE /api/institution/consortium/members` with strict role and lead institution enforcement.

### 4. Verdict & Recommendations
- **Verdict**: PASS with zero critical vulnerabilities.
- Multi-tenant isolation verified across scholar, institution, and consortium boundaries.
