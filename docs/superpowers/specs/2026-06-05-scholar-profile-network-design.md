# Scholar Profile Network Design

## Status

Approved product direction: Scholar Profile Network first, public knowledge portal second, formal hiring marketplace later.

## Goal

Build a professional discovery platform for theological and biblical college professors that showcases scholar identity, CVs, courses, sample content, and availability for institutional opportunities.

## Platform Baseline

- Runtime: Next.js App Router deployed on Vercel.
- Backend: Supabase Auth, Supabase Postgres, Supabase Row Level Security, and Supabase Storage.
- Supabase SSR clients must use cookie-backed sessions for server-rendered authenticated routes.
- Public pages can be statically optimized where data is public and approved; authenticated pages must be server-rendered or otherwise session-aware.
- Supabase service-role credentials must remain server-only and must not be exposed through `NEXT_PUBLIC_` variables.

## Design Principles

- Start with trust and inspectability before transactions.
- Prefer structured profile fields over unsearchable prose.
- Let scholars control what is public, but make publication status clear.
- Link to external media instead of hosting video in the MVP.
- Keep institution inquiries structured, lightweight, and respectful.
- Avoid building a general social network feed.
- Avoid building an LMS.

## Core User Journeys

### Scholar Onboarding (Assisted or Manual)

1. Scholar creates account.
2. Scholar has the option to upload a CV (PDF) for automated parsing:
   - System extracts text and parses education, publications, current role, biography, and suggests disciplines.
   - Parsed items populate draft profile fields for the scholar to review and edit.
   - Scholar confirms, corrects, or manually enters profile fields.
3. Scholar completes academic identity, affiliation, biography, disciplines, and contact preference.
4. Scholar provides voluntary theological context:
   - Selects theological tradition(s) and confessional standard(s) affirmed (e.g. Westminster, London Baptist, Lausanne, Nicene).
   - Optionally provides a personal doctrinal statement (text or link/PDF).
5. Scholar adds/reviews publications and courses.
6. Scholar specifies availability and opportunity preferences.
7. Scholar previews profile.
8. Scholar submits initial profile revision for admin review.
9. Admin approves, requests changes, or rejects.
10. Approved profile becomes publicly discoverable.

### Scholar Profile Updates (Revision Lifecycle)

1. An approved scholar edits their bio, credentials, availability, or confessional alignment.
2. Changes are saved to an active `draft` revision without altering or unpublishing the live public profile.
3. Scholar previews the updated revision and submits it for review.
4. The live profile remains publicly visible with the previously approved data while the revision is pending.
5. Admin reviews the submitted diff; once approved, the revision is promoted to the live published profile.

### Institution Discovery

1. Institution user searches by discipline, course area, language, delivery mode, availability, theological tradition, and confessional standard.
2. User inspects scholar profile, including CV, publications, courses, sample media, and doctrinal statement.
3. User saves scholar or course.
4. User sends structured inquiry.
5. Scholar receives inquiry according to contact preference.

### Public Learning Discovery

1. Visitor browses topic pages or course directory.
2. Visitor filters for free content.
3. Visitor opens a course preview.
4. Visitor watches embedded YouTube content or follows external course links.
5. Visitor can navigate to scholar profile.

## Domain Model

### Account

Represents an authenticated user.

Key fields:

- id
- email
- role: scholar, institution_user, admin
- status: active, suspended
- created_at

### Scholar

Represents the public and editable academic profile.

Key fields:

- id
- account_id
- slug
- full_name
- title
- profile_photo_url
- current_institution
- current_role
- biography
- location
- timezone
- contact_preference
- doctrinal_statement_text: Optional personal summary of faith
- doctrinal_statement_url: Link or uploaded PDF doctrinal statement
- published_revision_id: References currently active approved revision
- draft_revision_id: References in-progress or submitted revision
- profile_status: draft, submitted, changes_requested, approved, hidden
- verification_status: self_reported, institution_affiliated, verified

### ScholarProfileRevision

Represents a versioned snapshot of editable scholar profile content, decoupling live listings from in-review changes.

Key fields:

- id
- scholar_id
- revision_number
- status: draft, submitted, changes_requested, approved, superseded
- snapshot_data: JSONB containing versioned fields (biography, affiliations, credentials, publications, courses, availability)
- admin_notes: Internal notes or feedback requesting changes
- submitted_at
- reviewed_at
- reviewed_by

### ConfessionalStandard

Controlled taxonomy for historical creeds, confessions, and evangelical doctrinal statements.

Examples:

- Apostles' Creed
- Nicene Creed
- Westminster Confession of Faith
- 1689 London Baptist Confession
- Thirty-Nine Articles of Religion
- Three Forms of Unity (Heidelberg / Belgic / Dort)
- Lausanne Covenant
- Chicago Statement on Biblical Inerrancy
- Baptist Faith and Message (2000)

### ScholarConfession

Links a scholar to an affirmed confessional standard.

Key fields:

- scholar_id
- confessional_standard_id
- affirmation_type: full, with_exceptions
- exceptions_notes: Optional scholar-provided qualification or note

### Discipline

Controlled taxonomy for academic areas.

Examples:

- Old Testament
- New Testament
- Biblical Languages
- Systematic Theology
- Historical Theology
- Church History
- Practical Theology
- Homiletics
- Missions
- Christian Education
- Counseling
- Ethics

### Course

Represents a course a scholar offers, has taught, can license, or can preview.

Key fields:

- id
- scholar_id
- title
- slug
- description
- level
- discipline_id
- delivery_modes
- availability_modes
- syllabus_url
- reading_list
- public_preview_enabled

### MediaLink

Represents public teaching content hosted outside the platform.

Key fields:

- id
- owner_type: scholar, course, publication
- owner_id
- provider: youtube, vimeo, personal_site, institution_site, podcast, other
- url
- title
- description
- visibility

### Publication

Represents books, chapters, papers, articles, or conference contributions.

Key fields:

- id
- scholar_id
- type
- title
- publisher
- year
- url
- citation

### Availability

Represents opportunity preferences and current openness.

Key fields:

- scholar_id
- status: open, limited, by_request, unavailable
- earliest_term
- opportunity_types
- delivery_modes
- travel_willingness
- languages
- notes

### Institution

Represents a college, seminary, ministry organization, church, or training program.

Key fields:

- id
- name
- slug
- website
- institution_type
- location
- approval_status

### Inquiry

Represents a structured outreach request from an institution to a scholar.

Key fields:

- id
- institution_id
- scholar_id
- course_id
- opportunity_type
- proposed_term
- delivery_mode
- message
- contact_email
- status: sent, viewed, responded, archived

## Permissions

- Public visitors can view approved public scholars, approved public courses, and public media links.
- Scholars can edit their own draft content and submit it for review.
- Scholars can hide their public profile.
- Institution users can save scholars and send inquiries.
- Admins can approve profiles, manage taxonomy, review reports, and change verification status.

## MVP Constraints

- No payment handling.
- No contracts.
- No internal video hosting.
- No synchronous chat.
- No automatic credential verification.
- AI-assisted CV ingestion produces draft suggestions only; scholars must review, edit, and confirm all fields before submission.
- No AI-generated public claims without explicit scholar review and admin approval.

## Error and Abuse Handling

- Invalid media URLs should be rejected with provider-specific guidance.
- Inquiry forms should rate-limit unauthenticated or low-trust usage.
- Public reporting should capture reason, URL, reporter contact, and optional notes.
- Admin profile review should preserve requested-change history.
- Deleted scholar content should be soft-deleted first to support audit and restoration.

## Testing Strategy

- Unit tests for profile completion rules, slug generation, URL validation, and taxonomy filters.
- Unit and integration tests for CV PDF parsing and draft field mapping.
- Integration tests for scholar onboarding, admin approval, revision promotion, public search, and inquiry submission.
- Authorization tests for scholar, institution, admin, and public access boundaries.
- Supabase RLS tests for direct table access, draft-profile isolation, live-vs-draft revision separation, scholar-owned writes, institution inquiry access, and admin-only review operations.
- Supabase Storage policy tests for private CV access and public profile asset access.
- Filter tests for multi-criteria search including discipline, availability, theological tradition, and confessional standards.
- Accessibility tests for profile pages, search results, forms, and admin review queues.
- Seed-data smoke tests for public browsing and realistic theological taxonomy coverage.

## Open Product Decisions

The plan assumes these defaults:

- The MVP uses admin-reviewed self-reported scholar data.
- Scholars can disclose theological tradition and denomination, but the platform does not infer them.
- YouTube is the first-class external video provider.
- Formal marketplace transactions are deferred.
- Institution inquiry is email-forwarded or dashboard-visible before building full messaging.
