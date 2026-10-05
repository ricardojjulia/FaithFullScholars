# Run Report — 2026-10-04: Authorization Lockdown (ADR 0022)

## 1. Run Metadata
- **Base:** `main` @ `e3da2fa`
- **Branch:** `fix/authz-lockdown-v2`
- **Supersedes:** PR #46 (`fix/lockdown-authz-service-role`). That PR was built against a stale local `main` (`3283b5a`, 55 commits behind) and conflicted. It was re-ported, and its findings were re-verified against current `main`.

## 2. Intent
Close authorization and tenant-isolation defects found in a codebase review before the production build (GDPR, encryption). The owner approved one corrective migration and no other schema changes.

## 3. Findings Addressed
| # | Finding (on `e3da2fa`) | Severity | Fix |
|---|---|---|---|
| 1 | Institution self-signup matched institutions by name with the service role and used the free-text role title as the membership role, allowing anyone to become `owner` of an existing approved institution | Critical | Self-signup only creates a new pending institution; an existing name is rejected before `auth.signUp` |
| 2 | Admin pages (`reviews`, `reviews/[id]`, `reports`, `institutions`) loaded service-role data with only a layout guard, which does not stop page rendering or the RSC payload | Critical | `requireStaffPage()` in each page |
| 3 | Outside production, or with `ENABLE_DEV_ROUTES=true`, shortlist, saved-course, and export routes accepted an anonymous caller's `institutionId` or a seed default (service role) | High | Session identity plus membership; RLS-scoped client |
| 4 | Institution pages defaulted to a seed institution for anonymous visitors; `/institution/postings/[id]/applicants` exposed applicant reports | High | `requireInstitutionMember()` before fetching |
| 5 | `verifyStaffUser` and `/dev/status` honoured self-editable `user_metadata.role` | High | Role from `public.accounts` |
| 6 | `NODE_ENV` / `ENABLE_DEV_ROUTES` admin bypasses; `PATCH /api/inquiries/[id]` skipped auth when `NODE_ENV !== 'production'` | High | Removed |
| 7 | `is_admin()` and `get_current_scholar_id()` still recursed; the `FOR ALL` `institution_users` policy self-referenced (incomplete fix in `20260921110000`) | High | Migration `20261004120000` |
| 8 | New-institution signup inserted a non-existent `type` column and omitted the required `contact_email` | Medium (broken feature) | Fixed in #1 |
| 9 | *(found by `pr-review`, 2026-10-05)* UPDATE policies restrict rows, not columns. Any signed-in user could set `accounts.role = 'admin'`, approve or verify their own scholar profile or institution, or accept or rewrite inquiries as an institution. The inquiry INSERT policy did not require approval. The admin self-grant was live on `main`. | Critical | Migration `20261005090000` (column-guard triggers plus an approval-checking INSERT policy); real-role escalation tests |
| 10 | *(pr-review)* Guard-less data-loading pages: institution contracts, contract detail, subscription, consortium, licensing; scholar contracts, licensing | Important | Page guards |
| 11 | *(pr-review)* `getPostingApplicantReport` had an optional tenant scope over the service role; `updateApplicantReviewStatus` was an unscoped service-role write with no callers | Important | Scope required; dead function removed |
| 12 | *(pr-review)* Scholar signup wrote non-existent columns, ignored errors, and reported success. Signup failures left orphaned logins. `accounts.upsert` could rewrite an existing role. Empty institution slug was accepted. | Important | Checked inserts with rollback; correct columns; slug validation |
| 13 | *(pr-review)* `user_metadata.role` in feedback telemetry; ATS seed candidates could be served in production via `ENABLE_DEV_ROUTES` | Minor | Removed; local `next dev` only |

## 4. Architecture Impact
- ADR 0022: session-derived identity; page-level guards; RLS helpers as `SECURITY DEFINER` functions in a non-exposed `private` schema.
- `lib/inquiries/*` and `fetchATSAccreditationReport` now take a `SupabaseClient` parameter. Business-flow integration tests pass the service-role client explicitly.

## 5. Verification
| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ |
| `eslint .` | ✅ 0 errors |
| Unit tests | ✅ all pass (see PR for counts) |
| Mutation checks | ✅ authorization tests fail on old routes and auth; page-guard tests fail on `main`'s pages; signup tests fail on `main`'s signup |
| `next build` | ✅ (from a local-disk copy; Turbopack's cache cannot `fsync` on the shared volume) |
| Migration on Postgres | ✅ PR #46 CI applied it, and 9/9 `rls-authenticated` tests, `audit:rls`, and `audit:security` passed |
| RLS test fails without the migration | See the CI probe result recorded in the PR (`ci-probe/rls-without-migration`) |
| Integration tests on this branch | ⏳ CI (no local database) |

## 6. Residual Risk
- Institution self-signup allows slug squatting, and its "already exists" message reveals which institutions are registered. Consider admin-reviewed registration keyed on a verified domain.
- Institution owners can add any account as a member (no invitation or consent flow yet).
- Hosted Supabase: confirm that *Exposed schemas* excludes `private`.
- `getSessionContext` runs three queries per call and is not cached per request.
- The inquiry rate limiter is in-memory.
- Scholar express-interest always fails under RLS (scholars cannot insert `inquiries`).
- Conference interviews (`lib/conferences`) are in-memory demo data. The ATS matrix shows seed candidates outside production.
- The client `user-menu` reads `user_metadata.role` for display only.
- `docs/adr/README.md` index lists only ADRs 0001–0008.

## 7. Follow-up
1. Member invitations for existing institutions.
2. A database-level inquiry status-transition guard.
3. A scholar→posting application model.
4. A persistent rate limiter.
5. Replace demo data with live loaders.
6. Playwright role-boundary tests through the real login flow.
7. Final build: GDPR (religious affiliation is Art. 9 special-category data), encryption, and the domain review personas.
