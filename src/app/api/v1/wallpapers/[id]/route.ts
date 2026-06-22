import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Sound } from "@/lib/models";
import type { SoundLean } from "@/lib/models/Sound";
import { apiError, apiSuccess } from "@/lib/api-utils";
import { validateApiKeyMiddleware } from "@/lib/api-middleware";
import { saveUploadedVideo } from "@/lib/upload";
import { recompactAfterDelete } from "@/lib/wallpaper-order";
import { formatSound } from "@/lib/sound-utils";
import { unlink } from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await validateApiKeyMiddleware(request);
  if (authError) return authError;

  await connectDB();
  const { id } = await params;
  const wallpaper = await Sound.findById(id).lean<SoundLean>();
  if (!wallpaper) return apiError("Wallpaper not found", 404);
  return apiSuccess(formatSound(wallpaper));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await validateApiKeyMiddleware(request);
  if (authError) return authError;

  await connectDB();
  const { id } = await params;
  const existing = await Sound.findById(id).lean<SoundLean>();
  if (!existing) return apiError("Wallpaper not found", 404);

  try {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const status = formData.get("status") as string;
    const tags = formData.get("tags") as string;
    const description = formData.get("description") as string;
    const file = formData.get("file") as File | null;

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name.trim();
    if (status) updateData.status = status;
    if (tags !== undefined && tags !== null) updateData.tags = tags || null;
    if (description !== undefined) updateData.description = description || null;

    if (file && file.size > 0) {
      const uploaded = await saveUploadedVideo(file);
      updateData.url = uploaded.url;
      updateData.fileName = uploaded.fileName;
      updateData.fileSize = uploaded.fileSize;
      updateData.format = uploaded.format;
      updateData.mimeType = uploaded.mimeType;
      updateData.width = uploaded.width;
      updateData.height = uploaded.height;
      updateData.duration = uploaded.duration;
      updateData.thumbnailUrl = uploaded.thumbnailUrl;
      try {
        await unlink(path.join(process.cwd(), "public", "uploads", existing.fileName));
        if (existing.thumbnailUrl) {
          await unlink(path.join(process.cwd(), "public", "uploads", "thumbnails", path.basename(existing.thumbnailUrl)));
        }
      } catch { /* ignore */ }
    }

    const wallpaper = await Sound.findByIdAndUpdate(id, updateData, { new: true }).lean<SoundLean>();
    if (!wallpaper) return apiError("Wallpaper not found", 404);
    return apiSuccess(formatSound(wallpaper));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update live wallpaper";
    return apiError(message, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await validateApiKeyMiddleware(request);
  if (authError) return authError;

  await connectDB();
  const { id } = await params;
  const existing = await Sound.findById(id).lean<SoundLean>();
  if (!existing) return apiError("Wallpaper not found", 404);

  await Sound.findByIdAndDelete(id);
  await recompactAfterDelete();
  try {
    await unlink(path.join(process.cwd(), "public", "uploads", existing.fileName));
    if (existing.thumbnailUrl) {
      await unlink(path.join(process.cwd(), "public", "uploads", "thumbnails", path.basename(existing.thumbnailUrl)));
    }
  } catch { /* ignore */ }

  return apiSuccess({ message: "Wallpaper deleted" });
}
