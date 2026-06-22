import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Sound } from "@/lib/models";
import { apiError, apiSuccess } from "@/lib/api-utils";
import { validateApiKeyMiddleware } from "@/lib/api-middleware";
import { recompactAfterDelete } from "@/lib/wallpaper-order";
import { unlink } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  const authError = await validateApiKeyMiddleware(request);
  if (authError) return authError;

  await connectDB();
  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return apiError("No wallpaper IDs provided");
  }

  const wallpapers = await Sound.find({ _id: { $in: ids } }).lean();
  await Sound.deleteMany({ _id: { $in: ids } });

  await recompactAfterDelete();

  for (const wp of wallpapers) {
    try {
      await unlink(path.join(process.cwd(), "public", "uploads", wp.fileName));
    } catch { /* ignore */ }
  }

  return apiSuccess({ deleted: wallpapers.length });
}
