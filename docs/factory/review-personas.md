# Domain Review Personas

Six stakeholder **lenses** for judging a change from the side of the people FaithFull Scholars serves and the ways it can be abused. They complement the pipeline agents (`story-writer`, builders, `test-verifier`, `pr-reviewer`), which check *how* something is built. The lenses check whether the outcome is *right* for scholars, institutions, and the trust the directory depends on.

They are lenses, not voters. Nothing here is a ratification vote, and no lens may "approve" without evidence.

## Why these lenses exist

Three defects found on 2026-10-04 (ADR 0022) passed lint, typecheck, and tests, and each would have been caught by one lens:

| Defect | Lens that catches it |
|---|---|
| Express-interest told scholars their application was sent when nothing was stored | Scholar advocate |
| Institutions issued endorsements that marked themselves "credential verified"; self-signup could become owner of an existing institution | Trust and moderation; Adversary |
| Inquiries (private contact emails and messages) were readable by anyone | Privacy and data protection |

## The six lenses

### 1. Scholar advocate
*Professors, adjuncts, independent and retired scholars (plan §5).*
- Is everything shown publicly accurate, and did the scholar consent to it (draft vs. published, ADR 0005)?
- Is the scholar told the truth about what happened? No simulated success.
- Can AI-derived content (CV parsing, syllabus tagging, matching) reach a public profile without the scholar approving it?
- Is the scholar's dignity respected in inquiries and rankings?

### 2. Search committee (dean or provost)
*Institutions searching, shortlisting, and contacting scholars.*
- Can I find, compare, shortlist, export, and contact a qualified scholar with confidence?
- Do verification signals mean what they say? Can I tell "self-reported" from "verified"?
- Are workflow states (inquiry, application, shortlist) consistent across my screens and the scholar's?

### 3. Trust and moderation (admin reviewer)
*Plan §7 trust model; ADR 0003.*
- Can any trust signal (verified badge, endorsement, approval, accreditation) be self-granted or forged?
- Are verification and publication kept separate? Is every privileged decision audited (who, when, what)?
- Can an account gain a role or tenancy it wasn't granted, through signup, metadata, or a client-supplied ID?

### 4. Theological integrity
*Confessional standards, traditions, and the plan's rule against inferring beliefs (§15).*
- Are traditions and confessional standards named and represented accurately and evenly?
- Does any feature **infer**, **score**, or **rank** someone's beliefs or orthodoxy (for example "confessional fit" in matching)? If so, is it based only on what the scholar declared, explained, and opted into?
- Does any wording or default favour one tradition?

### 5. Privacy and data protection
*ADR 0008; GDPR, especially Art. 9 special-category data.*
- Religious affiliation and doctrinal statements are **special-category personal data**. Is there explicit consent, a lawful basis, and a minimal-exposure default?
- Where does personal data flow, including to third-party processors such as Gemini? Is that disclosed and necessary?
- Can the data be exported, corrected, and erased? Is retention bounded?
- Is anything private reachable without authorization (RLS, page guards, RSC payload, logs, error messages)?

### 6. Adversary
*Scraper, spam recruiter, fake institution, self-promoting user, endorsement ring.*
- How would I harvest scholars, impersonate an institution, inflate my own credibility, or spam inquiries through this change?
- Which identifier or flag in this change comes from the client, and what happens if I change it?
- What rate, uniqueness, or approval control stops me doing it a thousand times?

## How the lenses are used

| Stage | Who | What |
|---|---|---|
| Story | `story-writer` | A **Persona impact** section: which lenses the story helps, which it could harm, and an acceptance criterion for each harm |
| Council | **Agent 7 — Stakeholder & Trust Lens** (`improve-software.md`) | Reviews the change through all six lenses in a single read-only pass |
| PR review | `pr-reviewer` | Trust-signal and client-supplied-identity checks are part of its standing checklist |

## Evidence rules (all stages)

- Every finding cites a file and line, a command and its output, or a reproducible request. A finding without evidence is a hypothesis and must be labelled as one.
- "No findings" for a lens must state what was checked, for example "read `app/api/postings/route.ts`; institution derived from session at L45".
- A lens may answer "not applicable", with one line saying why.
- Severity uses the `pr-reviewer` scale: Critical, Important, or Minor.
