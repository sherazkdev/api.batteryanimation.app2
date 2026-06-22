import Link from "next/link";
import {
  Shield,
  BookOpen,
  Lock,
  Video,
  Clapperboard,
  Settings,
  CheckCircle,
  Zap,
  Globe,
  ArrowUpDown,
} from "lucide-react";
import Button from "@/components/ui/Button";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import { APP, API_ENDPOINTS, METHOD_COLORS } from "@/config/app";

const features = [
  {
    icon: Video,
    title: "Live Wallpaper API",
    description:
      "Deliver ordered live video wallpapers to mobile and web apps through a fast, secure REST API.",
    items: [
      "Order-based responses",
      "MP4 & WebM support",
      "Automatic thumbnail generation",
      "ZIP bulk upload with categories",
    ],
  },
  {
    icon: Clapperboard,
    title: "Charging Animation API",
    description:
      "Provide premium battery charging animations and loops categorized cleanly for client apps.",
    items: [
      "Chunked large file upload",
      "MPEG-4/H.264 preview encoding",
      "Category management & slugs",
      "High performance media streaming",
    ],
  },
  {
    icon: Lock,
    title: "Secure & Developer-First",
    description:
      "Every public endpoint requires an API key. Admin access is protected with JWT authentication.",
    items: [
      "x-api-key header security",
      "Rate limiting & audit logging",
      "Premium drag-and-drop dashboard",
      "Live stats & storage monitoring",
    ],
  },
];

export default function LandingPage() {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicHeader />

      <section className="relative overflow-hidden bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/40 py-20 lg:py-28">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-20 left-10 w-72 h-72 bg-violet-200/50 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-100/60 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-sm font-medium mb-6">
                <ArrowUpDown className="w-4 h-4" /> Ordered • Secure • Developer-first
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight tracking-tight">
                The <span className="text-violet-600">Media Content API</span> your apps deserve
              </h1>
              <p className="mt-5 text-lg text-slate-600 leading-relaxed">
                Manage and deliver high-quality live video wallpapers and battery charging animations through a secure, high-performance REST API.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/docs">
                  <Button size="lg" className="gap-2">
                    <BookOpen className="w-5 h-5" /> View API Docs
                  </Button>
                </Link>
                <Link href="/admin/login">
                  <Button variant="outline" size="lg" className="gap-2">
                    <Shield className="w-5 h-5" /> Admin Panel
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-2xl shadow-premium-lg border border-slate-200/80 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium text-slate-700">{APP.name} — Active</span>
                </div>
                <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto">
                  <pre>{`GET /api/v1/animations
Header: x-api-key: YOUR_API_KEY

{
  "success": true,
  "data": {
    "animations": [
      {
        "id": "60d5ec4b1a2b3c4d5e6f7a8b",
        "name": "Neon Charging",
        "url": "${baseUrl}/uploads/animations/neon.mp4",
        "thumbnailUrl": "${baseUrl}/uploads/thumbnails/animations/neon.jpg",
        "duration": 12.5,
        "order": 1
      }
    ]
  }
}`}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 bg-[#fafafa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">Built for modern apps</h2>
            <p className="text-slate-600 mt-3 max-w-2xl mx-auto">{APP.tagline}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map(({ icon: Icon, title, description, items }) => (
              <div
                key={title}
                className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-premium"
              >
                <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-violet-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
                <p className="text-slate-600 text-sm mb-5 leading-relaxed">{description}</p>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle className="w-4 h-4 text-violet-600 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="endpoints" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">API Endpoints</h2>
            <p className="text-slate-600 mt-3">
              All public routes require the{" "}
              <code className="bg-slate-100 px-2 py-0.5 rounded text-sm">x-api-key</code> header
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-premium">
            {API_ENDPOINTS.map(({ method, path, description }, i) => (
              <div
                key={`${method}-${path}`}
                className={`flex items-center gap-4 px-6 py-4 ${i !== API_ENDPOINTS.length - 1 ? "border-b border-slate-100" : ""}`}
              >
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${METHOD_COLORS[method]}`}
                >
                  {method}
                </span>
                <code className="text-sm font-mono text-slate-800 flex-1">{path}</code>
                <span className="text-sm text-slate-500 hidden sm:block">{description}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="docs" className="py-20 bg-[#fafafa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">Quick Start</h2>
            <p className="text-slate-600 mt-3">Integrate the Wallpaper API in minutes</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-premium">
                <h3 className="font-semibold text-slate-900 mb-3">Base URL</h3>
                <code className="block bg-slate-50 px-4 py-3 rounded-xl text-sm font-mono text-slate-800">
                  {baseUrl}/api/v1
                </code>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon: Zap, label: "Fast" },
                  { icon: Shield, label: "Secure" },
                  { icon: Globe, label: "Reliable" },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="bg-white rounded-xl border border-slate-200/80 p-4 text-center shadow-premium"
                  >
                    <Icon className="w-6 h-6 text-violet-600 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-700">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-900 rounded-xl p-6 shadow-premium-lg">
              <p className="text-xs text-slate-400 mb-3 font-medium uppercase tracking-wide">
                Example Request
              </p>
              <pre className="text-xs text-slate-300 font-mono overflow-x-auto leading-relaxed">{`curl -X GET "${baseUrl}/api/v1/wallpapers" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Accept: application/json"`}</pre>
            </div>
          </div>
          <div className="text-center mt-10">
            <Link href="/docs">
              <Button size="lg" variant="secondary" className="gap-2">
                <BookOpen className="w-5 h-5" /> Read Full Documentation
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
