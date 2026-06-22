"use client";

import PageHeader from "@/components/admin/PageHeader";
import ApiDocumentation from "@/components/shared/ApiDocumentation";

export default function DocumentationPage() {
  return (
    <div>
      <PageHeader
        title="API Documentation"
        subtitle="Complete reference for integrating with the Wallpaper API."
        breadcrumbs={["Dashboard", "Documentation"]}
      />
      <ApiDocumentation />
    </div>
  );
}
