import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Sound } from "@/lib/models";
import { requireAdmin, apiError, apiSuccess } from "@/lib/api-utils";
import { applyWallpaperOrder, wallpaperOrderBy } from "@/lib/wallpaper-order";
import { formatSoundList, SOUND_LIST_PROJECTION } from "@/lib/sound-utils";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { orderedIds } = await request.json();

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return apiError("orderedIds array is required");
    }

    if (!orderedIds.every((id) => typeof id === "string" && id.length > 0)) {
      return apiError("orderedIds must be an array of valid string ids");
    }

    await applyWallpaperOrder(orderedIds);

    await connectDB();
    const updated = await Sound.find({}).select(SOUND_LIST_PROJECTION).sort(wallpaperOrderBy).lean();

    return apiSuccess({
      message: "Order updated successfully",
      count: orderedIds.length,
      wallpapers: formatSoundList(updated),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update order";
    return apiError(message, 400);
  }
}
