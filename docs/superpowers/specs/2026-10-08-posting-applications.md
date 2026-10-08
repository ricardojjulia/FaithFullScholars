# Spec: Posting Applications (Express Interest / Common Application)

- **Status:** Story drafted 2026-10-08. Awaiting owner approval (feature-factory gate 3).
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
