import type { Metadata } from "next";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import Card from "@/components/ui/Card";
import { APP } from "@/config/app";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of service for ${APP.name}.`,
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <PublicHeader />
      <main className="flex-1 py-12 lg:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-slate-500 mb-8">Last updated: June 22, 2026</p>
          <Card className="space-y-6 text-sm text-slate-700 leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Acceptance of Terms</h2>
              <p>
                By accessing or using {APP.name}, you agree to these Terms of Service. If you do not
                agree, do not use the service.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Service Description</h2>
              <p>
                {APP.name} provides a REST API for delivering live video wallpaper content to
                authorized client applications. Admin users may upload, manage, and publish wallpaper
                content through the admin dashboard.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">API Usage</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>API keys must be kept confidential and not shared publicly</li>
                <li>Rate limits apply per API key as configured in your account</li>
                <li>Uploaded content must comply with applicable copyright and content laws</li>
                <li>We reserve the right to suspend access for abuse or violation of these terms</li>
              </ul>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Content Responsibility</h2>
              <p>
                You retain ownership of content you upload. You grant us a license to store, process,
                and deliver that content through the API to your authorized applications.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Contact</h2>
              <p>
                Questions about these terms? Email{" "}
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
