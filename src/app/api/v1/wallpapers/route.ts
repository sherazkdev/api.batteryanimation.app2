import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Sound } from "@/lib/models";
import { apiError, apiSuccess } from "@/lib/api-utils";
import { validateApiKeyMiddleware } from "@/lib/api-middleware";
import { saveUploadedVideo } from "@/lib/upload";
import { getNextWallpaperOrder, wallpaperOrderBy } from "@/lib/wallpaper-order";
import { formatSound, formatSoundList, SOUND_LIST_PROJECTION } from "@/lib/sound-utils";

function buildFilter(search: string, status: string) {
  const filter: Record<string, unknown> = { status: status || "Published" };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { fileName: { $regex: search, $options: "i" } },
    ];
  }
  return filter;
}

export async function GET(request: NextRequest) {
  const authError = await validateApiKeyMiddleware(request);
  if (authError) return authError;

  await connectDB();

  const { searchParams } = new URL(request.url);
  // const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  // const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("per_page") || searchParams.get("limit") || "10")));
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const filter = buildFilter(search, status);

  const [wallpapers, total] = await Promise.all([
    Sound.find(filter)
      .select(SOUND_LIST_PROJECTION)
      .sort(wallpaperOrderBy)
      .lean(),
    Sound.countDocuments(filter),
  ]);

  return apiSuccess({
    wallpapers: formatSoundList(wallpapers),
  });
}

export async function POST(request: NextRequest) {
  const authError = await validateApiKeyMiddleware(request);
  if (authError) return authError;

  try {
    await connectDB();
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const status = (formData.get("status") as string) || "Draft";
    const tags = formData.get("tags") as string;
    const description = formData.get("description") as string;
    const file = formData.get("file") as File;

    if (!name?.trim()) return apiError("Wallpaper name is required");
    if (!file) return apiError("Video file is required");

    const uploaded = await saveUploadedVideo(file);
    const order = await getNextWallpaperOrder();
    const wallpaper = await Sound.create({
      name: name.trim(),
      url: uploaded.url,
      fileName: uploaded.fileName,
      fileSize: uploaded.fileSize,
      format: uploaded.format,
      mimeType: uploaded.mimeType,
      width: uploaded.width,
      height: uploaded.height,
      duration: uploaded.duration,
      thumbnailUrl: uploaded.thumbnailUrl,
      status,
      tags: tags || null,
      description: description || null,
      order,
      category: "",
    });

    return apiSuccess(formatSound(wallpaper.toObject()), 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create live wallpaper";
    return apiError(message, 500);
  }
}
