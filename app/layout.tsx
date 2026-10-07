import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { DevToolbar } from "@/components/dev/dev-toolbar";
import { FeedbackShell } from "@/components/feedback/feedback-shell";
import { I18nProvider } from "@/lib/i18n/i18n-context";

// Fonts are self-hosted (latin subset, variable weight; SIL OFL 1.1, licenses in
// app/fonts/) so builds never depend on downloading from Google Fonts.
const sansFallback = localFont({
  src: "./fonts/plus-jakarta-sans-latin-var.woff2",
  variable: "--font-sans-fallback",
  weight: "400 800",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin-var.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FaithFull Scholars | Theological Faculty Network",
  description:
    "A professional network for discovery and academic showcase in theological and biblical higher education.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${sansFallback.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans">
        <FeedbackShell>
          <I18nProvider>{children}</I18nProvider>
        </FeedbackShell>
        <DevToolbar />
      </body>
    </html>
  );
}
