import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Sound } from "@/lib/models";
import { requireAdmin, apiError, apiSuccess, runAdminRoute } from "@/lib/api-utils";
import { saveUploadedVideo } from "@/lib/upload";
import { getNextWallpaperOrder, wallpaperOrderBy } from "@/lib/wallpaper-order";
import { formatSound, formatSoundList, SOUND_LIST_PROJECTION } from "@/lib/sound-utils";

function wallpaperDataFromUpload(
  uploaded: Awaited<ReturnType<typeof saveUploadedVideo>>,
  extra: { name: string; status: string; tags?: string | null; description?: string | null }
) {
  return {
    name: extra.name,
    url: uploaded.url,
    fileName: uploaded.fileName,
    fileSize: uploaded.fileSize,
    format: uploaded.format,
    mimeType: uploaded.mimeType,
    width: uploaded.width,
    height: uploaded.height,
    duration: uploaded.duration,
    thumbnailUrl: uploaded.thumbnailUrl,
    status: extra.status,
    tags: extra.tags ?? null,
    description: extra.description ?? null,
    category: "",
  };
}

function buildFilter(search: string, status: string, format: string) {
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (format) filter.format = format;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { fileName: { $regex: search, $options: "i" } },
    ];
  }
  return filter;
}

export async function GET(request: NextRequest) {
  return runAdminRoute(async () => {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";
    const page = all ? 1 : Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = all
      ? Math.min(5000, Math.max(1, parseInt(searchParams.get("limit") || "5000")))
      : Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const format = searchParams.get("format") || "";
    const filter = buildFilter(search, status, format);

  const [wallpapers, total] = await Promise.all([
    Sound.find(filter)
      .select(SOUND_LIST_PROJECTION)
      .sort(wallpaperOrderBy)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Sound.countDocuments(filter),
  ]);

    return {
      wallpapers: formatSoundList(wallpapers),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
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
      ...wallpaperDataFromUpload(uploaded, {
        name: name.trim(),
        status,
        tags: tags || null,
        description: description || null,
      }),
      order,
    });

    return apiSuccess(formatSound(wallpaper.toObject()), 201);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to create live wallpaper";
    return apiError(message, 500);
  }
}
