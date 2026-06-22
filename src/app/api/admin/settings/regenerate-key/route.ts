import { connectDB } from "@/lib/mongodb";
import { AppSettings } from "@/lib/models";
import { requireAdmin, apiSuccess } from "@/lib/api-utils";
import { generateApiKey, invalidateSettingsCache } from "@/lib/api-key";

export async function POST() {
  const authError = await requireAdmin();
  if (authError) return authError;

  await connectDB();
  const newKey = generateApiKey();
  await AppSettings.findOneAndUpdate(
    { _id: "default" },
    {
      $set: { apiKey: newKey },
      $setOnInsert: { totalRequests: 0, rateLimitPerHour: 1000 },
    },
    { upsert: true, new: true }
  );

  invalidateSettingsCache();

  return apiSuccess({ apiKey: newKey });
}
