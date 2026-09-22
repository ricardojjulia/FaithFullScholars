# Council Review 4 — Agent 3: UX & Shell Quality Audit

> **Date:** September 22, 2026  
> **Auditor:** Council Agent 3 (UX & Shell Architect)  
> **Status:** READ-ONLY AUDIT COMPLETE  
> **Target Scope:** Item 1 (Live Pilot Launch Readiness) & Item 2 (Tiered Subscriptions & Booking Contracts Workflow)

---

## 1. Design System & Typography Alignment

- **Design System Consistency:** Contracts and Subscriptions must strictly adopt the LinkedIn-grade academic aesthetic (ADR 0007) with Aptos / clean modern sans geometric typography (`font-sans`), crisp elevated card surfaces (`bg-card border border-border shadow-xs rounded-xl`), and edge vector iconography (`lucide-react`).
- **Milestone Progress Tracking:** Implement clear visual stepper indicators (`lucide-react` `CheckCircle2`, `Clock`, `AlertCircle`) for contract progression: `Draft` → `Offered` → `Accepted` → `In Progress` → `Completed`.

---

## 2. Accessibility & Interaction Polish

1. **Accessible Badges & States:** Contract state badges must have high contrast and explicit `aria-label` tags.
2. **Empty States & CTAs:**
   - Empty contract inbox on `/dashboard/contracts` must clearly explain the agreement lifecycle.
   - Institutional subscription view must provide transparent quota consumption meters (e.g. `12 / 25 Inquiries used this month`).
3. **Form Accessibility:** Contract creation modal must use semantic form labels, currency formatters, and explicit required field indicators.
