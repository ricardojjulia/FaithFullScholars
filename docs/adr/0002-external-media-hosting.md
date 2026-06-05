# ADR 0002: External Media Hosting for MVP

## Status

Accepted

## Context

The product should showcase free course content, lectures, sample modules, and videos. Hosting video directly would require storage, transcoding, streaming, copyright controls, and moderation workflows.

## Decision

The MVP will link to and embed externally hosted media, with YouTube as the first-class video provider.

## Consequences

Positive:

- Lower infrastructure cost.
- Faster implementation.
- Scholars can reuse existing lecture content.
- The platform can focus on discovery and context instead of media operations.

Negative:

- External links can break.
- External providers control availability and playback.
- Metadata may need manual entry unless API integration is added later.
