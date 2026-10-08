# ADR 0025: Review-Gated Profile Content and Relational Promotion on Approval

- **Status:** Accepted
- **Date:** 2026-10-07
- **Deciders:** Core Engineering (owner-approved story and brief, 2026-10-07)
- **Builds on:** ADR 0005, ADR 0022, ADR 0023, ADR 0024
- **Resolves:** ADR 0024 residual risks 1 and 2
- **Spec:** `docs/superpowers/specs/2026-10-07-review-gated-profile-content.md`

---

## Context

ADR 0024 made drafts reach admin review, but two gaps remained, and research on 2026-10-07 confirmed both:

- **Direct edits bypassed review.** A scholar could UPDATE any `scholars` content column (`full_name`, `biography`, `doctrinal_statement_text`, `slug`, file paths, and so on) through PostgREST. They could also INSERT, UPDATE and DELETE rows in `scholar_disciplines`, `scholar_traditions`, `scholar_confessions`, `credentials` and `publications`.
- **Approval published scalars only.** Public pages read the relational lists, so approved credentials, publications, disciplines, traditions and confessions never appeared publicly.
- **The editor's taxonomy did not match the database.** Confessions were stored as `standard-westminster`-style ids, the Lausanne Covenant did not exist, the Chicago slug differed, and most discipline and tradition names differed from the seeded rows.
- **Data-loss trap.** A scholar with no published revision started with empty lists in the editor even when relational rows existed. Replace-on-approval would have wiped them.

## Decision

1. **Migration `20261007090000_review_gated_profile_content.sql`** (idempotent) follows the ADR 0022 to 0024 pattern: SECURITY INVOKER guard triggers that fail closed through `private.is_restricted_caller()`, private SECURITY DEFINER helpers, and a re-issued service-role-only review function.

2. **Allow-list guard on `scholars` (fails closed).** For a restricted caller, `private.guard_scholars()` compares `to_jsonb(NEW)` with `to_jsonb(OLD)` after removing the self-service keys `contact_preference`, `draft_revision_id`, `updated_at` and `profile_tier`. Any other difference raises `Unauthorized:` (42501).
   - It is an allow-list, not a deny-list, so a column added in a later migration is protected automatically. Forgetting to classify a new column makes it read-only for scholars, which is the safe direction. The policy-matrix test (ADR 0023) then forces the decision to be declared.
   - `profile_tier` is ignored here because the existing tier trigger owns that refusal and its message (`scholar-media.test.ts` asserts it). Same-event triggers fire alphabetically and `trg_guard_scholars` sorts before `trg_prevent_scholar_tier_escalation`, so the guard must not pre-empt it.
   - Every pre-existing check is kept. The new blocks are appended outside the ELSIF chain so they cannot be skipped by an earlier branch.
   - **Restricted INSERT:** the content and file-path columns must be NULL. `slug` and `full_name` stay allowed. Signup uses the service role.

3. **Child-table denial.** `private.guard_scholar_published_children()` is a BEFORE INSERT, UPDATE and DELETE trigger on the five relational tables. Any restricted caller is refused with `Unauthorized:`. Admins, the service role and direct sessions pass. Execute is revoked from PUBLIC. The existing RLS policies are left in place; the trigger is the boundary.

4. **Promotion on approval.** `review_profile_revision` (same signature and grants, same scholar-row-then-revision lock order) calls `private.promote_snapshot_lists(scholar, snapshot)` after the status check and before the supersede and scalar copy. Any failure rolls back the whole approval, including the audit row. Promotion runs in two passes: validate every list, then replace.
   - **Absent means unchanged.** A key that is absent, or present but not an array, leaves that list alone.
   - **`[]` clears** the list.
   - **A non-empty list replaces** the published list. `display_order` follows array order for credentials and publications only. The first discipline and first tradition are primary. Duplicates are removed (first wins). Confessions, disciplines and traditions have no order column; the live loader orders them deterministically in code (primary first, then taxonomy name, then slug), so rows promoted in one statement with equal `created_at` always read back the same way.
   - Snapshots can be written directly through PostgREST, so promotion never trusts the TypeScript sanitiser. It re-validates shape, types, the 50-item cap, text caps as in `sanitizeSnapshot` (applied to the raw length, before trimming), the `publication_type` and `adherence_level` CHECK sets, URL schemes (`^https?://`, plus `^10\.` for `doi_or_url`), and years 1000 to 2100. The year columns carry no CHECK of their own, so this is the only bound; `sanitizeSnapshot` mirrors it. Required text that is only whitespace (space, tab, CR, LF, FF, VT) counts as empty.
   - **Scalars.** `private.validate_snapshot_scalars` runs first, before any write: length caps equal to `sanitizeSnapshot` (full_name, title, institution, role, location 200; biography 5000; doctrinal statement 10000; timezone 100; ORCID 50; Google Scholar URL 500), `orcid_id` matches the column CHECK shape, and `google_scholar_url` matches the column CHECK (`https://scholar.google.*/citations?...user=`, stricter than `^https?://`, so the validator and the CHECK agree and a bad value is FS002, not a raw 500). An empty or whitespace-only ORCID or link is stored as NULL. The TypeScript side clears a Google Scholar link that is not http(s) in `sanitizeSnapshot`, and the submit route validates the stored value so the scholar is told at submit instead of the link silently vanishing.
   - **Constraint backstop.** A `check_violation` or `not_null_violation` raised while the lists are replaced is re-raised as FS002 (`lists violate a database constraint`), never a raw 500 and never naming the constraint or value.
   - **Error codes.** `FS001` means one or more entries did not resolve to a taxonomy row; `DETAIL` holds a JSON array of `{kind, value}`. `FS002` means an invalid snapshot; the message names the list (with index) or the scalar field, plus a fixed reason, never a value. Scalar FS002 comes first, then list FS002 during validation, both before `FS001`, which is raised once all lists have been scanned.
   - A hidden scholar stays hidden; the content is still published.

5. **Slug contract.** The snapshot stores the database slug for disciplines, traditions and confessions. `private.resolve_taxonomy_id(kind, value)` matches the canonical slug only. The legacy and display-name mapping happens in TypeScript before the value is stored.
   - **Naming debt.** The confession field keeps its name `confessional_standard_id` although it now holds a slug. Renaming would invalidate stored drafts and published snapshots. The field is documented as "slug" in code and this ADR; `confessional_standard_name` is no longer emitted.

6. **TypeScript alias map, not a table.** `lib/taxonomy/aliases.ts` holds a closed legacy-to-slug list (editor confession ids, CV-parser display names). `lib/taxonomy/resolve.ts` tries slug, then alias, then case-insensitive name against the loaded taxonomy. A table would add a write surface and a second source of truth for a list that never grows after this change. Four lossy CV-parser names are deliberately NOT aliased: `confessional baptist`, `evangelical free & independent`, `pastoral & practical theology` and `philosophical theology & apologetics`. Each is broader or narrower than any single seeded row, so a silent mapping would publish a different claim than the scholar made. They stay unresolved and submit asks the scholar to pick deliberately. A parity integration test checks that every alias target exists in the database seed and the resolver agrees with SQL.

7. **Lausanne Covenant** is added to `confessional_standards` and `seed.sql` (`ON CONFLICT DO NOTHING`). The editor's Chicago entry resolves to `chicago-statement-inerrancy`.

8. **Always-live baseline.** `loadLiveProfileSnapshot()` builds the editor start point and the admin diff baseline from the scholar's real published rows: scalars plus the five relational lists. A first approval therefore never silently removes existing credentials, publications or confessions. The baseline no longer comes from the previous revision's snapshot, which may predate rows that exist today.

9. **API behaviour.**
   - `GET /api/scholars/revisions` also returns `taxonomy` and `unresolved`.
   - `PUT` passes the taxonomy to `sanitizeSnapshot`.
   - Submit returns 422 while unresolved entries remain, with an `unresolved` list.
   - The admin route maps `FS001` to `taxonomy_unmatched` (422) and `FS002` to `snapshot_invalid` (422), with an `unmatched` list capped at 25 entries of 200 characters. Values are never logged.

## Consequences

- **Positive:** Public profile content only changes through an approved revision, enforced in the database. Approved lists reach the public pages atomically. Search committees can trust what they see was reviewed. New `scholars` columns are safe by default.
- **Negative:**
  - Scholars cannot write the relational tables at all. Any future self-service feature on those tables needs a deliberate guard change.
  - A direct-written snapshot with an unknown slug blocks approval until the scholar fixes it. This is intended.
  - Deploy order matters. An old editor against the new database could submit empty lists that clear published rows. Deploy the app and apply the migration close together.
  - `[]` clearing a non-empty published list is not refused in SQL. The live-baseline editor and the admin diff make it visible instead.
- **Deploy preflight.** Section 0 of the migration is an ENFORCED, read-only `DO` block: it raises `preflight_failed` (counts per table only) and applies nothing if any open revision (draft, submitted, changes_requested) has a list key that is `[]`, absent or not an array while the scholar has live rows in the matching table (`credentials`/`credentials`, `publications`/`publications`, `scholar_disciplines`/`disciplines`, `scholar_traditions`/`traditions`, `scholar_confessions`/`confessions`). Absent and non-array count on purpose: under this migration they mean "unchanged", but the old editor always wrote every key, so a missing key is unknown intent and the fail-closed choice costs one re-save. Runbook: if it raises, reject or approve the named revisions, or have the scholars re-save them from the live profile, then re-run. An integration test extracts the exact `DO` block between the `PREFLIGHT-BEGIN`/`PREFLIGHT-END` markers and runs it in a rolled-back transaction against each trap. Still manual and read-only: taxonomy slugs present; no foreign keys reference `credentials` or `publications` ids; open revisions with legacy names (the editor maps them on load).

## Data protection

Confessional standards, tradition and the doctrinal statement reveal religious belief, which is special-category personal data (GDPR Art. 9). The scholar publishes it deliberately:

- **Basis and consent.** Nothing is published by default. A standard is only added when the scholar ticks it and chooses an adherence level (no default level), and nothing goes public until an administrator approves the submitted revision. The editor states next to each of these inputs that approved content is published on the public profile and visible to anyone.
- **Withdrawal.** The scholar removes any of it by submitting a revision without it; approval replaces the public rows (see decision 8).
- **Follow-up.** The GDPR erasure and retention slice (deleting superseded revision snapshots, which still contain the earlier values, and account-level erasure) is a separate piece of work and is not delivered here.

## Residual risk and accepted risks

1. **Accepted:** Courses, `course_disciplines`, media links, speaker topics and availability stay self-service by owner decision. Their public free text is not reviewed.
2. **Accepted:** Replace-by-delete-and-insert changes the row ids of credentials, publications and the taxonomy join rows on every approval. Nothing references those ids today (preflight confirms it). A future foreign key to them needs an upsert strategy first.
3. **Accepted:** A scholar whose draft contains an incomplete credential row is blocked at submit (validation) rather than at approval.
4. **Follow-up:** GDPR erasure and retention (see Data protection), profile photo and doctrinal statement file upload, and notifications remain separate slices.
5. **Accepted:** Non-primary disciplines and traditions are ordered by name after approval, not by draft order. Only the primary (first in the draft) is preserved.
6. **Accepted:** No component-level accessibility tests (no DOM test library); row-editor focus and announcements are covered by review and E2E only. There is no admin E2E of approve-then-public-display (the integration anon read covers it) and no E2E of legacy confession replacement.
7. **Follow-up:** Fonts depend on Google Fonts at build time; self-hosting is a separate change. Turnstile keys in Vercel production are unconfirmed.
8. **Status:** Accepted and LIVE in production. The owner applied migration `20261007090000` on 2026-10-07 (preflight passed; verify output confirmed the grants, guard triggers, helpers and the Lausanne row) and the app (PR #62, `e9f8d57`) was already deployed. The direct-edit bypass is closed there. See `docs/reviews/2026-10-07-council-review-14-synthesis.md`.
