# Run Report — 2026-10-04: Authorization Lockdown

## 1. Run Metadata
- **Starting commit:** `3283b5a` (`main`)
- **Feature branch:** `fix/lockdown-authz-service-role`
- **Execution status:** Code complete. Database-backed verification is pending CI (no local database was available).

## 2. Intent
A codebase study found that the README claims ("fully implemented, audited, verified") did not match the code. Phase 2 (authentication) was never built, and several routes leaked or mutated other tenants' data. The owner chose to **lock down first, with no schema changes beyond one corrective migration**, before the full production build (auth, GDPR, encryption).

## 3. Findings Addressed
| # | Finding | Fix |
|---|---|---|
| 1 | Inquiry, shortlist, and export routes used the service role with client-supplied `scholarId`/`institutionId`. Anyone could read any inbox or shortlist. | Identity and tenancy from the session (`lib/auth/session.ts`); RLS-scoped client; membership required |
| 2 | `verifyStaffUser` honoured self-editable `user_metadata.role` | Role read from `public.accounts` |
| 3 | `NODE_ENV=development` / `ENABLE_DEV_ROUTES=true` bypassed admin auth | Bypass removed from all admin routes and pages |
| 4 | Dashboard and institution layouts unguarded | Layout guards |
| 5 | Hardcoded institution and reviewer fallback ids | Removed |
| 6 | Raw DB and exception messages returned to clients | Generic errors; server-side logging |
| 7 | RLS helpers recursed through their own tables' policies; `institution_users` policy self-referenced | Migration `20261004120000_fix_rls_helper_recursion.sql` (ADR 0009) |
| 8 | Express-interest wrote non-existent columns and returned simulated success | Auth-gated honest `501` |
| 9 | Institution endorsements were always "credential verified" | Derived from the institution's approval status |

## 4. Architecture Impact
- ADR 0009 (new): session-derived identity; RLS helpers as `SECURITY DEFINER` functions in a non-exposed `private` schema behind unchanged `public` wrappers.
- `lib/inquiries/{actions,queries,export-dossier}.ts` now take a `SupabaseClient` parameter. Routes pass the user client. Business-flow integration tests pass the service-role client explicitly.
- No table, column, or seed changes.

## 5. Verification
| Command | Result |
|---|---|
| `npx tsc --noEmit` | Pass |
| `npx eslint .` | Pass (0 findings) |
| `npm run version:check` | Pass |
| `npx vitest run` (unit) | 18/18 unit files, 100 tests pass |
| Mutation check: old `lib/feedback/auth.ts` + old `app/api/inquiries/route.ts` | 8/21 lockdown tests fail as expected; restored |
| `npx vitest run` (integration) | **Not run:** no local DB (8 integration files fail on `ECONNREFUSED`/missing service key, as before this change) |
| `npm run audit:rls`, `npm run audit:security` | **Not run:** no local DB. CI runs both against `supabase start`. |
| `next build` | Pass. Built from a local-disk copy because Turbopack's cache cannot `fsync` on the shared volume (`os error 25`). |

## 6. Residual Risk
- **The corrective migration and `tests/integration/rls-authenticated.test.ts` have not been executed against Postgres yet.** CI is the first run. Treat a red CI as a stop condition.
- Accept/decline restricted to the recipient scholar in application code only. RLS still permits any participant to update the row.
- Inquiry rate limiter is in-memory (ineffective across serverless instances).
- Admin modules (`lib/admin/*`), pilot feedback, and search rate limiting still use the service role. This is acceptable behind `verifyStaffUser` / server-only paths, but should be revisited.
- Dashboard and portal screens still render sample data.

## 7. Follow-up
1. Phase 2: signup, login, logout, recovery, role assignment.
2. Replace dashboard and portal sample data with live, session-scoped loaders.
3. Column-level or trigger guard for inquiry status transitions.
4. Scholar→posting application model (re-enable express-interest).
5. Persistent inquiry rate limiter.
6. Final build: GDPR (consent, export, erasure, retention), field-level encryption, full Council review.
