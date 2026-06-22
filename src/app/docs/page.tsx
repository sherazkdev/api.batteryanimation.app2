import type { Metadata } from "next";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import ApiDocumentation from "@/components/shared/ApiDocumentation";

export const metadata: Metadata = {
  title: "API Documentation",
  description: "Complete API reference for the Wallpaper API — authentication, endpoints, and code examples.",
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <PublicHeader />
      <main className="flex-1 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ApiDocumentation showHeader />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
