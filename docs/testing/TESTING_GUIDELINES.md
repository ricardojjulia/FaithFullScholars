# FaithFull Scholars Testing Guidelines & Full-Scope Quality Standards

This document defines the mandatory testing standards, architectural guardrails, and quality gates for the FaithFull Scholars platform. All features, modifications, and enhancements must comply with these guidelines prior to merge.

---

## 1. Testing Philosophy & Non-Negotiables

1. **Multi-Tenant Data Isolation is Enforced at the Data Layer:**
   - PostgreSQL Row Level Security (RLS) policies in Supabase are the primary line of defense.
   - Application-layer checks (`WHERE tenant_id = ...`) are defense-in-depth, never the sole barrier.
   - Every table with private or tenant-owned data (`institution_contracts`, `scholar_profile_revisions`, `inquiries`, `saved_scholars`) must be covered by integration tests that attempt cross-tenant reads and ID tampering.

2. **100% Translation Parity (Zero UI Language Mixing):**
   - Every user-facing UI string must be localized via `useTranslation()` from `@/lib/i18n`.
   - `lib/i18n/messages/en.json` and `lib/i18n/messages/es.json` must maintain strict key symmetry across all namespaces (`nav`, `user_menu`, `search`, `directory`, `courses`, `speakers`, `opportunities`, `contracts`, `subscriptions`, `profile`, `dashboard`, `onboarding`, `admin`, `inquiry`, `institution`, `footer`, `common`).
   - Unit tests (`tests/unit/translation.test.ts`) and browser E2E tests (`tests/e2e/translation-and-locale.spec.ts`) verify catalog parity and live UI switching.

3. **Full-Scope User Journey Coverage:**
   - Every role (Scholar, Institution Dean/Recruiter, Administrator, Public Visitor) must have end-to-end journey tests covering:
     - Onboarding & Registration
     - Navigation & Deep Linking
     - Reading & Querying
     - Updating Information & State Transitions
     - Dispatching Requests & Contracts

---

## 2. Test Architecture & Directory Structure

```
tests/
├── unit/                                  # Pure business logic, helpers, and i18n catalogs
│   ├── translation.test.ts                # Strict EN/ES key symmetry & namespace parity
│   └── ...
├── integration/                           # Database & API security guardrails
│   ├── security-guardrails-and-rls.test.ts # Multi-tenant RLS isolation, ID tampering, quotas
│   ├── auth-flow.test.ts                  # Supabase auth session & cookie management
│   └── ...
└── e2e/                                   # Playwright browser-based user journey tests
    ├── translation-and-locale.spec.ts     # Live language toggle & zero mixed-language UI
    ├── scholar-full-journey.spec.ts       # Scholar onboarding, profile editor, contracts
    ├── institution-full-journey.spec.ts   # Directory search, shortlist, inquiry, contracts
    ├── admin-full-journey.spec.ts         # Moderation queue, revision diffs, triage
    ├── auth-journeys.spec.ts              # Login, role registration, password recovery
    ├── public-discovery.spec.ts           # Faculty directory, course catalog, SEO hubs
    ├── speaker-discovery.spec.ts          # Theological speaking bureau discovery
    └── subscriptions-and-contracts.spec.ts# Tier quotas and institutional engagement
```

---

## 3. Test Layers & Execution Standards

### Layer 1: Unit & Translation Tests (Vitest)
- **Scope:** Fast, isolated checks for translation catalog synchronization, date utilities, currency formatting, and schema validation.
- **Run Command:**
  ```bash
  npm run test tests/unit/
  ```

### Layer 2: Security Guardrails & Integration Tests (Vitest + PostgreSQL)
- **Scope:** Runs against live local or test Supabase Postgres database.
- **Assertions:**
  - **Cross-Tenant Privacy:** Institution A cannot select or mutate Institution B contracts or shortlists.
  - **Scholar Draft Isolation:** Scholar A cannot view or tamper with Scholar B's unpublished revisions.
  - **Public Visibility Boundary:** Only `profile_status = 'approved'` profiles are discoverable publicly.
  - **Quota Enforcement:** Institutions with exhausted inquiry limits cannot dispatch outreach messages.
- **Run Command:**
  ```bash
  npm run test tests/integration/
  ```

### Layer 3: Browser-Based End-to-End Tests (Playwright)
- **Scope:** Full user journeys in headless Chrome with authentic DOM rendering, hydration, and routing.
- **Assertions:**
  - Navigation links in `PublicNav` and `UserMenu` transition between pages without 404s.
  - Forms validate inputs and transition state.
  - Language toggle immediately switches headings, labels, and menus to target locale.
- **Run Command:**
  ```bash
  npm run test:e2e
  ```

### Layer 4: Automated Security & RLS Audits
- **Scope:** Verifies that RLS is enabled on 100% of public tables and policies are actively bound.
- **Run Commands:**
  ```bash
  npm run audit:rls
  npm run audit:security
  ```

---

## 4. Quality Checklist for Adding New Features

When creating or modifying a feature, every engineer/agent must complete this checklist:

1. [ ] **Translation Catalog Update:** Add new keys symmetrically to both `lib/i18n/messages/en.json` and `lib/i18n/messages/es.json`.
2. [ ] **Component Localization:** Wrap all user-facing strings with `t('namespace.key')`.
3. [ ] **Unit / Translation Verification:** Run `npm run test tests/unit/translation.test.ts`.
4. [ ] **Database & RLS Guardrail:** If a new table or column is added, write a security test asserting tenant-scoped isolation.
5. [ ] **E2E Journey Test:** Add or update a Playwright test under `tests/e2e/` verifying the user interaction path.
6. [ ] **Pre-Merge Verification:** Run the full quality suite:
   ```bash
   npm run lint
   npm run test
   npm run audit:rls
   npm run test:e2e
   npm run build
   ```
