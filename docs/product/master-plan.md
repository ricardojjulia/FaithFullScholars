# FaithFull Scholars Product Master Plan

## Executive Summary

FaithFull Scholars is a LinkedIn-like discovery and showcase platform for professors of theological and biblical colleges. The first product should not try to become a full hiring marketplace immediately. The strongest starting point is a trusted scholar profile network that makes professors easy to find, evaluate, and contact while also helping colleges discover teaching capacity across institutions.

The platform should showcase scholars as complete academic and ministry practitioners: academic credentials, theological disciplines, institutional affiliation, denominational or tradition context, publications, CV, courses offered, availability, languages, media, and sample teaching content. It should also help schools answer practical questions: Who can teach Pauline Epistles online next semester? Who is available for a one-week intensive in Spanish? Who has a free public lecture series we can review before reaching out?

## Product Thesis

Theological and biblical colleges often need specialized teaching capacity, but discovery is fragmented across school websites, personal pages, PDFs, conference programs, YouTube channels, and informal networks. FaithFull Scholars can become the trusted directory where qualified scholars maintain one current academic profile and institutions discover them through structured filters.

## Primary Audiences

### Scholars

Professors, adjunct faculty, independent scholars, retired professors, doctoral supervisors, visiting lecturers, and ministry educators who want a professional academic presence that is more targeted than LinkedIn.

Their goals:

- Maintain a credible public profile.
- Publish CV, publications, credentials, areas of expertise, and theological traditions.
- Showcase courses, sample modules, lectures, syllabi, and free content.
- Signal availability without receiving unqualified inquiries.
- Expand teaching, speaking, writing, and consulting opportunities.

### Institutions

Theological colleges, seminaries, Bible colleges, ministry training institutes, Christian universities, churches, denominational training offices, and mission organizations.

Their goals:

- Find qualified scholars by discipline, experience, tradition, location, language, and delivery format.
- Review CVs, publications, and sample teaching content before initiating contact.
- Discover adjuncts, guest lecturers, online instructors, course reviewers, curriculum consultants, and subject-matter experts.
- Reduce dependency on informal referral networks.

### Learners and Public Visitors

Students, pastors, church leaders, researchers, and lifelong learners who want to discover scholars and free theological learning content.

Their goals:

- Find trustworthy free lectures, sample courses, syllabi, and reading lists.
- Follow scholars by discipline or tradition.
- Discover courses they might take through partner institutions.

## MVP Scope

The MVP should focus on credibility, discoverability, and contact readiness.

Platform baseline:

- Vercel hosts the Next.js application and provides preview/production deployments from Git.
- Supabase provides authentication, Postgres data storage, Row Level Security, and object storage for CV/profile assets.
- YouTube and external websites remain the media hosting layer for video and public course content.

In scope:

- Scholar profile pages.
- Scholar onboarding and profile editing.
- Structured CV and publication records.
- Course showcase pages.
- Free content embeds and links, especially YouTube.
- Availability status and opportunity types.
- Search and browse by discipline, institution, tradition, language, delivery mode, and availability.
- Institution inquiry flow.
- Admin review and verification workflow.
- Basic analytics for profile views and inquiry counts.

Out of scope for the MVP:

- Payments.
- Contract generation.
- Background checks.
- Formal HR workflows.
- Full learning management system.
- Video hosting.
- Credential verification automation.
- Messaging inbox with long-running conversations.
- Social feed.
- Endorsements and recommendations.

## Feature Pillars

### 1. Scholar Identity

Each scholar profile should answer: Who is this person academically, theologically, and professionally?

Core fields:

- Full name, preferred title, profile photo.
- Current institution and role.
- Academic credentials and awarding institutions.
- Denominational, confessional, or tradition affiliations when the scholar chooses to disclose them.
- Areas of expertise.
- Biography.
- Languages.
- Location and remote availability.
- Personal website and social links.
- Contact preference.

### 2. Academic Portfolio

The portfolio should make a scholar inspectable without forcing institutions to request PDFs first.

Core records:

- CV file and structured CV highlights.
- Publications.
- Conference papers.
- Books and chapters.
- Research interests.
- Supervision areas.
- Grants, fellowships, and awards.

### 3. Course Showcase

Courses are central because institutions often search for teaching capacity by course need.

Course fields:

- Course title.
- Discipline and level.
- Description.
- Delivery modes: online, in-person, hybrid, intensive, asynchronous.
- Sample syllabus link or upload.
- Free preview content.
- YouTube lecture links or playlists.
- Reading list.
- Target audience.
- Availability to teach, license, adapt, or guest lecture.

### 4. Availability and Opportunities

Availability should be structured enough for filters but simple enough that scholars maintain it.

Opportunity types:

- Adjunct course.
- Guest lecture.
- One-week or weekend intensive.
- Online module.
- Course licensing.
- Curriculum review.
- Doctoral supervision.
- Thesis advising.
- Conference speaking.
- Church or ministry training.

Availability fields:

- Open, limited, unavailable, or by request.
- Earliest available term.
- Preferred delivery modes.
- Travel willingness.
- Time zone.
- Languages.
- Institution types served.

### 5. Discovery

Search should serve institutions first and public visitors second.

Filters:

- Discipline.
- Biblical book or theological topic.
- Course type.
- Availability.
- Delivery format.
- Language.
- Institution.
- Tradition or denomination.
- Region.
- Credential level.
- Free content available.

### 6. Trust and Governance

The product must avoid becoming an uncurated directory of unverifiable claims.

Trust mechanisms:

- Admin-reviewed scholar profiles before public listing.
- Visible profile status: self-reported, institution-affiliated, or verified.
- Clear disclosure that theological tradition fields are self-disclosed unless verified.
- Report profile issue flow.
- Institution accounts for formal inquiries.
- Content moderation for public descriptions and links.

## Product Layout

### Public Surfaces

- Home and search entry.
- Scholar directory.
- Scholar profile.
- Course directory.
- Course detail.
- Public topic pages for SEO: Biblical Studies, Systematic Theology, Church History, Missions, Counseling, Homiletics, Christian Education, Languages, and Ministry Leadership.

### Authenticated Scholar Surfaces

- Profile editor.
- CV manager.
- Publication manager.
- Course manager.
- Availability manager.
- Inquiry list.
- Profile preview.

### Authenticated Institution Surfaces

- Institution profile.
- Saved scholars.
- Saved courses.
- Inquiry composer.
- Inquiry history.
- Shortlist export.

### Admin Surfaces

- Scholar review queue.
- Profile verification notes.
- Reported content queue.
- Taxonomy manager.
- Institution approval queue.
- Platform metrics.

## Suggested Information Architecture

```text
/
/scholars
/scholars/:slug
/courses
/courses/:slug
/topics/:slug
/institutions/:slug
/dashboard
/dashboard/profile
/dashboard/cv
/dashboard/publications
/dashboard/courses
/dashboard/availability
/dashboard/inquiries
/institution
/institution/saved
/institution/inquiries
/admin
/admin/reviews
/admin/taxonomy
/admin/reports
```

## MVP Success Criteria

The MVP is successful when:

- The app can deploy to Vercel with environment-specific Supabase configuration.
- Supabase Auth supports scholar, institution, and admin sessions.
- Supabase RLS prevents public or cross-account access to draft/private records.
- A scholar can create a credible profile and submit it for review.
- An admin can approve the profile for publication.
- A public visitor can search scholars and courses.
- An institution can find scholars by availability and course area.
- An institution can send a structured inquiry.
- A scholar can respond using their preferred contact path.
- Free course content can be surfaced through links and YouTube embeds without hosting video.

## Future Ideas

These should be considered after MVP evidence:

- Institution subscription tiers.
- Scholar premium profiles.
- Course licensing workflows.
- Booking and contract workflow.
- Verified credential integrations.
- Peer endorsements.
- Conference speaker directory.
- Theological society partnerships.
- Seminary consortium accounts.
- Public lecture playlists by doctrine, book of the Bible, or ministry topic.
- AI-assisted profile import from CV PDFs with scholar review before publishing.
- AI-assisted course tagging from syllabi.
- AI search assistant for institutions with strict citation back to profile fields.
