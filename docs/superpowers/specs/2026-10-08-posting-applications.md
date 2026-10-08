# Spec: Posting Applications (Express Interest / Common Application)

- **Status:** Story approved by the owner on 2026-10-08 (gate 3), with the defaults confirmed. Technical brief approved by the owner on 2026-10-08 (gate 5), with the defaults confirmed.
- **Order:** slice 3 of the remaining known-broken fixes. Owner order: rate limits (done) → real portal data (done) → applications → conference hub.
- **Supersedes/extends:** ADR 0020 (Confessional Common Application). A new ADR 0027 is written before the code.
- **Branch:** `feat/posting-applications`

## Problem

Research on `main` (2026-10-07) found the following.

- **Express interest always fails.**
  - `POST /api/postings/[id]/express-interest` inserts into `inquiries` with the scholar's own client.
  - The only `inquiries` INSERT policy is for institution members, so every scholar application is refused.
- **The applicant matrix has no real applicants, and it can leak.** `/institution/postings/[id]/applicants` uses the service role and *guesses* which inquiries are applications. It matches on the message text, or on the same `opportunity_type`. That second rule includes the institution's own outgoing inquiries, so those scholars are shown as "applicants". It also runs N+1 queries.
- **Triage is broken too.** The status select offers accepted and declined, but the inquiry guard only lets the *recipient scholar* set those. ADR 0020's statuses (submitted, under review, interview, declined) do not exist in the schema.
- **There is no dossier snapshot.** ADR 0020 promised a "sealed Candidate Application Dossier Snapshot", but nothing is stored.
- **`inquiries` is the wrong home for applications.** Its parties are inverted (`scholar_id` is the *recipient*), its status vocabulary differs, and it has no posting reference. Adding a scholar INSERT policy to `inquiries` would let scholars message anyone, so that is explicitly rejected.

## Story

As a **scholar**, I apply to a published posting in one step with my approved profile, can see my applications and their status, and can withdraw one.

As an **institution member**, I see the real applicants to my institution's postings, each with the dossier exactly as it was when they applied, and I move them through review.

Neither side can act for the other, and nobody else can see the application.

### Acceptance criteria

#### A. Data model (owner decisions 2026-10-07)
1. A new `posting_applications` table:
   - The posting.
   - The institution, set by the database from the posting and never from the client.
   - The scholar.
   - A cover note.
   - A **frozen dossier snapshot**, sealed server-side at submission.
   - A status.
   - The institution's private notes.
   - Timestamps.
2. One application per scholar per posting.
3. Statuses: `submitted` → `under_review` → `interview_scheduled` → `declined`, plus `withdrawn`.

#### B. Who can do what (database-enforced; ADR 0022/0023 pattern)
4. **Apply.**
   - Only an approved scholar can apply, only for themselves, and only to a `published` posting.
   - Submission goes through a single server function. It seals the dossier from the scholar's live published profile and forces `status = submitted`.
   - The client can never supply the institution, the status or the snapshot.
5. **The scholar** can only withdraw (from any status except `declined`).
6. **The institution** (members of the posting's institution only) can move `submitted → under_review → interview_scheduled → declined` and write private notes. It can never set `withdrawn` or reopen a withdrawn application, and it cannot change the posting, scholar, cover note or snapshot.
7. **Visibility.**
   - The applicant, the posting institution's members and admins can read an application. No one else can.
   - The institution's private notes are never visible to the scholar.
8. **Contact details** (scholar email) are not in the snapshot. They are released to the institution only once the application reaches `interview_scheduled`.
9. **Rate limit:** at most 20 applications per scholar per 24 hours, enforced in the database with the same guard pattern as ADR 0026.

#### C. App
10. **Express interest works.**
    - A posting page shows Apply, Applied (with status) or Withdraw as appropriate.
    - A duplicate application gets a friendly "already applied" message.
    - Errors are honest.
11. **Scholar "My applications"** in the dashboard lists real applications with status and withdraw.
12. **The institution applicant matrix:**
    - reads `posting_applications` with the member's own client under RLS, never the service role;
    - drops the guessing;
    - shows the frozen dossier;
    - offers the real status vocabulary, and records every change.
13. **CSV export** of the matrix uses the same real data.

#### D. Tests & gates
14. **Real-role tests:**
    - scholar applies for self, and is refused for another scholar, an unpublished posting, or while unapproved;
    - forged status, institution or snapshot is refused;
    - another institution cannot read;
    - institution cannot withdraw, cannot change the cover note or snapshot, and cannot read notes as the scholar;
    - scholar cannot change status except to withdraw;
    - a duplicate is refused;
    - the rate limit is enforced;
    - contact is released only at interview.

    Each guard is proven to fail when removed.
15. The policy-matrix entries are added, and `audit:rls` passes.
16. E2E: the scholar persona applies to a seeded posting and sees it in My applications; the institution persona sees the applicant and moves it to under review; the scholar withdraws, so the test is rerun-safe.

### Non-goals
- Email notifications. The existing notification abstraction can be wired later.
- Interview scheduling (the conference hub slice).
- Migrating old `[Common App` inquiries. There are none, because the insert never succeeded.
- Messaging inside applications.

## Owner decisions
2026-10-07:
- separate table;
- frozen dossier;
- one application per posting;
- the scholar can withdraw;
- statuses submitted → under review → interview → declined;
- contact released at interview.

Proposed defaults, to be confirmed with the story:
- 20 applications per scholar per day;
- the scholar can withdraw from any status except declined;
- private institution notes;
- no email notifications in this slice;
- new ADR 0027.

## Technical brief (spec-writer, 2026-10-08), condensed

**Migration `20261012090000_posting_applications.sql`** is idempotent and additive. Its preflight DO block requires the ADR 0022/0025 helpers and the `trg_guard_published_children` trigger.

- **`posting_applications`.** Columns: posting, institution, scholar, frozen `posting_title` and `institution_name`, `cover_note` (5–4000 characters), and `dossier_snapshot` (a JSON object of at most 256 KB). Also status, `status_changed_at` and the timestamps.
  - Constraints: UNIQUE(posting, scholar), FORCE RLS, and a posting FK of NO ACTION.
  - Default Supabase grants are revoked. `authenticated` gets SELECT and UPDATE only. There is no INSERT or DELETE grant or policy.
  - SELECT is allowed for the applicant, institution members and admins. UPDATE is allowed for the applicant and members, and admins get none.
- **Guard** (INVOKER, fail-closed). It refuses any direct INSERT from `anon` or `authenticated`. On UPDATE it applies an allow-list: everything except status is frozen.
  - The applicant may only withdraw from an open state.
  - Members may move submitted → under_review → interview_scheduled, and from under_review or interview_scheduled → declined.
  - There are no skips, no backward moves, and no exit from withdrawn or declined.
  - Someone who is both applicant and member is treated as the applicant.
- **`posting_application_notes`.** A separate table, because RLS works per row. Only members can see a row, and never when they are the applicant. The institution is derived by the guard.
- **`posting_application_events`.** An append-only audit, written by a definer trigger on submit and on each status change. Users can only read it.
- **`submit_posting_application(posting, cover_note)`.** SECURITY DEFINER, `search_path=''`, executable by `authenticated` only. It is the only insert path. In order, it checks:
  1. the caller is signed in;
  2. the scholar is approved;
  3. the note is valid;
  4. the posting is published and its institution is approved (P0002 otherwise, which hides whether the posting exists);
  5. under an advisory lock per scholar: not a duplicate (23505), and fewer than 20 applications in 24 hours (FS429; withdrawn applications count).

  It then seals the snapshot from the scholar's reviewed published rows. The snapshot holds scalars plus the five lists. It contains no email, contact or file paths.
- **`get_application_contact(application)`.** A definer function that returns the scholar's account email only to members, only at `interview_scheduled`, and never to the applicant.

**API** (user client only, 401, 503 on a lookup failure, UUID validation, generic errors):
- express-interest calls the RPC. RPC errors map to HTTP as follows: 28000 → 401, 42501 → 403, P0002 → 404, 23505 → 409, FS429 → 429 with Retry-After, 22023 → 400.
- New routes: `POST /api/applications/[id]/withdraw`, `PATCH /api/institution/applications/[id]/status`, `PUT …/notes`, `GET …/contact` (no-store).

**Services and UI**
- `applicant-service` is rewritten to read with the user client in two queries (no N+1). It is removed from the admin-client allow-list, and its wrong column names are fixed.
- The matrix shows real statuses with only the valid next moves. Errors are surfaced. It shows the frozen dossier, notes, and a "Reveal contact" action at the interview stage.
- One CSV module with formula-injection neutralisation.
- A scholar "My applications" page and nav entry.
- Posting page states: sign in, not eligible, apply, applied with withdraw.
- A new `common_app` i18n namespace in en and es.
- The fake applicants are removed from the pilot seed.

**Tests**
- Real-role integration tests:
  - each check is proven by a rolled-back probe that deletes that single `-- check:` line;
  - a concurrency test: 25 parallel requests yield exactly 20 accepted;
  - snapshot immutability;
  - grants and the hygiene of the definer functions.
- A policy-matrix scenario per role.
- Unit tests for route error mapping, the transition maps and the CSV.
- E2E with a new approved applicant persona and a dedicated, resettable posting: apply, institution review, then withdraw.

**Docs:** ADR 0027, which partially supersedes ADR 0020.

**Deploy order:** preflight, apply the migration, verify, then merge and smoke-test.

**Defaults:**
- forward-only transitions, with decline allowed only after review;
- no reapplying after withdrawal;
- the deadline is not enforced;
- every member can triage;
- syllabi and CV are not sealed;
- contact is the account login email.

### Owner decisions on the brief (2026-10-08)
- Approved as designed:
  - forward-only status transitions; decline only from under_review or interview_scheduled;
  - no reapplying after withdrawal;
  - the posting deadline is not enforced;
  - all institution members can triage.
- The syllabi and CV are not sealed. Contact is the account login email.
- The fake `[Common App` inquiries are removed from the pilot seed. Live pilot DB rows are left as harmless inquiries.

## Build record (2026-10-08, branch `feat/posting-applications`, PR #69)

**Intent.** Implement the approved story and brief exactly: a separate `posting_applications` table, one insert path, a transition-table guard, private notes, an audit trail, late contact release, and the matrix on real data. ADR 0027 was written first.

**Architecture impact.** One additive migration (`20261012090000_posting_applications.sql`); `lib/postings/applicant-service.ts` leaves the service-role allow-list in `eslint.config.mjs`; `express-interest` now calls `submit_posting_application`; four new API routes; `/dashboard/applications`; `common_app` i18n namespace.

**Decisions taken where the brief left room.**
- Events are readable by members who are not the applicant, and by admins, not by the applicant (the actor id is internal).
- The guard decides applicant/member from the existing row (`OLD`), so changing `scholar_id` or `institution_id` in the same UPDATE hits the "sealed" rule, not a confusing "not a party" error.
- Non-restricted sessions (service role, admins, direct sessions) are not blocked by the guard, but it still stamps `status_changed_at` on a real status change.
- The note, duplicate and `signed_in` rules each have a second wall (table CHECK, unique constraint, no identity). Their probes drop the second wall first (note, duplicate) or show the refusal moves on to the next rule (`signed_in`: with no identity nothing can succeed).
- A notes refusal (RLS or guard) is reported as 404, so existence is not revealed.
- The posting page shows "closed" rather than an apply button for an unpublished posting, and shows the real status for a scholar who already applied even after the posting closed.

**Verification.**
- Local: `npm run lint`, `tsc --noEmit`, `vitest --project unit` (673 tests), `npm run test:surface`, `npm run version:check`, `next build --webpack` (Turbopack cannot write its cache on this network volume).
- There was no local database. The integration suite, the policy matrix and nine mutation probes were additionally run against an in-process PGlite Postgres built from the real migrations and `supabase/seed.sql`. This found two defects before CI: an array-append bug in the preflight block and leftover JWT claims making the migration role look like an API caller in a test helper. PGlite is a sanity harness only; CI on `supabase start` is the authority (and ran the committed concurrency tests, which PGlite cannot).
- Mutation probes (each broke exactly the intended tests, then was reverted): removing the `frozen` rule, the `member_forward_only` rule, the `rate` rule; granting INSERT to `authenticated`; removing the "not the applicant" clause from the notes policy; removing the interview-stage condition from `get_application_contact`; adding the email to the snapshot; leaving `anon` granted; dropping `search_path` from the submit function.
- CI: see the PR. The final head SHA's runs are listed in the hand-off.

**Owner decision after review (2026-10-08).** The derived confessional "fit" score is removed everywhere (matrix, KPI, CSV, types). The committee sees the scholar's declared confessions, adherence and exceptions beside the posting's stated requirements. Also after review: admins who are a party are bound by the guards; contact reveals are logged as `contact_revealed` events (`get_application_contact` is VOLATILE) and events are readable by members and admins, while the applicant gets a redacted timeline (no reviewer account ids) through `get_application_events()`, and reveal events are deduplicated per actor per 24 hours; the disclosure names the login email, who can see it and what the institution keeps after withdrawal; dialogs trap focus, close on Escape and return focus; the migration is renamed `20261012090000` to sort after PR #68's.

**Residual risk.**
- Contact release uses the account login email, which may differ from the scholar's preferred address.
- All institution members can triage and read notes (owner decision).
- Pre-existing pilot rows from the fake seed remain as harmless inquiries.

**Follow-up.** Email notifications for new applications and status changes; interview scheduling (conference hub slice); a per-member triage permission if institutions ask for it; apply migration `20261012090000` to production before merging, then smoke-test one application end to end.
