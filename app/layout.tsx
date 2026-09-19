import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DevToolbar } from "@/components/dev/dev-toolbar";
import { FeedbackShell } from "@/components/feedback/feedback-shell";
import { I18nProvider } from "@/lib/i18n/i18n-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <FeedbackShell>
          <I18nProvider>{children}</I18nProvider>
        </FeedbackShell>
        <DevToolbar />
      </body>
    </html>
  );
}
