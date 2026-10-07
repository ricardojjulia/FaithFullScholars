# ADR 0008: Search Abuse Gating, Anti-Scraping Defenses, and PII Protection

- **Status:** Accepted
- **Date:** 2026-09-19
- **Deciders:** Council (Data, Routes, UX, Feature Agents) & Core Engineering
- **Consulted:** Information Security, Institutional Trust & Accreditation

---

## Context

Academic faculty directories and recruitment platforms are frequent targets of:
1. **Automated Scraping & Harvesting**: Predatory publishers, adjunct aggregators, and commercial lead brokers crawl public directories to scrape faculty rosters, emails, and proprietary course syllabi.
2. **Denial-of-Service & Search Abuse**: Unbounded wildcard queries (e.g. searching `%` or multiple loose OR clauses) trigger expensive sequential table scans and database CPU exhaustion.
3. **PII and Data Leakage**: Exposing personal phone numbers, direct email addresses, home addresses, or unapproved draft profile revisions damages institutional trust.

The user explicitly requires full data protection policies, Row Level Security (RLS) enforcement, encryption, segmentation, and strict gating on the search bar to prevent abuse.

---

## Decision

We establish a comprehensive, multi-layer security architecture for search, data exposure, and scraping mitigation:

### 1. Database & Tenant Segmentation
- **PII Isolation**: `accounts` (auth credentials, private emails, phone numbers) is strictly separated from public `scholars`. Public loaders NEVER join `accounts.email` or `accounts.phone_number`.
- **Row Level Security (RLS)**: Enforced 100% on all public tables. Anonymous and public visitors can only read `scholars` where `profile_status = 'approved'` and `courses` where `visibility = 'public'`.
- **Dual-Pointer Staging Isolation (ADR 0005)**: Draft profile updates exist solely in `scholar_profile_revisions` where `status = 'draft'` and are completely invisible to search queries and public scrapers until administratively approved.

### 2. Search Bar Abuse Defense & Rate Limiting
- **Distributed Token-Bucket Rate Limiter**:
  - Anonymous search requests are limited to **15 queries per minute** per client IP / session fingerprint.
  - Authenticated institutional representatives have an allowance of **120 queries per minute**.
  - Rate-limit state is tracked atomically via PostgreSQL table `search_rate_limits` or edge headers. Exceeding limits returns HTTP 429 (`Too Many Requests`) with a `Retry-After` header.
- **Deep Pagination Capping (Anti-Harvesting Wall)**:
  - Anonymous / unauthenticated search queries are strictly capped at **3 pages (max 18 results)**.
  - Attempting to paginate past page 3 presents a graceful LinkedIn-style modal prompting the user to sign in for free to view further faculty.
- **Search Query Sanitization & Complexity Safeguards**:
  - Input strings are sanitized at the server boundary: trimmed, stripped of raw SQL operators (`%`, `_`, `*`), and capped at 100 characters.
  - PostgREST queries avoid combinatorial OR clauses; database queries will transition to PostgreSQL Full-Text Search (FTS) with `GIN` indices.

### 3. Asset Protection & Signed URLs
- Private scholar CVs and full course syllabi are stored in private Supabase Storage buckets.
- Public visitors can inspect course outlines and learning outcomes; full syllabus files require authenticated institutional access via time-limited (15-minute) cryptographically signed URLs.

### 4. Masked Institutional Outreach
- Contacting scholars is facilitated exclusively via structured in-platform inquiries (`inquiries` table). Direct contact details are shared only after the scholar explicitly accepts the opportunity.

---

## Consequences

### Positive
- Prevents automated bots and malicious actors from harvesting the theological scholar database.
- Protects scholars from spam, predatory publishers, and unsolicited recruiting.
- Shields the database from CPU exhaustion and wildcard injection attacks.
- Guarantees compliance with privacy standards and ATS/ABHE expectations.

### Negative / Trade-offs
- Anonymous visitors cannot browse an entire 500-scholar catalog in one uninterrupted session without creating a free account.
- Introduces additional state and validation overhead in search route handlers.

---

## Amendment (2026-10-08, ADR 0026)

The limits in this ADR (15 per minute anonymous, 120 per minute authenticated, 429 with `Retry-After`) were specified but never enforced: nothing in production called the limiter, the legacy RPC was executable by any signed-in user, and the inquiry cap lived in a per-instance in-memory `Map`. [ADR 0026](./0026-persistent-enforced-rate-limits.md) replaces that with a single persistent limiter (`public.check_rate_limit`, service role only), wires it into `/scholars` and `GET /api/postings`, and moves the inquiry cap into a database guard. The legacy `search_rate_limits` table and `check_search_rate_limit` are superseded (the function is service-role only; removal is a follow-up). The limits themselves are unchanged.
