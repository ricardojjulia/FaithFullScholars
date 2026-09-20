import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function DevStatusPage() {
  const isDev = process.env.NODE_ENV === "development";
  const enableDevRoutes = process.env.ENABLE_DEV_ROUTES === "true";

  // In production, gate behind admin auth or explicit env toggle
  if (!isDev && !enableDevRoutes) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const role = user?.app_metadata?.role || user?.user_metadata?.role;
      if (role !== "admin") {
        notFound();
      }
    } catch {
      notFound();
    }
  }

  // Connectivity check
  let supabaseConnected = false;
  let connectionMessage = "Connecting to Supabase...";

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getSession();

    if (!error) {
      supabaseConnected = true;
      connectionMessage = "Connected successfully to local Supabase stack.";
    } else {
      connectionMessage = `Auth response: ${error.message}`;
    }
  } catch (err: unknown) {
    connectionMessage =
      err instanceof Error ? err.message : "Failed to connect to Supabase";
  }

  const ports = [
    {
      name: "Next.js Web App",
      port: "3845",
      url: "http://localhost:3845",
      defaultPort: "3000",
      type: "Frontend / App Router",
    },
    {
      name: "Supabase API (Kong)",
      port: "49321",
      url: "http://127.0.0.1:49321",
      defaultPort: "54321",
      type: "REST & Auth Gateway",
    },
    {
      name: "Supabase PostgreSQL",
      port: "49322",
      url: "postgresql://postgres:postgres@127.0.0.1:49322/postgres",
      defaultPort: "54322",
      type: "Database",
    },
    {
      name: "Supabase Shadow DB",
      port: "49320",
      url: "127.0.0.1:49320",
      defaultPort: "54320",
      type: "Migration Shadow DB",
    },
    {
      name: "Supabase Studio",
      port: "49323",
      url: "http://127.0.0.1:49323",
      defaultPort: "54323",
      type: "Database Management UI",
      isLink: true,
    },
    {
      name: "Inbucket (Mail UI)",
      port: "49324",
      url: "http://127.0.0.1:49324",
      defaultPort: "54324",
      type: "Email Testing Web Interface",
      isLink: true,
    },
    {
      name: "Inbucket (SMTP)",
      port: "49325",
      url: "127.0.0.1:49325",
      defaultPort: "54325",
      type: "Transactional SMTP",
    },
    {
      name: "Supabase Analytics",
      port: "49327",
      url: "127.0.0.1:49327",
      defaultPort: "54327",
      type: "Logflare Analytics",
    },
    {
      name: "Supabase Pooler",
      port: "49329",
      url: "127.0.0.1:49329",
      defaultPort: "54329",
      type: "Supavisor Pooler",
    },
    {
      name: "Chrome Inspector",
      port: "49383",
      url: "127.0.0.1:49383",
      defaultPort: "8083",
      type: "Edge Runtime Inspector",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-6 sm:p-10">
      <div className="max-w-5xl mx-auto">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-xs font-mono font-semibold uppercase tracking-wider">
                Internal Developer Dashboard
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs font-mono font-semibold">
                Hidden from Public
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              FaithFull Scholars System Diagnostics
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to App</span>
            </Link>
            <a
              href="http://127.0.0.1:49323"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm inline-flex items-center gap-1.5"
            >
              <span>Open Supabase Studio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Status Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Supabase Status
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  supabaseConnected
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-rose-500"
                }`}
              />
              <span className="text-lg font-semibold text-white">
                {supabaseConnected ? "Healthy" : "Disconnected"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">{connectionMessage}</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Gateway Target
            </div>
            <div className="text-lg font-bold font-mono text-white truncate">
              http://127.0.0.1:49321
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Bound to isolated custom port
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Environment
            </div>
            <div className="text-2xl font-bold font-mono text-indigo-400 uppercase">
              {process.env.NODE_ENV || "development"}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Port: 3845 • Project: faithfull-scholars
            </p>
          </div>
        </div>

        {/* Assigned Ports Table */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Assigned Non-Default Ports (Zero-Collision Mapping)
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              supabase/config.toml
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/50 text-slate-400 uppercase text-[11px] border-b border-slate-700">
                <tr>
                  <th className="px-6 py-3">Service</th>
                  <th className="px-6 py-3">Assigned Port</th>
                  <th className="px-6 py-3">Default</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {ports.map((item) => (
                  <tr key={item.port} className="hover:bg-slate-700/30">
                    <td className="px-6 py-3 font-sans font-semibold text-white">
                      {item.name}
                    </td>
                    <td className="px-6 py-3 text-indigo-400 font-bold">
                      {item.port}
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      {item.defaultPort}
                    </td>
                    <td className="px-6 py-3 text-slate-400">{item.type}</td>
                    <td className="px-6 py-3 font-sans">
                      {item.isLink ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-1"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Commands & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-2">
              Common CLI Commands
            </h3>
            <pre className="p-3 bg-slate-950 rounded-lg text-slate-300 font-mono text-[11px] overflow-x-auto">
              {`npm run dev            # Start Next.js on port 3845\nnpx supabase status    # Check container status\nnpx supabase stop      # Stop local Supabase\nnpx supabase db reset  # Re-apply migrations & seeds`}
            </pre>
          </div>

          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-2">
              Security & Production Notes
            </h3>
            <p className="text-slate-400 leading-relaxed">
              This page is automatically protected in production builds. Only
              authenticated administrators or environments with{" "}
              <code className="text-indigo-300">ENABLE_DEV_ROUTES=true</code>{" "}
              can view these diagnostics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
