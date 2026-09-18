# Minimal Check-In Policy — FaithFull Scholars

This repository is intended for lawful, constructive, and responsible academic showcase and institutional discovery. To reduce the risk of abuse, data exposure, or platform instability, every code or content check-in must follow these minimum rules:

1. **No secrets or private data**: Do not commit API keys, service role keys, passwords, session tokens, scholar PII, private CV drafts, institutional contact details, or confidential inquiry records.
2. **No harmful functionality**: Do not add malware, credential theft, authorization evasion, spam mechanisms, unvetted web scrapers, or abuse-enabling code or instructions.
3. **Respect authorization boundaries**: Code that interacts with databases, storage, profiles, or inquiries must require proper authorization and enforce PostgreSQL Row Level Security (RLS) policies. Never bypass access controls or rely solely on application-layer checks.
4. **Multi-tenant data isolation**: Scholars own their draft revisions and private files; institutions own their private inquiries and shortlists; public visitors may only access approved snapshots; admins review drafts.
5. **Safe AI and automation use**: AI-generated or automated changes must be verified against the software factory protocol before check-in. The Council review and `pr-review` gates must sign off before non-trivial merges.
6. **Dependency hygiene**: Avoid unnecessary or unvetted dependencies. Write an ADR under `docs/adr/` before introducing any non-standard package.
7. **Security review for risky changes**: Changes involving authentication, Supabase RLS, profile publishing status, storage bucket permissions, or institutional inquiry vetting require explicit security verification.
8. **Traceability**: Use clear, conventional commit messages and pull request descriptions so reviewers can understand the purpose, architecture impact, and risk profile of each change.

If a proposed change could compromise scholar privacy, institutional confidentiality, or platform credibility, do not check it in until it has been redesigned, documented, and reviewed.
