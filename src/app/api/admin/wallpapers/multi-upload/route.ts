import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Sound } from "@/lib/models";
import { requireAdmin, apiError, apiSuccess } from "@/lib/api-utils";
import { saveUploadedVideo } from "@/lib/upload";
import { getNextWallpaperOrder } from "@/lib/wallpaper-order";
import { formatSounds } from "@/lib/sound-utils";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    await connectDB();
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const statuses = formData.getAll("statuses") as string[];
    const names = formData.getAll("names") as string[];

    if (files.length === 0) return apiError("No video files provided");

    const created = [];
    let nextOrder = await getNextWallpaperOrder();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file || file.size === 0) continue;

      const uploaded = await saveUploadedVideo(file);
      const wallpaper = await Sound.create({
        name: names[i]?.trim() || file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        url: uploaded.url,
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize,
        format: uploaded.format,
        mimeType: uploaded.mimeType,
        width: uploaded.width,
        height: uploaded.height,
        duration: uploaded.duration,
        thumbnailUrl: uploaded.thumbnailUrl,
        status: statuses[i] || "Published",
        order: nextOrder++,
        category: "",
      });
      created.push(wallpaper.toObject());
    }

    return apiSuccess({ count: created.length, wallpapers: formatSounds(created) }, 201);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Multi-upload failed";
    return apiError(message, 500);
  }
}
