# FaithFull Scholars HOWTO

Practical commands for running, testing and contributing to FaithFull Scholars. For the overview see the [README](README.md). For the engineering rules see [`AGENTS.md`](AGENTS.md).

---

## 1. Run The App Locally

### Prerequisites
- **Node.js 24** (the CI version; 20+ works)
- **Docker** (for the local Supabase stack)
- **Supabase CLI** (`brew install supabase/tap/supabase`, or see the Supabase docs)

### Quick Setup
```bash
# 1. Install dependencies
npm install

# 2. Start the local database, auth and storage (prints URLs and keys)
supabase start

# 3. Configure environment
cp .env.example .env.local
# Paste the API URL, anon key and service-role key from `supabase status` into .env.local

# 4. Optional: load the pilot reference cohort (5 approved scholars)
npm run seed:pilot

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3845](http://localhost:3845).

---

## 2. Environment Variables

| Variable | Required | Purpose |
| :--- | :---: | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Public anon key (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ server only | Admin review RPC, seeding and audits. **Never** expose it to the client; ESLint blocks importing it from user code |
| `DATABASE_URL` / `DB_URL` | tests | Direct Postgres URL for integration tests and audits |
| `NEXT_PUBLIC_APP_URL` | optional | Canonical site URL for SEO metadata |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | optional | AI CV and syllabus extraction. A heuristic parser is used without them |
| `TURNSTILE_SECRET_KEY` | optional | Bot protection on public forms |
| `NEXT_PUBLIC_PILOT_FEEDBACK_ENABLED` | optional | Pilot feedback widget |
| `TEST_USER_PASSWORD` | E2E | Per-run password for the E2E personas (generated and masked in CI) |

Never commit `.env.local`. See [`CHECK_IN_POLICY.md`](CHECK_IN_POLICY.md).

---

## 3. Testing & Verification

```bash
# Everything CI requires, in order
npm run verify

# Individual gates
npm run lint               # ESLint (incl. the service-role import wall)
npm run typecheck          # tsc --noEmit
npm run test               # Vitest: unit + integration (integration needs `supabase start`)
npm run test:surface       # every page / route / server action has a covers()-tagged test
npm run audit:rls          # FORCE RLS and policy presence on every public table
npm run audit:security     # Supabase Splinter security advisor
npm run build              # production build
```

### Targeted Test Commands
```bash
npx vitest run tests/unit/<file>.test.ts             # one unit suite
npx vitest run tests/integration/policy-matrix.test.ts   # role-by-column write contract
npx vitest run tests/integration/rls-authenticated.test.ts   # RLS as real signed-in roles
```

### Browser E2E (Playwright)
```bash
export TEST_USER_PASSWORD="$(openssl rand -base64 24)"
node scripts/ci-setup-test-users.mjs   # creates admin / scholar / institution personas (local stack only)
npm run build && npx playwright install chromium
npm run test:e2e
```

The persona script refuses to run against anything except `localhost` or `127.0.0.1`.

---

## 4. Database Migrations

- Add a new timestamped file under `supabase/migrations/`. **Never edit a merged migration.** Fix forward with a corrective migration.
- Every new table needs RLS enabled and forced, owner-keyed policies, and an entry in `tests/integration/policy-matrix.json`.
- Columns that carry trust state (roles, status, verification, tiers) need a guard trigger ([ADR 0022](docs/adr/0022-session-derived-identity-and-rls-helper-isolation.md), [ADR 0023](docs/adr/0023-trust-guards-phase2-and-policy-matrix.md)).
- Prove a new guard works by removing it locally and watching the tests fail.
- Production: run the preflight query, apply the migration in the Supabase SQL editor, verify the grants, then deploy the app.

---

## 5. PR & Contribution Flow

1. Branch from an up-to-date `main` (`git fetch origin` first): `feat/…`, `fix/…`, `docs/…`.
2. Write the tests near the change, then run the targeted tests followed by `npm run verify`.
3. Open a PR using the template. CI must pass all required checks.
4. The **pr-review** gate runs on every PR. Non-trivial PRs also go to the **Council** and the **Documenter** close-out ([`AGENTS.md`](AGENTS.md)).
5. Triage the Copilot review comments, then squash-merge through GitHub. Never push to `main` directly.

See [CONTRIBUTING.md](CONTRIBUTING.md) for commit conventions and review standards.
