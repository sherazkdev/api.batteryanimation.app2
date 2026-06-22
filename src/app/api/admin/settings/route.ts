import { connectDB } from "@/lib/mongodb";
import { AppSettings } from "@/lib/models";
import type { AppSettingsLean } from "@/lib/models/AppSettings";
import { runAdminRoute } from "@/lib/api-utils";
import { ensureAppSettings, getRateLimitInfo } from "@/lib/api-key";

export async function GET() {
  return runAdminRoute(async () => {
    await connectDB();
    await ensureAppSettings();
    const settings = await AppSettings.findById("default").lean<AppSettingsLean>();
    const rateInfo = await getRateLimitInfo();

    return {
      apiStatus: "Active" as const,
      apiKey: settings?.apiKey || "",
      rateLimitPerHour: settings?.rateLimitPerHour || 1000,
      totalRequests: settings?.totalRequests || 0,
      rateLimitRemaining: rateInfo.remaining,
      rateLimitResetMinutes: rateInfo.resetMinutes,
    };
  });
}
