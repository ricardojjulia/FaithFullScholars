# Vercel and Supabase Deployment

## Baseline

FaithFull Scholars should run as a Next.js App Router application on Vercel with Supabase as the backend for Auth, Postgres, Row Level Security, and Storage.

## Vercel

Use Vercel Git integration as the default deployment path:

- Pull requests create preview deployments.
- Merges to `main` create production deployments.
- Preview deployments are the review environment for UI, workflow, and authorization checks.
- Production deployments should happen only after tests, RLS checks, and smoke tests pass.

Required Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_ID`

Rules:

- Never commit `.env.local`.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code.
- Never prefix service-role credentials with `NEXT_PUBLIC_`.
- Use separate preview and production values when possible.

## Supabase

Use Supabase for:

- Auth.
- Postgres.
- Row Level Security.
- Storage for CV files, profile images, and course documents.

Required controls:

- Enable RLS on every table in exposed schemas.
- Store platform roles in app-controlled tables or app metadata, not user-editable metadata.
- Keep profile publication status separate from credential verification status.
- Store CV files private by default.
- Allow public storage reads only for explicitly public files tied to approved profiles or courses.
- Keep migrations in `supabase/migrations/`.

### Applying production migrations (Release workflow)

Migrations are applied by the **Release** workflow (`.github/workflows/release.yml`). It never runs automatically.

1. **One-time setup.** Under **GitHub → Settings → Environments → production**:
   - Add the secrets `SUPABASE_ACCESS_TOKEN` (Supabase → Account → Access Tokens) and `SUPABASE_PROJECT_REF`. Optionally add `SUPABASE_DB_PASSWORD`, if the CLI asks for the database password.
   - **Required reviewers is optional.** The owner chose automatic approval, so the production environment has no required reviewer today and runs proceed without a click. Turning it on adds a manual gate before a run can read the secrets. Safety currently rests on manual dispatch, a dry run by default, the migration preflights, and Claude Code's own permission prompt.
2. **Dry run.** Go to **Actions → Release → Run workflow**, choose the branch that holds the migration, and leave **dry_run** ticked. Approve the run if a required reviewer is configured. The "Plan" step lists the migrations that would be applied; check it is exactly what you expect.
3. **Apply.** Run it again with **dry_run** unticked (and approve it if a required reviewer is configured).
4. **Verify.** Check the migration's verify queries (grants, triggers, RLS) in the SQL Editor or with a read-only script, then merge the PR so Vercel deploys the app.

**Order:** migrations apply in timestamp order. If a PR's new routes need its tables, apply the migration before merging; otherwise merging first is fine. The preflight blocks inside each migration abort without changes on unsafe data.

## Local Development

Expected local setup after the app scaffold exists:

```bash
npx supabase init
npx supabase start
npx supabase db reset
vercel pull --yes
npm run verify
```

## Release Checks

Before production deployment:

- Vercel build passes.
- Supabase migrations are reviewed and applied.
- RLS policies are tested for public, scholar, institution, and admin roles.
- Storage policies are tested for CV files and public profile assets.
- Public pages do not expose draft or hidden profiles.
- Admin review actions are admin-only.
- Institution inquiry routes are authenticated and rate-limited.
