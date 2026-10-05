# Council Review 12 — Synthesis: PR #47 Authorization Lockdown

- **Date:** 2026-10-05
- **Subject:** PR #47 (`fix/authz-lockdown-v2`, ADR 0022), reviewed after the `pr-review` gate fixes (`f5aa370`).
- **Scope note:** This is a **diff-scoped** review of a security PR, not a whole-repo audit. Each agent got its standard mandate, narrowed to #47's changes and the surfaces they touch. Findings outside the diff are listed separately so a reader does not mistake "outside scope" for "reviewed and clean."
- **Seats:** Agents 1–4, Agent 5 (Wildcard, Mode B), and Agent 7 (Stakeholder & Trust Lens, defined in PR #48). Agent 6 (Documenter) runs after approval.
- **CI state verified by the synthesizer:**
  - Branch run `37296760484`: green, 54/54 test files, both migrations applied, `audit:rls` and `audit:security` pass.
  - Probe without `20261005090000`: 5/5 escalation tests fail, including the `accounts.role = 'admin'` self-grant. The vulnerability is real on `main`, and the tests catch it.
  - Probe without `20261004120000`: fails with `infinite recursion detected in policy for relation "institution_users"`.
  - **Note:** both audits passed on the vulnerable probe database. They check that policies *exist*, not what they *permit*.

## 1. Cross-agent consensus

| # | Finding | Agents | Verified by synthesizer | Severity |
|---|---|---|---|---|
| C-1 | Same bug class, uncovered tables. UPDATE/INSERT policies authorize rows but not columns or state transitions, and do not require an approved institution. Examples below. | 1, 7, 5 | ✅ policy text and route code | **Critical** |
| C-2 | Self-signup tells existing institutions' staff to "ask its administrator to invite you", but no invite flow exists. Similar names collide. | 3, 4, 7 | ✅ `lib/auth/auth-actions.ts` | Important |
| C-3 | Signed-in non-members visiting `/institution` get a bare 404. The admin layout and triage page show a 200 "Access Restricted" card, while `requireStaffPage` returns 404. | 2, 3 | ✅ | Minor |
| C-4 | Users with more than one institution membership: `institutionIds[0]` is picked without ordering, and `.maybeSingle()` on `institution_users` errors in several routes. | 2, 1, 3 | ✅ | Minor |
| C-5 | Demo or fixture data is served as real. The AI matcher always prepends three fictional `SEED_CANDIDATES`, in production too. `/institution/saved` renders hard-coded scholars and toggles their IDs. `/institution` and `/dashboard` show static fake metrics. Conferences run in memory. | 7, 3, 2, 4 | ✅ `match-faculty/route.ts:262`; `saved/page.tsx` | Important (matcher: integrity) |

C-1 in detail:
- **`institution_subscriptions`:** any member, including a member of a pending institution, can set `tier` and the limits. `POST /api/institution/subscription/upgrade` does exactly this with no payment and no owner check. ✅ verified (`20260922000000:56-73`).
- **`institution_contracts`:** an institution can set `status = 'accepted'` (the scholar's decision), and a scholar can rewrite compensation. INSERT checks only membership. ✅ verified (`:156-196`).
- **`course_licensing_agreements`:** an institution can set itself `active` or "signed by scholar", and INSERT does not check that the course belongs to the scholar. Agent 1, not independently re-read.
- **`institution_endorsements`:**
  - The route sets `is_credential_verified = true` for any owner or admin member, even of a pending institution.
  - Direct PostgREST insert or update can set it as well.
  - The default is already `false` (`20260921110000:87`), so Agent 1's "default true" is outdated.
- **Consortium tables:** any member can create a consortium or add any institution as an active member. Agent 1.

## 2. In-scope defects in #47 itself

| # | Finding | Agent | Verified | Severity |
|---|---|---|---|---|
| P-1 | `private.is_restricted_caller()` relies only on `auth.role()`. A session that runs `SET ROLE authenticated` without JWT claims is treated as unrestricted. PostgREST always sets claims, so this is reachable only via custom connections. It is a fail-open default. | 1 | ✅ by reading | Important |
| P-2 | `guard_inquiries` lets a party move `accepted`/`declined` back to `pending`. `guard_institutions` INSERT does not check `accreditation_body`. | 1 | ✅ | Minor |
| P-3 | Missing tests: admin positive path (admin *can* approve), service-role or `postgres` bypass, `accounts` INSERT with `role = 'admin'`, inquiry INSERT to a non-approved scholar, `anon` against the triggers, and the missing-claims case. | 1 | ✅ | Important |
| P-4 | `/dev/status` keeps a `NODE_ENV === 'development'` bypass. That is acceptable for `next dev`, but ADR 0022 says "no environment-based authorization bypasses." | 2 | ✅ | Minor (fix the wording) |
| — | Agent 1's `inquiries.response_notes` concern: **refuted**. No such column exists. | 1 | ❌ | — |

## 3. Adjacent findings (outside the diff, surfaced by this review)

| # | Finding | Agent | Verified | Severity |
|---|---|---|---|---|
| A-1 | **Open redirect** in `app/auth/callback/route.ts:7,13`: `new URL(next, origin)` with an unvalidated `next` (`//evil.com`) sends users off-site after login. Useful for phishing. | 2 | ✅ | **Important (security)** |
| A-2 | Route handlers still return raw `err.message`. Affected areas: contracts, licensing, subscription, dashboard contracts and licensing, scholar endorsements, and postings GET. | 2 | Agent's list | Important |
| A-3 | Scholar draft and submit never reach the database: `/dashboard/profile` writes to `sessionStorage` only. No scholar can reach admin review without seeded data. | 4 | Agent | Important (product) |
| A-4 | Express-interest always fails under RLS (known). The README still advertises it, the applicant matrix, and conferences as shipped. | 4, 7 | ✅ known | Important (docs honesty) |
| A-5 | Theological integrity and privacy in the AI matcher. Agent 7 found four problems: <ul><li>It scores "doctrinal fit", including "confessional orthodoxy" wording.</li><li>The heuristic hard-codes Reformed and Baptist keywords.</li><li>It sends names, confessions, and traditions (GDPR Art. 9 special-category data) to Gemini with no disclosure or consent flow.</li><li>The API key is in the URL query string.</li></ul> | 7 | Agent | Important — belongs to the GDPR build |
| A-6 | Inquiry `contact_email` is client-supplied, so it could impersonate another institution's address. The rate limiter is in-memory and is bypassed by direct inserts. | 7 | ✅ known | Important |
| A-7 | No audit trail is recorded for privileged decisions. The triggers block self-grants but log nothing. | 7 | Agent | Minor |
| A-8 | **Operational:** C1 (admin self-grant) was live on `main` and on the linked hosted project. Rows changed before #47 deploys are not detected. | 4 | — | **Critical (ops)** |

## 4. Wildcard proposals (Agent 5)

1. **Generated policy matrix (recommended).**
   - For every table, column, and role (`anon`, scholar, institution member, other-tenant member, admin), attempt INSERT, UPDATE, and DELETE as a real role inside a rolled-back transaction.
   - Compare the results against a committed allow-list (`tests/security/policy-matrix.json`).
   - Any undeclared write fails CI, and so does any new column with no declaration.
   - This would have caught C1 from #47, and every C-1 table here, mechanically.
   - It reuses the harness in `rls-authenticated.test.ts`.
   - First step: the 4 tables #47 already guards, proven to fail without the guard.
2. **Default-deny column grants:** `REVOKE UPDATE` on the table, then `GRANT UPDATE (cols…)`. A new column is then unwritable by default, so a forgotten guard fails closed. Keep triggers for state-machine rules.
3. **Import-time wall:** an ESLint `no-restricted-imports` rule for `createAdminClient`, with a named allow-list, plus a CI regex that fails on migrations adding `FOR UPDATE`/`FOR ALL` without `WITH CHECK`.

Unspoken assumptions behind the bug class:
- "Row ownership means authorization." Policies answer *which rows*, never *which columns* or *which transitions*.
- "A check that exists is a check that guards."

**Synthesizer evaluation:** proposals 1 and 3 are cheap and high-leverage. Proposal 2 is sound, but every `.update()` caller must be audited first, so it should come after the matrix exists to catch regressions.

## 5. Readiness (Agent 4, adjusted)

- **Merge #47:** high once P-1–P-3 and A-1 are fixed. Agent 4's deduction for "unverified CI" does not apply: CI and both probes are verified above.
- **Production launch:** low (Agent 4: 25/100). Scholar self-service, express-interest, invitations, demo data, the rate limiter, and GDPR/encryption are all outstanding.

## 6. Proposed change sequence (for human approval)

### Prompt A — #47 in-scope fixes (before merge)
- **Files:**
  - `supabase/migrations/20261005090000_protect_trust_columns.sql` (still unmerged, so it can be amended)
  - `tests/integration/rls-authenticated.test.ts`
  - `app/auth/callback/route.ts`
  - `lib/auth/auth-actions.ts`
  - ADR 0022
- **Work:**
  1. Make `is_restricted_caller` also return true when `current_user IN ('anon','authenticated')` (fail closed) (P-1).
  2. Allow only the recipient scholar or an admin to move a status out of `accepted`/`declined`, and guard `accreditation_body` on INSERT (P-2).
  3. Add the missing real-role tests (P-3).
  4. Restrict the callback's `next` to a same-origin relative path, with a unit test (A-1).
  5. Replace the "ask its administrator to invite you" message with an honest one that gives a support contact (C-2, interim).
  6. Fix the ADR wording on `/dev/status` (P-4).
- **Verification:** lint, unit, a CI integration run, and a probe proving the new tests fail without the fixes.

### Prompt B — Trust guards, phase 2 (new PR after #47)
- **ADR:** 0023
- **Scope:** close C-1 on subscriptions, contracts, licensing, endorsements, and consortiums using the #47 trigger pattern, plus an approved-institution requirement. Make subscription upgrades admin- or billing-only.
- **Gate:** land the Wildcard's policy matrix (Proposal 1) in the same PR, starting with these tables and the four from #47.

### Prompt C — Hygiene (small PR)
- Generic errors in the routes listed in A-2.
- Gate the AI-matcher `SEED_CANDIDATES` to `next dev`.
- Friendly non-member page, and consistent admin denial (C-3).
- Deterministic institution choice, with no `.maybeSingle()` on memberships (C-4).
- Add the ESLint service-role import wall (Wildcard Proposal 3).

### Prompt D — Operational, human action (immediately, independent of merges)
- On the hosted Supabase project, list `accounts` with `role = 'admin'`, and institutions or scholars whose approval has no matching admin review.
- Confirm *Exposed schemas* excludes `private` before deploying #47.
- Until #47 is deployed, consider disabling public signup.

### Roadmap (not in this cycle)
- Scholar draft/submit persistence (A-3).
- Express-interest application model (A-4).
- Institution invitations (C-2).
- Persistent rate limiter (A-6).
- AI-matcher theological-integrity and GDPR redesign (A-5).
- Audit log (A-7).
- README honesty pass (A-4), done by the Documenter.

## 7. Outcome (Documenter, 2026-10-05)

**Owner decision:** the owner approved the A, B, C sequence. Prompt D awaits a hosted-project DB connection string from the owner.

**Prompt A, applied in PR #47:**
- `private.is_restricted_caller` fails closed, and the guard triggers run as `SECURITY INVOKER` (P-1).
- Only the recipient scholar or an admin can reopen an accepted or declined inquiry; `accreditation_body` is guarded on institution INSERT (P-2).
- Missing real-role tests added (P-3).
- `/auth/callback` `next` restricted to a same-origin relative path, with a unit test (A-1).
- Signup no longer promises an invitation flow (C-2, interim).
- ADR 0022 wording on `/dev/status` corrected (P-4).

**Verification (session owner):**
- CI run `37360500352` on `fix/authz-lockdown-v2`: green, 55/55 test files, migrations `20261004120000` and `20261005090000` applied, `audit:rls` and `audit:security` pass.
- Without `20261004120000`: `infinite recursion detected in policy for relation "institution_users"`, and 6 of 9 RLS tests fail.
- Without `20261005090000`: 5/5 escalation tests fail, including the `accounts.role = 'admin'` self-grant.
- With the pre-Council-12 version of `20261005090000`: exactly the fail-closed and inquiry-reopen tests fail.
- `audit:rls` and `audit:security` passed on all of these vulnerable probe databases, so they verify that policies exist, not what they permit.

**Remaining:**
- **B (separate PR, ADR 0023):** trust guards phase 2 for subscriptions, contracts, licensing, endorsements, and consortiums, plus the generated policy-matrix gate (C-1). C-1 stays open and Critical until it merges.
- **C (separate PR):** hygiene (A-2 error messages, gate `SEED_CANDIDATES`, non-member page and admin denial consistency, deterministic institution choice, service-role import wall).
- **D (owner action):** hosted-project checks (admin rows, unreviewed approvals, *Exposed schemas* excludes `private`, consider disabling signup until deployed). A-8 stays open until done.
- **Roadmap:** scholar draft persistence, express-interest model, invitations, persistent rate limiter, AI-matcher integrity/GDPR, audit log.
- **README honesty pass (A-4):** done in this close-out. README and the plan now mark express-interest, the applicant matrix, the conference hub, the AI matcher seed candidates, and sessionStorage-only scholar drafts as known-broken or demo-only.
