# ADR 0027: Posting Applications with Frozen Dossiers

- **Status:** Accepted. Built on `feat/posting-applications`; migration `20261012090000` not yet applied to production (pending deploy).
- **Date:** 2026-10-08
- **Deciders:** Core Engineering (owner-approved story and brief, 2026-10-08)
- **Builds on:** ADR 0020, ADR 0022, ADR 0023, ADR 0025, ADR 0026
- **Partially supersedes:** ADR 0020 (decision 3, "Data Architecture", and the dossier details of decision 1). The product intent of ADR 0020 stands.
- **Spec:** `docs/superpowers/specs/2026-10-08-posting-applications.md`

---

## Context

Research on `main` (2026-10-07) found that ADR 0020 was not working in production:

- **Express interest always failed.** The route inserted into `inquiries` as the scholar. The only `inquiries` INSERT policy is for institution members, so every application was refused.
- **The applicant matrix had no real applicants and could leak.** It read with the service role and guessed which inquiries were applications, by message text or by the same `opportunity_type`. The second rule matched the institution's own outgoing inquiries, so those scholars were shown as applicants. It also ran N+1 queries.
- **Triage was broken.** The status select offered `accepted` and `declined`, but the inquiry guard reserves those for the recipient scholar. ADR 0020's statuses did not exist.
- **No dossier was ever sealed.**
- **`inquiries` is the wrong home.** Its parties are inverted (`scholar_id` is the recipient), its vocabulary differs, and it has no posting reference. A scholar INSERT policy on `inquiries` would let scholars message anyone, so it is rejected.

## Decision

1. **A separate table, `public.posting_applications`.** It holds the posting, the institution (set by the database from the posting, never by the client), the scholar, a frozen `posting_title` and `institution_name`, `cover_note` (5 to 4000 characters), a frozen `dossier_snapshot` (a JSON object, at most 256 KB), a status and timestamps.
   - One application per scholar per posting (`UNIQUE (posting_id, scholar_id)`). Withdrawing does not allow reapplying.
   - Statuses: `submitted`, `under_review`, `interview_scheduled`, `declined`, `withdrawn`.
   - FORCE RLS. The posting and institution foreign keys are NO ACTION, so a posting with applications cannot be deleted from under its applicants. The scholar key cascades.
   - Supabase's default grants are revoked. `authenticated` has SELECT and UPDATE only; there is no INSERT or DELETE grant or policy. `anon` has nothing.
   - SELECT: the applicant, members of the posting's institution, and admins. UPDATE: the applicant and members (admins have none).
2. **One insert path: `public.submit_posting_application(posting, cover_note)`.** SECURITY DEFINER, `search_path = ''`, executable by `authenticated` only. In order it checks: signed in (28000); approved scholar (42501); cover note valid (22023); posting published and its institution approved (P0002 `posting_not_open`, which hides whether the posting exists); then, under an advisory lock keyed on the caller's own scholar id, no duplicate (23505) and fewer than 20 applications in 24 hours (FS429; withdrawn applications count). Only then does it insert. Timestamps use `clock_timestamp()`.
3. **The dossier is sealed in SQL, from reviewed rows.** The snapshot is built inside the function from the scholar's published `scholars` row and the five relational lists promoted by ADR 0025 (credentials, publications, disciplines, traditions, confessions), with names and slugs. It carries `snapshot_version` 1, `sealed_at`, `scholar_slug` and `published_revision_id`. It contains no email, contact preference or storage path. The client supplies only a posting id and a note. Syllabi and CV are not sealed (owner decision); the matrix links to the live profile for them.
4. **The guard (`private.guard_posting_applications`)** is SECURITY INVOKER and fails closed through `private.is_restricted_caller()`. It refuses any direct INSERT from `anon` or `authenticated`. On UPDATE it applies an allow-list (everything except `status`, `status_changed_at` and `updated_at` is frozen) and a transition table:
   - the member may move `submitted` to `under_review`, `under_review` to `interview_scheduled` or `declined`, and `interview_scheduled` to `declined`;
   - the applicant may move `submitted`, `under_review` or `interview_scheduled` to `withdrawn`;
   - same status is a no-op; everything else is refused; `withdrawn` and `declined` are terminal;
   - a person who is both applicant and member is treated as the applicant;
   - the guard maintains `status_changed_at`;
   - the guard binds every caller running as `anon` or `authenticated`, platform admins included: an admin who is also the applicant or a member cannot edit sealed content or withdraw for the scholar. Only the service role and direct database sessions are exempt (the notes guard follows the same rule).

   Every rule sits on one line ending `-- check:<name>` so a test can remove exactly one rule in a rolled-back transaction and prove the refusal comes from that rule.
5. **Private notes in a separate table, `posting_application_notes`.** RLS works per row, so a column on the application could not hide notes from the scholar. One row per application, with a composite foreign key `(application_id, institution_id)` to the application, so a note can only point at an application of its own institution. Access is limited to members who are not the applicant; admins can read. The guard derives `institution_id`, forces `updated_by` to the caller and makes the key columns immutable.
6. **An audit trail, `posting_application_events`** (append-only for API callers), written by SECURITY DEFINER code only: a trigger `AFTER INSERT OR UPDATE OF status`, and `get_application_contact`. An `event_kind` column (`status` default, or `contact_revealed`) separates status changes from reveals of the applicant's email. Members (who are not the applicant) and admins read the table. The applicant reads a redacted timeline through `get_application_events()` (a definer function that omits `actor_account_id`), so a scholar never learns a reviewer's internal account id; the applicant has no table SELECT policy on events. Reveal events are deduplicated: one per actor per application per 24 hours, so repeat calls cannot flood the log. Nobody calling through the API can write or delete.
7. **Contact is released late and audited.** `public.get_application_contact(application)` is VOLATILE SECURITY DEFINER (it writes the reveal event) and returns the scholar's account login email only to a member of the posting institution, only at `interview_scheduled`, and never to the applicant. Any member can view it. The API sends it with `Cache-Control: no-store`. The apply dialog says all of this, and that after a withdrawal the institution keeps the dossier and cover note.
8. **API and app.** All routes use the caller's client; no service-role client appears on any of these paths. They return 401 when signed out, 503 when the session lookup fails, validate UUIDs and log error codes only. `getPostingApplicantReport` now reads with the member's own client under RLS in two queries (applications, then the posting), so it leaves the service-role allow-list. Status vocabulary and the transition maps live in `lib/postings/application-status.ts`; an integration sweep compares them against the database guard so they cannot drift. The matrix offers only valid next moves, surfaces errors, shows the frozen dossier and notes, and reveals contact only at the interview stage. One CSV module neutralises spreadsheet formula injection.
9. **No derived confessional "fit" score (owner decision, 2026-10-08).** The matrix, the KPI cards, the CSV and the report types show what the scholar DECLARED (name, adherence level, exception notes, from the frozen snapshot) beside the posting's stated `confessional_requirements` and standard. The platform does not score or rate the match, and this path no longer calls `lib/search/confessional-matcher.ts`. A regression test fails if a fit, score or alignment column returns.
10. **Fake data removed.** The `[Common App` inquiries are deleted from the pilot seed. Rows already in the pilot database are left as harmless inquiries.
11. **Deferred by design:** email notifications, interview scheduling (the conference hub slice), and messaging inside applications.

Defaults confirmed by the owner (2026-10-08): forward-only transitions with decline only after review; no reapplying after withdrawal; the posting deadline is not enforced; every member can triage; syllabi and CV are not sealed; contact is the account login email.

## Consequences

- **Deploy order:** PR #67 (migration `20261010090000`) and PR #68 (`20261011090000`) land first; this migration is `20261012090000`.
- **Positive:**
  - Express interest works and cannot be forged: institution, status and snapshot are never client input.
  - The matrix shows real applicants only, scoped by RLS to the member's institution.
  - The institution sees exactly what the scholar applied with, even after the profile changes.
  - Scholars cannot read institution notes; institutions cannot withdraw for the scholar.
  - The 20-per-day cap holds under concurrency, and direct inserts are impossible.
- **Negative:**
  - A member cannot be removed from an application's visibility: all members of the institution see all applicants and notes (owner decision).
  - A withdrawn scholar cannot reapply; an institution cannot reopen a declined or withdrawn application.
  - A posting with applications cannot be deleted. Archive it instead.
  - Applications made before this migration do not exist (the old inserts never succeeded).
- **Residual risk:**
  - The snapshot is only as reviewed as the published rows it is built from; ADR 0025 governs those.
  - Contact release is by account login email, which may differ from the scholar's preferred address.
- **Follow-up:** email notifications for new applications and status changes; interview scheduling; a member-level triage permission if institutions ask for it.
