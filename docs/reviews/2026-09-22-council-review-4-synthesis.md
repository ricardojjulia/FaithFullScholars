# Council Review 4 — Synthesis & Change Management Plan

> **Date:** September 22, 2026  
> **Council Participants:** Agents 1–4, synthesized per `improve-software.md` §3  
> **Primary Objective:** Deliver Item 1 (Live Pilot Launch Readiness Verification) and Item 2 (Tiered Institutional Subscriptions & Booking Contracts Workflow), marking remaining post-MVP items for follow-up.

---

## 1. Cross-Agent Consensus

1. **Subscriptions & Quotas (ADR 0010):**
   - Introduce `institution_subscriptions` table managing membership tiers (`basic`, `verified_seminary`, `premier_partner`), monthly inquiry allowances, search rate limits, and search committee seat allotments.
   - Enforce 100% RLS so only verified institutional members inspect subscription telemetry.
2. **Institutional Engagement Contracts (ADR 0011):**
   - Introduce `institution_contracts` and `contract_milestones` tables to support formal agreements for adjunct courses, modular intensives, guest lectures, curriculum reviews, and speaking engagements.
   - Support lifecycle transitions: `draft` → `offered` → `accepted` → `in_progress` → `completed` (or `declined` / `cancelled`).
3. **Follow-Up Backlog Tracking:**
   - Explicitly document remaining post-MVP features (*Course Licensing, Credential Verification, Seminary Consortium Accounts, Premium Scholar Profiles*) as deferred for subsequent platform releases.

---

## 2. ADR Definitions

- **ADR 0010**: `Tiered Institutional Subscriptions & Quota Enforcement`
- **ADR 0011**: `Institutional Engagement Contracts & Milestone Workflow`

---

## 3. Implementation Prompts for Software Factory

### Prompt A — Database Migrations & Security Hardening
- Create migration `supabase/migrations/20260922000000_institutional_subscriptions_and_contracts.sql` creating `institution_subscriptions`, `institution_contracts`, and `contract_milestones`.
- Add RLS policies, covering foreign key indexes (Splinter 0001), and pinned search path triggers (Splinter 0011).

### Prompt B — Domain Services & Types
- Implement `lib/subscriptions/types.ts` & `lib/subscriptions/subscription-service.ts`.
- Implement `lib/contracts/types.ts` & `lib/contracts/contract-service.ts`.

### Prompt C — API Endpoints
- Implement `/api/institution/subscription`, `/api/institution/subscription/upgrade`.
- Implement `/api/institution/contracts`, `/api/institution/contracts/[id]`, `/api/institution/contracts/[id]/transition`.
- Implement `/api/dashboard/contracts`, `/api/dashboard/contracts/[id]/accept`.

### Prompt D — UI Shells & Components
- Implement `/institution/subscription` quota & tier management view.
- Implement `/institution/contracts` & `/institution/contracts/[id]` drafting and milestone management.
- Implement `/dashboard/contracts` scholar engagement review and signing interface.
- Update `InstitutionSubNav` and `DashboardSubNav`.

### Prompt E — Tests & Documentation Close-Out
- Unit tests (`institution-subscriptions.test.ts`, `institutional-contracts.test.ts`).
- Integration tests (`contracts-and-subscriptions.test.ts`).
- Update `docs/FAITHFULL_SCHOLARS_FULL_PLAN.md`, `docs/product/roadmap.md`, `README.md`, and `CHANGELOG.md`.
