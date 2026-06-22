import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Sound } from "@/lib/models";
import { apiError, apiSuccess } from "@/lib/api-utils";
import { validateApiAccess } from "@/lib/api-access";
import {
  isValidVideoFile,
  getVideoMetadataFromBuffer,
  saveVideoFromBuffer,
  METADATA_CONCURRENCY,
  SAVE_CONCURRENCY,
} from "@/lib/upload";
import { mapWithConcurrency } from "@/lib/concurrency";
import { getNextWallpaperOrder } from "@/lib/wallpaper-order";
import { getOrCreateCategory } from "@/lib/category-utils";
import { formatDuration } from "@/lib/utils";
import { loadZipEntries, nameFromZipPath, MAX_ZIP_ENTRIES } from "@/lib/zip-utils";
import { categorySlugFromZipPath, formatSounds } from "@/lib/sound-utils";

const MAX_ZIP_SIZE = 500 * 1024 * 1024;
const MAX_VIDEOS_PER_ZIP = MAX_ZIP_ENTRIES;

type ExtractedFileResult = {
  fileName: string;
  size: number;
  type: string;
  resolution: string;
  duration: string;
  valid: boolean;
  reason?: string;
};

type VideoEntry = {
  relativePath: string;
  buffer: Buffer;
};

async function buildExtractedFileResults(
  zipEntries: Awaited<ReturnType<typeof loadZipEntries>>
): Promise<{ extractedFiles: ExtractedFileResult[]; videoEntries: VideoEntry[] }> {
  console.log(`[zip-upload] Validating ${zipEntries.length} extracted entries`);

  const results = await mapWithConcurrency(zipEntries, METADATA_CONCURRENCY, async (entry) => {
    const valid = isValidVideoFile(entry.baseName);
    const type = entry.baseName.split(".").pop()?.toUpperCase() || "UNKNOWN";

    if (!valid) {
      return {
        extracted: {
          fileName: entry.relativePath,
          size: entry.buffer.length,
          type,
          resolution: "—",
          duration: "—",
          valid: false,
          reason: "Not a video file (MP4/WebM only)",
        } satisfies ExtractedFileResult,
        video: null,
      };
    }

    try {
      const meta = await getVideoMetadataFromBuffer(entry.buffer, entry.baseName);
      const resolution =
        meta.width && meta.height ? `${meta.width} x ${meta.height}` : "—";
      const durationStr = meta.duration ? formatDuration(meta.duration) : "—";

      return {
        extracted: {
          fileName: entry.relativePath,
          size: entry.buffer.length,
          type,
          resolution,
          duration: durationStr,
          valid: true,
        } satisfies ExtractedFileResult,
        video: { relativePath: entry.relativePath, buffer: entry.buffer } satisfies VideoEntry,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not read video metadata";
      console.error(`[zip-upload] Metadata error for ${entry.relativePath}:`, message);
      return {
        extracted: {
          fileName: entry.relativePath,
          size: entry.buffer.length,
          type,
          resolution: "—",
          duration: "—",
          valid: false,
          reason: message.includes("timed out")
            ? "Video metadata extraction timed out"
            : "Could not read video metadata",
        } satisfies ExtractedFileResult,
        video: null,
      };
    }
  });

  const extractedFiles = results.map((r) => r.extracted);
  const videoEntries = results.filter((r) => r.video).map((r) => r.video!);

  const validCount = extractedFiles.filter((f) => f.valid).length;
  const invalidCount = extractedFiles.length - validCount;
  console.log(
    `[zip-upload] Validation complete: ${validCount} valid, ${invalidCount} invalid`
  );

  return { extractedFiles, videoEntries };
}

export async function POST(request: NextRequest) {
  const authError = await validateApiAccess(request, false);
  if (authError) return authError;

  try {
    await connectDB();
    const formData = await request.formData();
    const zipFile = formData.get("file") as File;
    const preview = formData.get("preview") === "true";
    const defaultStatus = (formData.get("status") as string) || "Published";

    console.log(`[zip-upload] Request received (preview=${preview})`);

    if (!zipFile) {
      return apiError("ZIP file is required", 400);
    }

    console.log(`[zip-upload] File: ${zipFile.name}, size=${zipFile.size} bytes`);

    const fileName = zipFile.name.toLowerCase();
    if (!fileName.endsWith(".zip")) {
      return apiError("File must be a .zip archive", 400);
    }

    if (zipFile.size === 0) {
      return apiError("ZIP file is empty", 400);
    }

    if (zipFile.size > MAX_ZIP_SIZE) {
      return apiError("ZIP file exceeds 500MB limit", 400);
    }

    const buffer = Buffer.from(await zipFile.arrayBuffer());
    console.log("[zip-upload] ZIP buffer loaded, extracting entries...");

    let zipEntries;
    try {
      zipEntries = await loadZipEntries(buffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid or corrupted ZIP file";
      console.error("[zip-upload] Extraction failed:", message);
      return apiError(message, 400);
    }

    console.log(`[zip-upload] Extracted ${zipEntries.length} usable entries`);

    const { extractedFiles, videoEntries } = await buildExtractedFileResults(zipEntries);

    if (preview) {
      console.log("[zip-upload] Preview complete");
      return apiSuccess({
        stage: "completed",
        files: extractedFiles,
        summary: {
          total: extractedFiles.length,
          valid: extractedFiles.filter((f) => f.valid).length,
          invalid: extractedFiles.filter((f) => !f.valid).length,
        },
      });
    }

    if (videoEntries.length === 0) {
      return apiError("No valid MP4/WebM videos found in ZIP", 400);
    }

    if (videoEntries.length > MAX_VIDEOS_PER_ZIP) {
      return apiError(`ZIP contains too many videos (max ${MAX_VIDEOS_PER_ZIP})`, 400);
    }

    console.log(`[zip-upload] Saving ${videoEntries.length} wallpapers...`);
    const startOrder = await getNextWallpaperOrder();
    const categoryCache = new Map<string, { _id: unknown; slug: string }>();
    const saveErrors: string[] = [];

    const created = await mapWithConcurrency(videoEntries, SAVE_CONCURRENCY, async (entry, index) => {
      try {
        const uploaded = await saveVideoFromBuffer(entry.buffer, entry.relativePath);
        const name = nameFromZipPath(entry.relativePath) || uploaded.fileName;
        const categorySlug = categorySlugFromZipPath(entry.relativePath);

        let categoryId = null;
        let category = "";
        if (categorySlug) {
          let cachedCategory = categoryCache.get(categorySlug);
          if (!cachedCategory) {
            const createdCategory = await getOrCreateCategory(categorySlug);
            if (createdCategory) {
              cachedCategory = { _id: createdCategory._id, slug: createdCategory.slug };
              categoryCache.set(categorySlug, cachedCategory);
            }
          }
          if (cachedCategory) {
            categoryId = cachedCategory._id;
            category = cachedCategory.slug;
          }
        }

        const order = startOrder + index;
        const wallpaper = await Sound.create({
          name,
          url: uploaded.url,
          fileName: uploaded.fileName,
          fileSize: uploaded.fileSize,
          format: uploaded.format,
          mimeType: uploaded.mimeType,
          width: uploaded.width,
          height: uploaded.height,
          duration: uploaded.duration,
          thumbnailUrl: uploaded.thumbnailUrl,
          status: defaultStatus,
          order,
          categoryId,
          category,
        });
        console.log(`[zip-upload] Saved: ${entry.relativePath} (order=${order})`);
        return wallpaper.toObject();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Save failed";
        console.error(`[zip-upload] Save error for ${entry.relativePath}:`, message);
        saveErrors.push(`${entry.relativePath}: ${message}`);
        return null;
      }
    });

    const saved = created.filter((item): item is NonNullable<typeof item> => item !== null);
    console.log(`[zip-upload] Save complete: ${saved.length}/${videoEntries.length} saved`);

    if (saved.length === 0) {
      return apiError(
        saveErrors.length > 0
          ? `Failed to save wallpapers: ${saveErrors.slice(0, 3).join("; ")}`
          : "Failed to save wallpapers",
        500
      );
    }

    return apiSuccess(
      {
        stage: "completed",
        count: saved.length,
        wallpapers: formatSounds(saved),
        files: extractedFiles,
        errors: saveErrors.length > 0 ? saveErrors : undefined,
      },
      201
    );
  } catch (err) {
    console.error("[zip-upload] Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Failed to process ZIP file";
    return apiError(message, 500);
  }
}
