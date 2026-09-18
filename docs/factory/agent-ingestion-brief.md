# Agent Ingestion Brief

Use this file when handing the repository to an AI implementation agent.

## Project

FaithFull Scholars: a professional scholar profile network for theological and biblical higher education.

## Current Direction

Build the Scholar Profile Network first. Add public course/content discovery early. Defer full hiring marketplace, payments, contracts, social feeds, and LMS features.

## Platform Baseline

- Deploy the app on Vercel.
- Use Supabase as the backend: Auth, Postgres, Row Level Security, and Storage.
- Use `@supabase/ssr` or the current Supabase-recommended SSR helper pattern for Next.js sessions.
- Keep Supabase service-role credentials server-only.
- Use SQL migrations for schema and RLS policy changes.

## Required Reading Order

1. `README.md`
2. `docs/product/master-plan.md`
3. `docs/architecture/architecture-review.md`
4. `docs/factory/software-factory.md`
5. `docs/superpowers/specs/2026-06-05-scholar-profile-network-design.md`
6. `docs/superpowers/plans/2026-06-05-faithfull-scholars-mvp.md`
7. `docs/adr/0001-scholar-profile-network-first.md`
8. `docs/adr/0002-external-media-hosting.md`
9. `docs/adr/0003-admin-reviewed-publication.md`
10. `docs/adr/0004-vercel-supabase-platform.md`
11. `docs/adr/0005-draft-published-profile-revisions.md`

## Non-Negotiable Product Boundaries

- This is not a general social network.
- This is not an LMS.
- This is not a payment marketplace in the MVP.
- Profiles are admin-reviewed before initial public listing.
- Edits to approved profiles follow the Revision Staging Model (ADR 0005); live profiles remain visible while revisions are reviewed.
- Verification status is separate from publication status.
- External video is linked or embedded, not hosted.
- AI-assisted CV ingestion produces draft suggestions only; scholars must review and approve before submission.
- Scholars approve all public profile claims.

## First Build Target

Build an MVP foundation that supports:

- Public scholar directory with confessional and doctrinal filters.
- Public scholar profile displaying credentials, publications, courses, and doctrinal statements.
- Assisted CV onboarding (PDF extraction pre-filling draft profile fields).
- Scholar profile dashboard with revision staging (ADR 0005).
- Course showcase.
- Availability fields.
- Institution inquiry form.
- Admin profile review and revision diff inspection.

## High-Risk Areas

- Authorization leaks from draft profiles or pending revisions.
- Live profile disappearance when an approved scholar saves an edit (must follow ADR 0005).
- Missing or permissive Supabase RLS policies.
- Vercel preview environment pointing at production Supabase data.
- Misrepresenting self-reported credentials as verified.
- Scope creep into LMS or contracts.
- Weak taxonomy causing poor discovery across theological disciplines and traditions.
- Spam or low-quality institution inquiries.

## Expected Engineering Behavior

- Work from a plan.
- Keep slices small.
- Add tests for visibility, authorization, and workflow state.
- Update docs when decisions change.
- Preserve user changes.
- Do not invent unverifiable academic claims in seed data.
