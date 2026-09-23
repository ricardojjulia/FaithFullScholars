# Council Review 4 — Agent 1: Data & API State Audit

> **Date:** September 22, 2026  
> **Auditor:** Council Agent 1 (Data & API Architect)  
> **Status:** READ-ONLY AUDIT COMPLETE  
> **Target Scope:** Item 1 (Live Pilot Launch Readiness) & Item 2 (Tiered Subscriptions & Booking Contracts Workflow)

---

## 1. Schema & Migrations Inventory

The repository currently defines 29 public tables across migrations in `supabase/migrations/`:
1. `accounts` (RLS: Enabled, 2 policies)
2. `availability_profiles` (RLS: Enabled, 2 policies)
3. `confessional_standards` (RLS: Enabled, 4 policies)
4. `course_disciplines` (RLS: Enabled, 5 policies)
5. `courses` (RLS: Enabled, 2 policies)
6. `credentials` (RLS: Enabled, 2 policies)
7. `disciplines` (RLS: Enabled, 4 policies)
8. `inquiries` (RLS: Enabled, 3 policies)
9. `institution_endorsements` (RLS: Enabled, 5 policies)
10. `institution_postings` (RLS: Enabled, 6 policies)
11. `institution_users` (RLS: Enabled, 2 policies)
12. `institutions` (RLS: Enabled, 3 policies)
13. `media_links` (RLS: Enabled, 2 policies)
14. `pilot_feedback` (RLS: Enabled, 2 policies)
15. `pilot_feedback_rate_limits` (RLS: Enabled, 1 policy)
16. `profile_reviews` (RLS: Enabled, 3 policies)
17. `publications` (RLS: Enabled, 2 policies)
18. `reports` (RLS: Enabled, 2 policies)
19. `saved_courses` (RLS: Enabled, 2 policies)
20. `saved_scholars` (RLS: Enabled, 2 policies)
21. `scholar_confessions` (RLS: Enabled, 4 policies)
22. `scholar_disciplines` (RLS: Enabled, 4 policies)
23. `scholar_endorsements` (RLS: Enabled, 6 policies)
24. `scholar_profile_revisions` (RLS: Enabled, 3 policies)
25. `scholar_traditions` (RLS: Enabled, 4 policies)
26. `scholars` (RLS: Enabled, 3 policies)
27. `search_rate_limits` (RLS: Enabled, 4 policies)
28. `speaker_topics` (RLS: Enabled, 6 policies)
29. `traditions` (RLS: Enabled, 4 policies)

### New Data Layer Requirements:
- **`public.institution_subscriptions`**: Required to track institutional subscription tiers (`basic`, `verified_seminary`, `premier_partner`), allocated search committee seats, monthly inquiry quotas, and renewal timestamps.
- **`public.institution_contracts`**: Required to formalize agreements stemming from inquiries/opportunities, tracking scope of work, honorarium/compensation terms, and lifecycle states (`draft`, `offered`, `accepted`, `in_progress`, `completed`, `cancelled`).
- **`public.contract_milestones`**: Required to track deliverables, milestones, deadlines, and milestone sign-offs.

---

## 2. Lib & Server Utilities

- `lib/subscriptions/` (New): `subscription-service.ts` to manage quota evaluation, tier upgrades, and feature access gates.
- `lib/contracts/` (New): `contract-service.ts` to handle contract creation, milestone updates, role-scoped signing transitions, and audit logs.
- `lib/inquiries/inquiry-service.ts`: Integrates smoothly as the upstream trigger for contract drafting.
- `lib/postings/postings-service.ts`: Connects academic appointments with formal offer generation.

---

## 3. API Routes & Role Requirements

| Route Handler | Method | Auth / Role Requirement |
| :--- | :--- | :--- |
| `/api/institution/subscription` | GET | `institution_user` (Scoped to own institution) |
| `/api/institution/subscription/upgrade` | POST | `institution_user` (Admin or authorized member) |
| `/api/institution/contracts` | GET, POST | `institution_user` (Draft and list institutional contracts) |
| `/api/institution/contracts/[id]` | GET, PATCH | `institution_user` or assigned `scholar` |
| `/api/institution/contracts/[id]/transition` | POST | `institution_user` or `scholar` (state-dependent) |
| `/api/dashboard/contracts` | GET | `scholar` (View assigned engagement contracts) |
| `/api/dashboard/contracts/[id]/accept` | POST | `scholar` (Formally accept or decline terms) |

---

## 4. Critical Gaps & Security Audit

1. **Multi-tenant Isolation**: Contracts must enforce strict bidirectional isolation — visible only to the offering institution and the recipient scholar, plus system admins.
2. **Quota Enforcement**: Institution inquiry limits and seat counts must be backed by subscription tier state at the server boundary.
3. **Covering Indexes**: All foreign keys (`institution_id`, `scholar_id`, `contract_id`) must have covering B-tree indexes to satisfy Splinter 0001.
4. **Function Search Path**: Stored procedures and triggers must have explicit `SET search_path = public, pg_temp` to satisfy Splinter 0011.
5. **Data Protection**: Financial and contractual terms must never be exposed via public search surfaces or unauthenticated endpoints.
