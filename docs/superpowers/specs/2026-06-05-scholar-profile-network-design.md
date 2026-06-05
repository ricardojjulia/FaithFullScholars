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

### Scholar Onboarding

1. Scholar creates account.
2. Scholar completes academic identity, affiliation, biography, disciplines, and contact preference.
3. Scholar uploads CV or enters structured CV highlights.
4. Scholar adds publications and courses.
5. Scholar adds availability.
6. Scholar previews profile.
7. Scholar submits profile for admin review.
8. Admin approves, requests changes, or rejects.
9. Approved profile becomes public.

### Institution Discovery

1. Institution user searches by discipline, course area, language, delivery mode, availability, and tradition.
2. User opens scholar profile.
3. User reviews CV, courses, publications, and sample media.
4. User saves scholar or course.
5. User sends structured inquiry.
6. Scholar receives inquiry according to contact preference.

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
- profile_status: draft, submitted, changes_requested, approved, hidden
- verification_status: self_reported, institution_affiliated, verified

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
- No AI-generated public claims without scholar approval.

## Error and Abuse Handling

- Invalid media URLs should be rejected with provider-specific guidance.
- Inquiry forms should rate-limit unauthenticated or low-trust usage.
- Public reporting should capture reason, URL, reporter contact, and optional notes.
- Admin profile review should preserve requested-change history.
- Deleted scholar content should be soft-deleted first to support audit and restoration.

## Testing Strategy

- Unit tests for profile completion rules, slug generation, URL validation, and taxonomy filters.
- Integration tests for scholar onboarding, admin approval, public search, and inquiry submission.
- Authorization tests for scholar, institution, admin, and public access boundaries.
- Supabase RLS tests for direct table access, draft-profile isolation, scholar-owned writes, institution inquiry access, and admin-only review operations.
- Supabase Storage policy tests for private CV access and public profile asset access.
- Accessibility tests for profile pages, search results, forms, and admin review queues.
- Seed-data smoke tests for public browsing and realistic theological taxonomy coverage.

## Open Product Decisions

The plan assumes these defaults:

- The MVP uses admin-reviewed self-reported scholar data.
- Scholars can disclose theological tradition and denomination, but the platform does not infer them.
- YouTube is the first-class external video provider.
- Formal marketplace transactions are deferred.
- Institution inquiry is email-forwarded or dashboard-visible before building full messaging.
