# ADR 0010: Tiered Institutional Subscriptions & Quota Enforcement

## Status
Accepted

## Context
Seminaries, Bible colleges, and theological training institutions have distinct operational needs ranging from single-department adjunct recruitment to campus-wide faculty search committees. A flat or unmetered model neither supports sustainable platform economics nor reflects institutional scale.

## Decision
We implement a three-tiered institutional subscription model:
1. **Basic (Complimentary / Discovery):** Allows basic scholar directory search, public postings exploration, and up to 5 initial outreach inquiries/month with 1 administrator seat.
2. **Verified Seminary ($149/mo or $1,490/yr):** Verified accredited institutions receive 50 inquiries/month, 5 search committee seats, full shortlist export capabilities (CSV & dossier layout), and faculty contract generation.
3. **Premier Partner ($399/mo or $3,990/yr):** Unlimited inquiries, unlimited search committee seats, AI Faculty Matcher priority quota, and institutional endorsement branding.

### Technical Implementation:
- Backed by `public.institution_subscriptions` with 100% PostgreSQL Row Level Security.
- Integrated into inquiry submission and candidate export middleware to enforce quota ceilings cleanly.

## Consequences
- **Positive:** Clear monetization structure for institutional recruitment; prevents candidate spam; scales with seminary size.
- **Negative:** Requires stateful quota tracking and subscription status verification on transactional endpoints.
