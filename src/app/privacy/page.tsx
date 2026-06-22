import type { Metadata } from "next";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import Card from "@/components/ui/Card";
import { APP } from "@/config/app";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy policy for ${APP.name}.`,
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <PublicHeader />
      <main className="flex-1 py-12 lg:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-slate-500 mb-8">Last updated: June 22, 2026</p>
          <Card className="prose prose-slate max-w-none space-y-6 text-sm text-slate-700 leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Overview</h2>
              <p>
                {APP.name} (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides a live wallpaper content
                API and admin platform. This policy describes how we handle information when you use our
                services.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Information We Collect</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Admin account credentials (email) for authentication</li>
                <li>API request logs including endpoint, method, IP address, and timestamp</li>
                <li>Content you upload (video files, metadata, tags)</li>
              </ul>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">How We Use Information</h2>
              <p>
                We use collected data to operate the API, enforce rate limits, provide admin functionality,
                and improve service reliability. We do not sell personal information to third parties.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Data Storage</h2>
              <p>
                Wallpaper media files are stored on our servers. Metadata is stored in MongoDB. API keys
                are stored securely and can be regenerated from the admin panel at any time.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Contact</h2>
              <p>
                For privacy-related questions, contact us at{" "}
                <a href={`mailto:${APP.supportEmail}`} className="text-violet-600 hover:text-violet-800">
                  {APP.supportEmail}
                </a>
                .
              </p>
            </section>
          </Card>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
