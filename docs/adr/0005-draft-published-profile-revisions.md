# ADR 0005: Draft and Published Profile Revisions

## Status

Accepted

## Context

ADR 0003 established that all public scholar profiles must be admin-reviewed prior to publication. However, in a naive single-record model (`profile_status = draft | submitted | approved`), when an approved scholar edits their bio, credentials, or availability, either:

1. The entire profile immediately reverts to `draft` or `submitted`, removing the scholar from the public directory until an admin re-approves the edit (poor user experience and unannounced profile disappearances).
2. The edits bypass review and immediately go live, allowing an approved scholar (or compromised account) to publish false credentials, spam, or inappropriate content without moderation (severe platform trust vulnerability).

## Decision

The platform will decouple the live, publicly visible scholar profile from working drafts by using a **Revision Staging Model**:

- An approved scholar profile remains published and publicly discoverable at its canonical URL.
- When an approved scholar makes modifications, changes are saved to an active `draft` revision.
- The scholar can preview their changes in the dashboard and submit the revision for review.
- While the revision is in `submitted` review status, the public continues to see the previously approved published snapshot.
- Upon admin approval, the revision is promoted to the published snapshot.
- An admin review queue will display a structured diff comparing the currently published profile with the submitted revision.

## Consequences

Positive:

- Approved scholars remain publicly visible and searchable without interruption while updating their information.
- All modifications to public-facing content remain subject to admin moderation before becoming visible to institutions and the public.
- Admins can review structured diffs rather than re-reading the entire profile from scratch.
- Full audit history of profile revisions is preserved.

Negative:

- Requires a more sophisticated data model (e.g., separating immutable/identity fields from revisionable profile attributes, or maintaining a `scholar_profile_revisions` table).
- Frontend editing forms must manage state against the working draft rather than directly mutating the published profile.
- Increases initial implementation complexity for Phase 1 and Phase 4.
