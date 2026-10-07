# Spec: Review-Gated Profile Content & Relational Promotion on Approval

- **Status:** Approved (story and brief, owner, 2026-10-07) and implemented in PR #62 (ADR 0025). Council 14 and pr-review complete; CI green on `a5677ee`. Migration `20261007090000` is pending production deploy.
- **Closes:** ADR 0024 residual risks 1 (direct live-profile edits bypass review) and 2 (approval publishes scalar fields only).
- **Branch:** `feat/review-gated-profile-content`

## Problem

Research (2026-10-07) on `main` found the following.

- **Unguarded columns.** A scholar can UPDATE `scholars` content columns directly through PostgREST, bypassing review: `full_name`, `title`, `biography`, `doctrinal_statement_text`, `current_institution`, `institutional_role`, `location`, `timezone`, `orcid_id` and `google_scholar_url`. The same applies to `slug`, `profile_photo_path` and `doctrinal_statement_path`. Only the trust columns are guarded.
- **Unguarded child tables.** A scholar can INSERT, UPDATE and DELETE rows in `scholar_disciplines`, `scholar_traditions`, `scholar_confessions`, `credentials` and `publications` directly. No app code does this; the exposure is the raw API.
- **Partial publication.** Approval copies scalar fields only. Every public page reads the relational lists, so approved credentials, publications, disciplines, traditions and confessions never appear publicly.
- **Taxonomy mismatch.** The editor's taxonomy values don't match the database.
  - Confessions are stored as `standard-westminster`-style ids, not database ids. The Lausanne Covenant doesn't exist in the database, and the Chicago Statement slug differs.
  - 7 of 9 discipline names and 4 of 6 tradition names differ from the seeded rows.
  - There is no tradition picker. Traditions come only from the CV parser, and the scholar never sees them.
- **Data-loss trap.** A scholar with no published revision starts with empty lists in the editor, even when relational rows exist (for example, the pilot cohort). Promoting "replace on approval" naively would wipe their data on first approval.

## Story

As a **scholar**, I edit my whole public profile (name, biography, doctrinal statement, credentials, publications, disciplines, traditions and confessional standards) through drafts that an admin approves. Once a revision is approved, all of it appears on my public profile.

As **the platform**, no scholar can change public profile content except through an approved revision. Search committees can then trust that what they see was reviewed.

### Acceptance criteria

#### A. Review-gated content (database-enforced)
1. A scholar (or any restricted caller) cannot change these `scholars` columns directly:
   - the review-gated content: `full_name`, `title`, `current_institution`, `institutional_role`, `biography`, `location`, `timezone`, `doctrinal_statement_text`, `orcid_id` and `google_scholar_url`;
   - the admin/service-only fields: `slug`, `profile_photo_path` and `doctrinal_statement_path`.
   The existing trust-column guards are kept.
2. A scholar cannot INSERT, UPDATE or DELETE rows in `scholar_disciplines`, `scholar_traditions`, `scholar_confessions`, `credentials` or `publications`.
3. Self-service stays allowed: `scholars.contact_preference` and `scholars.draft_revision_id`, plus `availability_profiles`, `courses`, `course_disciplines`, `media_links` and `speaker_topics`.
4. Service role, direct database sessions and admins are unaffected. This covers signup, seeding and admin tools.

#### B. Promotion on approval (atomic)
5. Approving a revision publishes, in the same transaction as today's scalar copy and audit row:
   - credentials (`display_order` follows the draft order);
   - publications (same rule);
   - disciplines and traditions (the first entry is primary);
   - confessional standards, with adherence level and exception notes.
6. Each list in the draft **replaces** the published list. A list absent from the draft is left unchanged.
7. **Unmatched taxonomy blocks approval.** If any discipline, tradition or confession in the draft does not resolve to a database row, the approval fails. Nothing changes, and the admin sees a clear message naming the unmatched entries.
8. Approving a hidden scholar's revision still publishes the content and keeps the scholar hidden.

#### C. No data loss; real starting point
9. The editor's starting point and the review diff baseline are built from the scholar's **actual** published rows: scalar columns plus the five relational lists. A first approval therefore never silently removes existing credentials, publications or confessions.

#### D. Taxonomy pickers backed by the database
10. The profile editor offers confession, discipline and **tradition** pickers. The options come from the database lists (`confessional_standards`, `disciplines`, `traditions`), and the draft stores the **slug**.
11. The database gains the Lausanne Covenant. The editor's Chicago Statement entry maps to the database row `chicago-statement-inerrancy`.
12. Existing drafts and CV-import suggestions using legacy names or ids are mapped to slugs (an alias table) when loaded. Anything that still doesn't resolve is shown to the scholar to fix before submitting.
13. Onboarding shows the disciplines and traditions suggested from the CV, and the scholar can change them before saving.

#### E. Tests & gates
14. Real-role integration tests cover:
    - scholar denial on every gated column and on each child table, for INSERT, UPDATE and DELETE;
    - self-service columns and tables still writable;
    - promotion: replacement, absent-list-unchanged, ordering and primary flag, unmatched-blocks, hidden kept;
    - first approval with pre-existing rows loses nothing.
    Each test must be proven to fail with the guard removed.
15. The policy matrix declares the gated `scholars` columns as non-writable for the scholar persona. The `rls-authenticated` biography test is inverted.
16. Unit tests cover snapshot slug validation and legacy-name mapping. E2E covers editing a credential and a tradition, saving, submitting and withdrawing.

### Non-goals
- Reviewing courses, syllabi, media links or speaker topics. They stay self-service; the unreviewed public free text is recorded as accepted risk.
- Uploading a profile photo or doctrinal statement file.
- GDPR retention, erasure or export (separate slice).
- Notifications.

## Owner decisions (2026-10-07)
1. Unmatched taxonomy **blocks approval** with a clear message.
2. The editor and baseline **load the real relational rows**, so the first approval loses nothing.
3. The editor switches to **DB-backed pickers storing slugs**: add the Lausanne Covenant, fix the Chicago slug, and map legacy names.
4. **Operational fields stay self-service**: contact preference, availability, courses, media and speaker topics. Slug and file paths become admin-only.
5. Default (not raised by the owner): the first discipline and first tradition are primary.

## Technical brief (spec-writer, 2026-10-07)

### Design findings
- **Snapshots can bypass the sanitizer.** Scholars can write `snapshot_data` directly through PostgREST, so promotion must validate every snapshot item itself.
- **New editors needed.** There is no credentials or publications editor today. AC16 needs repeatable-row editors for both.
- **Phantom diffs.** `lib/domain/diff.ts` compares lists with `JSON.stringify`. With live baselines this would show changes that aren't real, so it needs a canonical comparison and a "primary changed" check.
- **Trigger order.** Same-event triggers fire alphabetically, so the extended `guard_scholars` must not pre-empt the `profile_tier` escalation message (`scholar-media.test.ts`).
- **Denial prefix.** Every new guard message must start with `Unauthorized:`. That is what the policy-matrix runner treats as a denial.

### Database: migration `20261007090000_review_gated_profile_content.sql` (idempotent)
1. **Lausanne Covenant** is added to `confessional_standards` (`ON CONFLICT DO NOTHING`) and to `seed.sql`.
2. **`private.guard_scholars()`** keeps every existing check and adds:
   - **UPDATE: fail-closed allow-list.** It compares `to_jsonb(NEW)` with `to_jsonb(OLD)`, ignoring `contact_preference`, `draft_revision_id`, `updated_at` and `profile_tier`. Any other column change by a restricted caller raises `Unauthorized:` (42501). Columns added later are covered automatically.
   - **Restricted INSERT:** the content and file-path columns must be NULL. `slug` and `full_name` stay allowed, and signup uses the service role.
3. **`private.guard_scholar_published_children()`** is a new BEFORE INSERT/UPDATE/DELETE trigger on `scholar_disciplines`, `scholar_traditions`, `scholar_confessions`, `credentials` and `publications`. It refuses restricted callers. Admins and the service role pass.
4. **`private.resolve_taxonomy_id(kind, value)`** (definer) matches on the canonical slug only.
5. **`private.promote_snapshot_lists(scholar, snapshot)`** (definer) runs in two passes:
   - **Validate:** shape, types, caps (50 items), allowed enums and URL schemes. Errors raise **FS002** with list and index. Unresolved taxonomy raises **FS001**, with every unmatched entry in DETAIL.
   - **Replace** each list present in the snapshot:
     - a key that is absent or not an array leaves the list unchanged, and `[]` clears it;
     - `display_order` follows the array order;
     - the first discipline and the first tradition are primary;
     - duplicates are removed.
6. **`review_profile_revision`** is re-issued, keeping its signature and grants. Approve calls the promotion after the locks and the status check and before the scalar copy, so any failure rolls back everything.

### API and service
- **New `lib/taxonomy/aliases.ts` and `lib/taxonomy/resolve.ts`.** They hold the legacy-to-slug map (a closed list) and a resolver that tries slug, then alias, then case-insensitive name. A parity test keeps the resolver in step with SQL.
- **`sanitizeSnapshot`:**
  - maps entries to slugs, keeping unresolved values raw and capped;
  - removes duplicates while keeping order;
  - stops emitting `confessional_standard_name`;
  - validates URL schemes (`https?://`, plus `10.` for DOIs).
- **Live loader.** `loadLiveProfileSnapshot()` builds the editor start point and the admin diff baseline from the scalars and the five relational lists. `GET /api/scholars/revisions` also returns `taxonomy` and `unresolved`.
- **Submit gate.** Submit returns 422 while unresolved entries remain.
- **Admin errors.** FS001 maps to `taxonomy_unmatched` and FS002 to `snapshot_invalid`. Both return **422**, with a message naming the entries; the panel already displays it.

### UI
- **DB-backed pickers.** The confession selector reads DB rows and stores slugs. A new multi-select for disciplines and traditions has a primary badge and a "Make primary" action. Unmatched entries appear as removable alerts.
- **New editors.** New credentials and publications row editors, with labels and test hooks.
- **Onboarding** shows the CV-suggested disciplines, traditions, credentials and publications for review before saving.

### Tests
- **New `tests/integration/review-gated-content.test.ts` (real roles):**
  - every gated column, and each child table on INSERT, UPDATE and DELETE, is denied;
  - the self-service columns and tables still work;
  - admin, service role and direct sessions are unaffected;
  - promotion covers replace, absent, clear, order, primary, de-duplication, unmatched (no change and no audit row), invalid, hidden and Lausanne;
  - **a first approval loses nothing.**
- **In-suite proof of failure.** In a transaction, drop or replace each guard, assert the probe now succeeds, then roll back. A one-time manual red run is recorded in the run report.
- **Policy matrix:** the gated `scholars` columns become non-writable, and there are new child-table scenarios. The `rls-authenticated` biography test is inverted, and `scholar-media` must still pass.
- **Unit:** resolver and aliases, sanitize, canonical diff, admin 422 mapping, the submit gate, and the loader.
- **E2E:** add a credential and pick a tradition, then save, submit and withdraw; show unmatched entries. The admin journey checks that the approved credential and tradition appear publicly.

### Docs
- **ADR 0025**, written before the code.
- ADR 0024's residual risks 1 and 2 are marked resolved.
- CHANGELOG, README and plan.

### Deploy runbook
1. **Preflight.**
   - **Enforced by the migration (section 0, read-only):** it raises `preflight_failed` with counts and changes nothing if any open revision (draft, submitted, changes_requested) has a list key that is `[]`, absent or not an array while the scholar has live rows in the matching table. Absent counts on purpose (the old editor always wrote every key). If it raises: reject or approve the named revisions, or have the scholars re-save them from the live profile, then re-run.
   - **Manual, read-only:** the taxonomy slugs are present; no foreign keys reference `credentials` or `publications` ids; list open revisions with legacy names.
2. **Deploy the app, then apply the migration.** An old editor against the new database could clear rows, so deploy both close together.
3. **Verify:**
   - a scholar PATCH of `biography` returns 42501;
   - a scholar cannot DELETE a credential;
   - a scholar can still change `contact_preference`;
   - an approval publishes a credential and a tradition.

No back-fill is required: live rows don't change at migration.

### Defaults chosen (flagged to the owner)
- 422 for unmatched or invalid snapshots.
- No hard SQL refusal to clear a non-empty list with `[]`. The live-baseline editor, the admin diff, and the enforced preflight cover the trap.
- Restricted INSERT keeps `slug` and `full_name`.
- URL-scheme validation is in scope.
