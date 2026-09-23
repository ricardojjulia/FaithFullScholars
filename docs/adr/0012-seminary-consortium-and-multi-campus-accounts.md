# ADR 0012: Seminary Consortia & Multi-Campus System Accounts

## Status
Accepted (Phase 11 — Enterprise Theological Systems)

## Date
2026-09-23

## Context & Motivation
Accredited theological education operates under distinctive structural models compared to standard higher education institutions:
1. **Multi-Campus Systems**: Denominational and inter-denominational seminaries often operate across multiple autonomous regional campuses sharing a single Board of Trustees, provost office, or confessional charter (e.g., Reformed Theological Seminary operates campuses in Jackson, Orlando, Charlotte, Atlanta, Dallas, and Washington, D.C.).
2. **Regional & Confessional Consortia**: Seminaries frequently form cooperative federations for cross-registration, shared adjunct appointments, and visiting lectureships without merging their corporate identities (e.g., Association of Reformed Theological Seminaries [ARTS], Boston Theological Interreligious Consortium [BTI], Association of Chicago Theological Schools [ACTS]).
3. **Faculty Sharing & Compliance**: When an adjunct professor or guest lecturer is vetted for confessional alignment and credentials at one campus or member seminary, sister campuses frequently desire to engage that scholar without duplicating lengthy multi-month doctrinal vetting.

Prior to ADR 0012, FaithFull Scholars treated all institutions as isolated, independent entities with distinct billing and inquiry quotas. This forced multi-campus seminaries to register redundant accounts or share generic logins.

## Decision
We implement a first-class **Consortium & Multi-Campus System Account** architecture:
1. **Data Model**:
   - `public.consortiums`: Represents the legal federation, association, or system (e.g., "Association of Reformed Theological Seminaries"). Contains `id`, `name`, `slug`, `description`, `website`, `lead_institution_id`, `created_at`, `updated_at`.
   - `public.consortium_members`: Many-to-many relationship linking `institutions` to `consortiums`. Contains `id`, `consortium_id`, `institution_id`, `role` (`'lead' | 'member' | 'affiliate'`), `status` (`'active' | 'pending' | 'inactive'`), `joined_at`.
2. **Row-Level Security (RLS) & Isolation**:
   - All consortium tables have `FORCE ROW LEVEL SECURITY`.
   - Public visitors may read active consortiums and approved member institutions.
   - Lead institutions and system administrators can manage consortium memberships, add sister campuses, and update federation profiles.
   - Unauthenticated write access is strictly prohibited.
3. **Database Performance & Splinter Compliance**:
   - Covering indexes on foreign keys: `idx_consortiums_lead_institution`, `idx_consortium_members_consortium`, `idx_consortium_members_institution` (Splinter 0001).
   - Auth functions wrapped in scalar subqueries `(SELECT auth.uid())` (Splinter 0003).
   - Search path pinned on `set_updated_at` trigger functions (`SET search_path = public, pg_temp`) (Splinter 0011).
4. **Application Surface**:
   - Dean portal workspace: `/institution/consortium` displaying sister campuses, leadership designations, and faculty discovery links.
   - API endpoints: `GET /api/institution/consortium`, `POST /api/institution/consortium`, `POST /api/institution/consortium/members`, `DELETE /api/institution/consortium/members`.
   - Navigation links in `InstitutionNav`, `UserMenu`, and `PublicFooter`.
5. **Security Hardening**:
   - AI Matcher endpoint `POST /api/ai/match-faculty` is hardened to require authenticated institutional accounts with active Verified Seminary or Premier Partner tier.

## Consequences & Trade-offs
- **Positive**:
  - Eliminates administrative friction for enterprise seminaries with multiple branch campuses.
  - Allows collaborative sharing of candidate dossiers and adjunct pools while preserving strict institutional boundaries.
  - Aligns FaithFull Scholars directly with existing governance structures in theological higher education.
- **Trade-offs / Mitigations**:
  - Additional relational complexity in permissions; mitigated by clear lead institution roles and deterministic RLS policies.
  - Privacy boundaries between member campuses must be preserved (e.g. private draft contracts remain confidential to the hiring institution).
