---
name: language-translation
description: >
  Five-agent pipeline that fully translates any Node.js frontend app into a new language.
  Use this skill whenever the user says "create language translation <language>", asks to add
  a new language or locale to the app, wants to localize the UI, needs i18n support, or wants
  to translate the frontend into another language — even if they don't say "translation"
  explicitly. Auto-detects the framework (React, Next.js, Vue, Svelte), i18n library
  (react-i18next, next-intl, lingui, i18next, vue-i18n, or custom), TypeScript or JSX,
  Mantine/MUI/shadcn/Tailwind UI, and Supabase-stored translations. Maps all UI text,
  translates it, has a native speaker evaluate and correct it, generates implementation code,
  then QA-verifies the result — restarting the full pipeline if anything is missed.
---

# Language Translation Pipeline

Five agents work in sequence to add a complete new language to a Node.js application.  
The pipeline auto-detects the tech stack and i18n approach before doing any work.

---

## 0 — Setup

Extract `TARGET_LANGUAGE` and `LOCALE_CODE` from the user's request.

Common codes (use ISO 639-1 for others):

| Language   | Code | | Language    | Code |
|------------|------|-|-------------|------|
| Spanish    | es   | | Portuguese  | pt   |
| French     | fr   | | Italian     | it   |
| German     | de   | | Dutch        | nl   |
| Chinese (Simplified) | zh | | Japanese | ja |
| Korean     | ko   | | Arabic      | ar   |

If no language is specified, ask: *"Which language would you like to add?"*

Create a shared state file: `/tmp/translation-<LOCALE_CODE>.json` (empty object `{}`).  
Every agent reads from and writes to this file — it is the handoff mechanism between agents.

---

## Agent 1 — Stack Detector & UI Text Mapper  *(Explore subagent)*

**What it must do:** Detect the full stack, then build a complete inventory of every
user-facing string in the codebase.

Spawn an **Explore** subagent with the task to scan stack information and all user-facing strings, then write to `/tmp/translation-<LOCALE_CODE>.json`.

---

## Agent 2 — Translator  *(claude subagent)*

**What it must do:** Produce accurate, context-aware first-draft translations.

---

## Agent 3 — Native Speaker Evaluator  *(claude subagent)*

**What it must do:** Ensure every translation sounds natural to a native speaker and uses correct domain vocabulary.

---

## Agent 4 — Code Generator  *(claude subagent)*

**What it must do:** Write all code — locale files, key registrations, component updates, language switcher, and Supabase rows if applicable.

---

## Agent 5 — QA Verifier  *(claude subagent)*

**What it must do:** Verify the full implementation. Restart the pipeline on any failure. Maximum 3 restart cycles.
