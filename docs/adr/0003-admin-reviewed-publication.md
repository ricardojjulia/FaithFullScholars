# ADR 0003: Admin-Reviewed Public Profiles

## Status

Accepted

## Context

The platform will include academic credentials, theological fields, institutional affiliations, CVs, publications, and availability claims. Publishing unreviewed profiles would increase trust and abuse risk.

## Decision

Scholar profiles will remain draft or submitted until approved by an admin. Approval means the profile can be publicly listed. Approval does not automatically mean every credential or claim is independently verified.

Subsequent edits to an approved profile do not unpublish the active listing; instead, they generate a draft revision that must be reviewed and approved by an admin before replacing the live snapshot (see [ADR 0005: Draft and Published Profile Revisions](0005-draft-published-profile-revisions.md)).

## Consequences

Positive:

- Protects platform trust.
- Gives admins a moderation checkpoint for initial onboarding and ongoing edits.
- Allows profile publication and credential verification to remain separate concepts.
- Active public profiles remain discoverable while revisions are in review.

Negative:

- Adds operational workload.
- Scholars may wait before initial profiles go live or revisions take effect.
- Review workflow and revision diffing must be built early.
