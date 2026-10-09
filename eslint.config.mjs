import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Service-role wall (ADR 0022, Council Review 12 Wildcard proposal 3).
  // createAdminClient() bypasses Row Level Security, so request paths must use
  // the caller's RLS-scoped client. Every allowed importer below is a reviewed
  // exception: staff-only modules behind verifyStaffUser/requireStaffPage,
  // server-only reads whose result is never returned, signup provisioning, and
  // telemetry / rate-limit storage. Adding a file here is a security review item.
  {
    files: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase/server",
              importNames: ["createAdminClient"],
              message:
                "createAdminClient bypasses RLS. Use the caller's client (createClient) or add this file to the reviewed allow-list in eslint.config.mjs.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "lib/admin/actions.ts",
      "lib/admin/queries.ts",
      "lib/auth/auth-actions.ts",
      "lib/feedback/rate-limit.ts",
      "lib/feedback/store.ts",
      "lib/inquiries/actions.ts",
      "lib/rate-limit/limiter.ts",
    ],
    rules: { "no-restricted-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
