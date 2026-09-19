---
name: language-translation
description: >
  Five-phase pipeline that fully translates any Node.js frontend app into a new language.
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

Five execution phases work in sequence to add a complete new language to a Node.js application.
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
Every phase reads from and writes to this file — it is the handoff mechanism between steps.

---

## Phase 1 — Stack Detector & UI Text Mapper

**What it must do:** Detect the full stack, then build a complete inventory of every user-facing string in the codebase.

### PART A — Stack Detection
Read project files:
- `package.json` (root and any workspace packages)
- Any `tsconfig.json`
- Any `vite.config.*`, `next.config.*`, `nuxt.config.*`, `svelte.config.*`
- `.env` or `.env.example` (look for `SUPABASE_URL` or similar)

Determine and record as `stack_info`:
```json
{
  "framework": "react|next|vue|nuxt|svelte|other",
  "typescript": true,
  "ui_library": "mantine|mui|shadcn|antd|chakra|tailwind|other|none",
  "package_manager": "pnpm|npm|yarn|bun",
  "monorepo": false,
  "source_extensions": [".jsx", ".tsx"],
  "i18n_library": {
    "name": "react-i18next|next-intl|lingui|i18next|vue-i18n|custom|none",
    "package": "npm package name if found",
    "locale_dir": "path to existing locale/translation files if found",
    "existing_locales": ["en"],
    "hook_or_function": "t()|useTranslation()|useTranslations()",
    "key_format": "flat|nested|dot-notation",
    "file_format": "json|yaml|po|ts"
  },
  "supabase": {
    "detected": true,
    "translations_table": "name of translations table if one exists, else null"
  },
  "app_context": "2–3 sentence description of what the app does"
}
```

### PART B — UI Text Scan
Scan all source files matching `stack_info.source_extensions` under `app/`, `src/`, `components/`, `features/`, `pages/`:
- Skip: `node_modules/`, `dist/`, `.next/`, `.git/`, `coverage/`
- For each hardcoded user-facing string, record:
  ```json
  {
    "type": "hardcoded",
    "text": "literal string",
    "file": "relative/path/to/file.tsx",
    "line": 42,
    "context": "Button label or heading",
    "category": "label|error|placeholder|notification|navigation|button|heading|tooltip|other"
  }
  ```
- Capture: text between JSX tags, string props (`placeholder`, `label`, `title`, `aria-label`, `alt`, `description`).
- Skip: `console.log`, import paths, variable names, CSS classes, URLs, UUIDs, SQL queries.

Write results to `/tmp/translation-<LOCALE_CODE>.json`.

---

## Phase 2 — Translator

**What it must do:** Produce accurate, context-aware first-draft translations.

1. Read `/tmp/translation-<LOCALE_CODE>.json`. Use `text_map` for strings and `stack_info.app_context` for domain register.
2. For theological apps like FaithFull Scholars: use dignified, accurate theological vocabulary and ecclesiastical phrasing in `<TARGET_LANGUAGE>`.
3. For each string produce:
   ```json
   {
     "original": "original text",
     "translation": "<TARGET_LANGUAGE> translation",
     "key": "suggested.i18n.key.in.dot.notation",
     "category": "same category as input",
     "notes": "notes on nuance or formal theological terms"
   }
   ```
4. Append to `/tmp/translation-<LOCALE_CODE>.json` under `"translations_draft"`.

---

## Phase 3 — Native Speaker Evaluator

**What it must do:** Ensure every translation sounds natural to a native speaker and uses correct domain vocabulary.

Evaluate every entry against 5 criteria:
1. **Naturalness**: Would a native speaker actually say this in a professional UI?
2. **Register**: Correct formality for theological faculty and academic deans.
3. **Domain terminology**: Correct vocabulary for theology, biblical languages, confessional standards, and degree accreditations.
4. **Idioms**: Avoid phrases that sound foreign or machine-translated.
5. **Consistency**: Uniform translation of key repeated terms.

Produce `"translations_approved"` array and `"qa_summary"` with terminology decisions in `/tmp/translation-<LOCALE_CODE>.json`.

---

## Phase 4 — Code Generator

**What it must do:** Write all code — locale files, key registrations, component updates, and language switcher.

1. **Locale file creation**: Place the new locale file in the detected path (`messages/<lang>.json` or `public/locales/<lang>/translation.json`).
2. **Register locale**: Update configuration / middleware to recognize `<LOCALE_CODE>`.
3. **Replace hardcoded strings**: Update components from `text_map` to use translation hooks/functions.
4. **Language switcher**: Update or create a `LanguageSwitcher` component in the universal navigation bar.
5. **Append summary**: Add `"implementation_summary"` to `/tmp/translation-<LOCALE_CODE>.json`.

---

## Phase 5 — QA Verifier

**What it must do:** Verify the full implementation. Restart the pipeline on any failure (max 3 restarts).

Checks:
1. **Source files**: Confirm hardcoded strings from `text_map` now use translation calls.
2. **Locale file**: Confirm no missing keys and no values left in English.
3. **Registration**: Confirm `<LOCALE_CODE>` is in the active locale list.
4. **Switcher**: Verify `<TARGET_LANGUAGE>` is selectable in the UI.
5. **Build & Lint**: Run `npm run lint && npm run typecheck && npm run test && npm run build`.

Write results to `/tmp/translation-<LOCALE_CODE>.json` under `"qa_results"`.
If issues remain and attempts < 3, restart from Phase 1 with unresolved issues context.
When `qa_results.passed === true`, report success.
