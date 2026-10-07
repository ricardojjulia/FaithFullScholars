# Spec: Review-Gated Profile Content & Relational Promotion on Approval

- **Status:** Story approved by the owner on 2026-10-07 (feature-factory gate 3). Technical brief pending.
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
