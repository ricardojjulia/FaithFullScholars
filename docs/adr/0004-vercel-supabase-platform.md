# ADR 0004: Vercel and Supabase Platform Baseline

## Status

Accepted

## Context

FaithFull Scholars needs fast public pages, authenticated dashboards, a relational data model, file storage for CV/profile assets, and a deployment path that supports AI-agent development with preview environments. The user specified that the app should use Vercel with a Supabase backend.

## Decision

The application baseline is:

- Next.js App Router hosted on Vercel.
- Supabase Auth for user authentication.
- Supabase Postgres for relational data.
- Supabase Row Level Security for database-enforced authorization.
- Supabase Storage for CV files, profile images, and scholar-owned documents.
- External media hosting, especially YouTube, for video and public course content.

## Consequences

Positive:

- Vercel gives simple Git-based preview and production deployments.
- Supabase provides Auth, Postgres, Storage, and RLS in one backend.
- The stack fits public discovery plus authenticated dashboards.
- RLS provides a second authorization layer beyond application code.

Negative:

- RLS policies must be designed and tested carefully.
- Preview and production environment variables must not point at the wrong Supabase project.
- Some admin workflows may require server-only service-role access, which must be tightly contained.
- Supabase SSR auth conventions can change, so implementation agents must verify current docs before coding.
