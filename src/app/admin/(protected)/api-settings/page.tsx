"use client";

import { useEffect, useState } from "react";
import {
  Shield,
  Key,
  Clock,
  BarChart3,
  RefreshCw,
  Copy,
  CheckCircle,
  Image as ImageIcon,
  Zap,
  BookOpen,
} from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import StatsCard from "@/components/admin/StatsCard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import CopyButton from "@/components/ui/CopyButton";
import Card from "@/components/ui/Card";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { maskApiKey, safeJson } from "@/lib/utils";
import { ApiSettings } from "@/types/wallpaper";
import toast from "react-hot-toast";

const tabs = ["API Overview", "Authentication", "Endpoints", "Rate Limits", "Webhooks"];

export default function ApiSettingsPage() {
  const [settings, setSettings] = useState<ApiSettings | null>(null);
  const [fullApiKey, setFullApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("API Overview");
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const fetchSettings = async () => {
    const res = await fetch("/api/admin/settings");
    const data = await safeJson<ApiSettings>(res);
    if (data?.success && data.data) {
      setSettings(data.data);
      setFullApiKey(data.data.apiKey);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleRegenerate = async () => {
    if (!confirm("Are you sure you want to regenerate your API key? The old key will stop working immediately.")) return;
    setRegenerating(true);
    try {
      const res = await fetch("/api/admin/settings/regenerate-key", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setFullApiKey(data.data.apiKey);
        setSettings((prev) => prev ? { ...prev, apiKey: data.data.apiKey } : prev);
        toast.success("API key regenerated successfully");
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Failed to regenerate key");
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="API Settings"
        subtitle="Manage your API credentials, rate limits and documentation."
        breadcrumbs={["Dashboard", "API Settings"]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="API Status"
          value={<Badge variant="success">Active</Badge>}
          subtitle="Your API is active and working."
          icon={Shield}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">API Key</p>
              <p className="text-sm font-mono text-slate-700 mt-1">{maskApiKey(fullApiKey)}</p>
              <button onClick={handleRegenerate} className="text-xs text-blue-600 hover:text-blue-700 mt-1">
                View / Regenerate Key
              </button>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <StatsCard
          title="Rate Limit"
          value={`${settings?.rateLimitPerHour.toLocaleString()} / hour`}
          subtitle={`Resets in ${settings?.rateLimitResetMinutes} minutes.`}
          icon={Clock}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
        <StatsCard
          title="Total Requests"
          value={settings?.totalRequests.toLocaleString() || "0"}
          subtitle="This month"
          icon={BarChart3}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "API Overview" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <h3 className="font-semibold text-slate-900 mb-3">About the API</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Access your wallpaper collection programmatically with our RESTful API. All endpoints require authentication via API key.
              </p>
              <div className="space-y-3">
                {[
                  { icon: ImageIcon, label: "High Quality Images" },
                  { icon: Zap, label: "Easy Integration" },
                  { icon: Shield, label: "Reliable & Fast" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Icon className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm text-slate-700">{label}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <h3 className="font-semibold text-slate-900 mb-3">Quick Start</h3>
              <ol className="space-y-3">
                {[
                  "Get your API key from the section on the right",
                  "Make your first request with the x-api-key header",
                  "Explore the full documentation for all endpoints",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <a href="/admin/documentation" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-4 font-medium">
                <BookOpen className="w-4 h-4" /> View Full Documentation →
              </a>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Your API Key</h3>
                <Button variant="outline" size="sm" onClick={handleRegenerate} loading={regenerating} className="gap-1.5">
                  <RefreshCw className="w-4 h-4" /> Regenerate Key
                </Button>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-200">
                <code className="text-sm font-mono text-slate-800 flex-1 truncate">{fullApiKey}</code>
                <CopyButton text={fullApiKey} label="API Key" />
              </div>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Keep your API key secure and do not share it publicly.
              </p>
            </Card>

            <Card>
              <h3 className="font-semibold text-slate-900 mb-3">Example API Request</h3>
              <p className="text-sm text-slate-500 mb-2">Get all wallpapers</p>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">GET</span>
                <div className="flex-1 flex items-center gap-1 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                  <code className="text-xs font-mono text-slate-700 truncate">{baseUrl}/api/v1/wallpapers</code>
                  <CopyButton text={`${baseUrl}/api/v1/wallpapers`} />
                </div>
              </div>
            </Card>

            <Card padding={false}>
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <span className="text-sm font-medium text-slate-300">Example Response</span>
                <CopyButton
                  text={JSON.stringify({ success: true, data: { wallpapers: [{ id: "...", name: "Ocean Waves Live", url: "...", format: "MP4", status: "Published" }] } }, null, 2)}
                  className="text-slate-400 hover:text-white hover:bg-slate-700"
                />
              </div>
              <pre className="p-4 text-xs font-mono text-slate-300 bg-slate-900 overflow-x-auto leading-relaxed rounded-b-xl">{`{
  "success": true,
  "data": {
    "wallpapers": [
      {
        "id": "clx123abc",
        "name": "Ocean Waves Live Wallpaper",
        "url": "${baseUrl}/uploads/ocean-waves.mp4",
        "status": "Published"
      }
    ]
  }
}`}</pre>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "Authentication" && (
        <Card>
          <h3 className="font-semibold text-slate-900 mb-4">Authentication</h3>
          <p className="text-sm text-slate-600 mb-4">All API requests must include your API key in the request header:</p>
          <code className="block bg-slate-900 text-green-400 px-4 py-3 rounded-lg text-sm font-mono">
            x-api-key: {fullApiKey}
          </code>
          <p className="text-sm text-red-600 mt-4">Requests without a valid API key will receive a 401 Unauthorized response.</p>
        </Card>
      )}

      {activeTab === "Endpoints" && (
        <Card>
          <h3 className="font-semibold text-slate-900 mb-4">Available Endpoints</h3>
          <div className="space-y-2">
            {[
              { method: "GET", path: "/api/v1/wallpapers", desc: "Get list of wallpapers" },
              { method: "GET", path: "/api/v1/wallpapers/:id", desc: "Get wallpaper details" },
              { method: "POST", path: "/api/v1/wallpapers", desc: "Create a wallpaper" },
              { method: "PUT", path: "/api/v1/wallpapers/:id", desc: "Update a wallpaper" },
              { method: "DELETE", path: "/api/v1/wallpapers/:id", desc: "Delete a wallpaper" },
              { method: "POST", path: "/api/v1/wallpapers/bulk-delete", desc: "Bulk delete wallpapers" },
              { method: "POST", path: "/api/v1/wallpapers/multi-upload", desc: "Upload multiple wallpapers" },
              { method: "POST", path: "/api/v1/wallpapers/zip-upload", desc: "Upload ZIP of wallpapers" },
            ].map(({ method, path, desc }) => (
              <div key={`${method}-${path}`} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                  method === "GET" ? "bg-green-100 text-green-700" :
                  method === "POST" ? "bg-blue-100 text-blue-700" :
                  method === "PUT" ? "bg-orange-100 text-orange-700" :
                  "bg-red-100 text-red-700"
                }`}>{method}</span>
                <code className="text-sm font-mono text-slate-800 flex-1">{path}</code>
                <span className="text-sm text-slate-500 hidden sm:block">{desc}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === "Rate Limits" && (
        <Card>
          <h3 className="font-semibold text-slate-900 mb-4">Rate Limits</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-xs font-medium text-slate-500 py-3">Tier</th>
                  <th className="text-left text-xs font-medium text-slate-500 py-3">Requests/Hour</th>
                  <th className="text-left text-xs font-medium text-slate-500 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-50">
                  <td className="py-3 text-sm font-medium text-slate-900">Current Plan</td>
                  <td className="py-3 text-sm text-slate-600">{settings?.rateLimitPerHour.toLocaleString()}</td>
                  <td className="py-3"><Badge variant="success">Active</Badge></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-500 mt-4">
            Used: {settings ? settings.rateLimitPerHour - settings.rateLimitRemaining : 0} / {settings?.rateLimitPerHour} requests this hour.
            Resets in {settings?.rateLimitResetMinutes} minutes.
          </p>
        </Card>
      )}

      {activeTab === "Webhooks" && (
        <Card>
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 mb-2">Webhooks Coming Soon</h3>
            <p className="text-sm text-slate-500">Webhook support will be available in a future update.</p>
          </div>
        </Card>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3">
        <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <p className="text-sm text-blue-700">
          Need help? Check our{" "}
          <a href="/admin/documentation" className="underline font-medium">documentation</a>
          {" "}or contact{" "}
          <a href="mailto:support@wallpaperapi.com" className="underline font-medium">support@wallpaperapi.com</a>
        </p>
      </div>
    </div>
  );
}
