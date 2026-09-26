# ADR 0018: Doctoral Dissertation Supervision & External Committee Reader Exchange

## Status
Accepted (Council Review #8 / Post-MVP Platform Capability)

## Context
Under ATS (Association of Theological Schools) Standards 4 and 5, accredited Th.M., Ph.D., and D.Min. degree programs require external dissertation readers, thesis advisors, or defense committee examiners possessing terminal doctorates in specialized sub-disciplines. Seminary deans and doctoral program directors frequently struggle to discover qualified, confessionally compatible external readers, resorting to ad-hoc personal networks. Concurrently, qualified theological scholars (professors, researchers, and distinguished fellows) seek external examination opportunities for scholarly prestige, peer engagement, and standard academic honorariums ($500–$2,500), but lack a structured discovery mechanism to signal their supervisory availability, areas of expertise, and annual candidate capacity.

## Decision
1. Activate and formalize `availability_profiles.doctoral_supervision` and `inquiries.inquiry_type = 'doctoral_supervision'`.
2. Implement `<ScholarDoctoralSupervisionCard />` on `/scholars/[slug]` showcasing verified doctoral research supervision areas, dissertation committee capacity (e.g. max 2 dissertations/year), examination defense formats (virtual / hybrid / on-campus), and direct 1-click inquiry dispatches.
3. Enhance `StructuredInquiryModal` and `lib/inquiries/inquiry-service.ts` to support specialized doctoral committee inquiries with structured metadata (degree program: Ph.D. / Th.M. / D.Min., dissertation working title, anticipated defense term, and honorarium range).
4. Maintain 100% symmetric bilingual English (`en.json`) and Spanish (`es.json`) localization across all doctoral supervision interface elements.
5. Provide comprehensive unit testing validating doctoral supervision inquiry validation and component state rendering.

## Consequences
- **Positive**: Solves a critical administrative and accreditation requirement for Seminary Deans and Doctoral Directors.
- **Positive**: Generates meaningful academic engagement and honorarium opportunities for theological faculty.
- **Data Model**: Seamlessly builds upon existing `public.availability_profiles` and `public.inquiries` schemas without requiring destructive database migrations.
- **Security & RLS**: Fully protected by existing multi-tenant Row Level Security policies governing inquiries and profile availability.
