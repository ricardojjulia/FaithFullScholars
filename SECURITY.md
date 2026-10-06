# Security Policy

## Supported Versions

FaithFull Scholars is in active pre-production (pilot) development. Security fixes are applied to the latest `main` branch.

| Version | Supported |
| :--- | :--- |
| `main` | Yes |
| `0.1.x` | Yes |
| Older snapshots | No |

---

## What We Protect

FaithFull Scholars holds **special-category personal data** (GDPR Art. 9): religious affiliation, confessional standards and doctrinal statements. It also holds CVs, unpublished profile drafts, institutional search shortlists and private inquiries. The highest-risk surfaces are:

1. **PostgreSQL Row Level Security (RLS)**
   - Every public table has RLS enabled and forced, with policies keyed on the signed-in user (`auth.uid()`) and on ownership: the scholar's own profile and revisions, and the institution's own shortlists and inquiries.
   - Application-level filtering is never the only protection.
2. **Trust columns**
   - Account roles, profile publication and verification status, institution status and scholar tiers are changed only by admins or the service role.
   - Fail-closed guard triggers enforce this ([ADR 0022](docs/adr/0022-session-derived-identity-and-rls-helper-isolation.md), [ADR 0023](docs/adr/0023-trust-guards-phase2-and-policy-matrix.md)).
3. **Identity**
   - Identity is always derived from the session.
   - A client-supplied identifier is never used for an authorization decision.
4. **Secrets**
   - `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` must never reach client bundles, logs or error messages.
   - An ESLint rule blocks importing the service-role client from user-facing code.
5. **Errors and input**
   - Responses carry generic messages. Raw database errors, SQL detail and stack traces are never returned.
   - All external input is validated at the system boundary.

Security gates are trusted only after they are shown to **fail on a genuinely bad state**. See [`AGENTS.md`](AGENTS.md).

---

## Reporting a Vulnerability

Do **not** disclose suspected vulnerabilities in public issues, discussions or pull requests.

Report them privately through GitHub's **Private Vulnerability Reporting**, under this repository's **Security** tab ("Report a vulnerability").

Please include:
- a description of the vulnerability and its real-world impact (for example, which persona can read or change which data);
- the affected routes, server actions, tables or SQL policies;
- step-by-step reproduction instructions or a proof of concept, using **test data only**;
- a suggested mitigation, if you have one.

Maintainers will acknowledge receipt, validate severity and prepare a coordinated fix before public disclosure.
