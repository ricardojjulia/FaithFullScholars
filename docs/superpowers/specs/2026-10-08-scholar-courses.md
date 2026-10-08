# Spec: Real "My Courses" for Scholars

- **Status:** Story and technical brief approved by the owner on 2026-10-08 (gates 3 and 5).

## Problem
`/dashboard/courses` is a client page seeded with `INITIAL_COURSES` fixtures.
- Adding a course, or toggling Draft/Publish, only changes the page's local state. Nothing is saved and everything is lost on reload.
- "Edit syllabus" is a dead link.
- The vocabulary doesn't match the database:
  - level is free text, but the database allows only undergraduate, graduate, doctoral, certificate or lay_education;
  - "draft/published" is used, but the database has visibility = public, unlisted or private;
  - discipline is a name, not an id;
  - the delivery modes differ.
- No course API exists.

## Story
As a **scholar**, I create, edit, publish or unpublish, and delete my courses on "My courses". They are saved, and when published they appear on the public course catalogue and my profile.

### Acceptance criteria
1. `/dashboard/courses` is a server page.
   - It is guarded to a signed-in scholar.
   - It loads only that scholar's courses with the user's own permissions.
   - If loading fails it shows an error panel, never sample data.
2. **Create course.** The scholar enters a title, description, level, primary discipline, delivery modes and reading list.
   - Level, discipline and delivery modes come from the database's allowed values.
   - A new course is **private until the scholar publishes it** (owner decision).
3. Edit uses the same validation. Publish and unpublish toggle visibility between public and private, and unlisted is offered as an option.
4. **Delete.**
   - The scholar must confirm first.
   - Deletion is **blocked when the course has licensing agreements** (owner decision). The scholar sees a clear message suggesting they make it private instead.
5. The server never accepts a `scholar_id` from the client. A scholar cannot read, edit or delete another scholar's course; the database enforces this and tests prove it.
6. Free text is validated with length limits. Delivery modes use an allow-list, because the public pages render them.
7. Courses stay self-service: they are not admin-reviewed. ADR 0025 records this as an accepted risk.
8. **Tests:**
   - real-role isolation between scholars;
   - anonymous visitors see only public courses of approved scholars;
   - route unit tests;
   - a regression test so `INITIAL_COURSES` can't return;
   - E2E: create, then publish, then the course appears on `/courses`, then delete.

### Non-goals
- Syllabus file upload.
- The sample-video field.
- The AI syllabus tagger.

## Technical brief
- **No migration needed.** The `courses` RLS policy "Scholars manage own courses" (FOR ALL, owner or admin; WITH CHECK implied) and the `course_disciplines` owner policies already cover create, read, update and delete.
- **`lib/courses/course-validation.ts`** (pure functions):
  - title: 1–200 characters;
  - description and reading list: up to 5000 characters each;
  - level: must be one of the database CHECK values;
  - visibility: public, unlisted or private;
  - delivery modes: an allow-list matching the TypeScript `DeliveryMode`;
  - discipline ids: UUIDs, at most 5;
  - a `slugify` helper that adds a per-scholar suffix when a slug is taken (the database has `UNIQUE(scholar_id, slug)`).
- **Routes**, all using the user client, `getSessionContext` and `session.scholarId`, never a body-supplied `scholar_id`:
  - `app/api/scholars/courses/route.ts`:
    - **GET:** lists the scholar's own courses.
    - **POST:** creates a course with visibility forced to private, and sets `course_disciplines`.
  - `app/api/scholars/courses/[id]/route.ts`:
    - **PATCH:** updates allow-listed fields, including visibility, and replaces `course_disciplines`.
    - **DELETE:** counts `course_licensing_agreements` first and refuses with 409 if any exist. Otherwise it deletes. An id that isn't the scholar's returns 404.
  - Error behaviour: 401 when signed out; 503 when the account lookup fails; 404 when the user has no scholar profile; error logs record codes only.
- **UI:**
  - `app/dashboard/courses/page.tsx` becomes a server page: `requireSignedIn`, then load the scholar's courses and the disciplines list, then render `components/scholar/courses-manager.tsx` (client).
  - The manager has: a form with selects backed by the database lists; edit in a modal; a publish/unpublish toggle; delete with a confirm step and the 409 message; empty and error states; accessible labels.
  - `INITIAL_COURSES` is removed.
- **Tests:**
  - Unit: the validator; the routes (401, 404, ignoring a body `scholar_id`, the licensing 409).
  - Real-role integration: scholar A cannot read B's private course, or update, delete or insert it; A cannot add `course_disciplines` to B's course; anonymous visitors see only public courses of approved scholars.
  - Regression: `INITIAL_COURSES` stays gone.
  - E2E: create, publish, the course appears on `/courses`, then delete. It cleans up after itself.
  - Remove the `page:/dashboard/courses` test-surface exemption, and add `covers()` tags for the new routes.
- **Docs:** CHANGELOG, README, feature catalog (remove the courses-fixture note), plan.
