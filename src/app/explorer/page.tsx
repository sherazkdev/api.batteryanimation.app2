"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { APP, API_ENDPOINTS, METHOD_COLORS } from "@/config/app";

const explorerEndpoints = API_ENDPOINTS.filter((e) => e.method === "GET" && e.path.includes("/api/v1/"));

export default function ExplorerPage() {
  const [apiKey, setApiKey] = useState("");
  const [selectedPath, setSelectedPath] = useState("/api/v1/wallpapers");
  const [response, setResponse] = useState<string>("");
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const runRequest = async () => {
    if (!apiKey.trim()) {
      setError("Enter your API key to send a request.");
      return;
    }
    setLoading(true);
    setError(null);
    setResponse("");
    setStatus(null);

    try {
      const url = `${baseUrl}${selectedPath}?page=1&per_page=5`;
      const res = await fetch(url, {
        headers: {
          "x-api-key": apiKey.trim(),
          Accept: "application/json",
        },
      });
      setStatus(res.status);
      const text = await res.text();
      if (!text.trim()) {
        setResponse("(empty response)");
      } else {
        try {
          setResponse(JSON.stringify(JSON.parse(text), null, 2));
        } catch {
          setResponse(text);
        }
      }
    } catch {
      setError("Request failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <PublicHeader />
      <main className="flex-1 py-12 lg:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">API Explorer</h1>
            <p className="text-slate-600 mt-3">
              Test {APP.name} endpoints with your API key. Get your key from the{" "}
              <Link href="/admin/login" className="text-violet-600 hover:text-violet-800 font-medium">
                admin panel
              </Link>
              .
            </p>
          </div>

          <Card className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="wk_live_..."
                className="w-full rounded-xl border border-slate-200/90 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Endpoint</label>
              <div className="space-y-2">
                {explorerEndpoints.map(({ method, path, description }) => (
                  <label
                    key={path}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      selectedPath === path
                        ? "border-violet-300 bg-violet-50/50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="endpoint"
                      value={path}
                      checked={selectedPath === path}
                      onChange={() => setSelectedPath(path)}
                      className="text-violet-600 accent-violet-600"
                    />
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold font-mono ${METHOD_COLORS[method]}`}>
                      {method}
                    </span>
                    <code className="text-sm font-mono text-slate-800">{path}</code>
                    <span className="text-xs text-slate-500 ml-auto hidden sm:block">{description}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button onClick={runRequest} loading={loading} className="gap-2">
              <Play className="w-4 h-4" /> Send Request
            </Button>

            {error && (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {(response || loading) && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Response</span>
                  {status !== null && (
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                        status >= 200 && status < 300
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {status >= 200 && status < 300 ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      {status}
                    </span>
                  )}
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-12 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <pre className="p-4 rounded-xl bg-slate-900 text-slate-300 text-xs font-mono overflow-x-auto leading-relaxed max-h-96">
                    {response}
                  </pre>
                )}
              </div>
            )}
          </Card>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
