import { NextRequest } from "next/server";
import JSZip from "jszip";
import { connectMongoDB } from "@/lib/mongodb";
import { getRequestOrigin } from "@/lib/media-url";
import { serializeAnimation } from "@/lib/serialize";
import { Animation } from "@/models/Animation";
import { Category } from "@/models/Category";
import { apiError, apiSuccess } from "@/lib/api-utils";
import {
  isValidVideoFile,
  getVideoMetadataFromBuffer,
  saveVideoFromBuffer,
  saveUploadedVideo,
  deleteMediaFiles,
  deriveMediaName,
} from "@/lib/upload";
import {
  listAnimations,
  createAnimationRecord,
  getNextOrder,
  compactOrdersAfterDelete,
  reorderAnimations,
} from "@/lib/animation-service";
import {
  findOrCreateCategory,
  getCategoryNameFromZipPath,
  listCategories,
} from "@/lib/category-service";
import { formatDuration } from "@/lib/utils";

const categoryPopulate = { path: "categoryId", select: "name slug order" };

function serializeOptionsForRequest(request: NextRequest | undefined, forPublicApi: boolean) {
  return {
    requestOrigin: request ? getRequestOrigin(request.headers) : undefined,
    absoluteMediaUrls: forPublicApi,
  };
}

function isSafeZipEntryPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) return false;
  if (normalized.includes("..")) return false;
  if (normalized.startsWith("__MACOSX")) return false;
  if (normalized.includes("/.")) return false;
  if (/[\0<>:"|?*]/.test(normalized)) return false;
  return true;
}

export async function handleAnimationList(
  request: NextRequest,
  publishedOnly = false,
  forPublicApi = false
) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const perPage = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("per_page") || searchParams.get("limit") || "10"))
  );
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const format = searchParams.get("format") || "";
  const categoryId = searchParams.get("categoryId") || searchParams.get("category") || "";

  const serializeOptions = serializeOptionsForRequest(request, forPublicApi);
  const { animations, total } = await listAnimations(
    {
      page,
      limit: perPage,
      search,
      status: publishedOnly ? "Published" : status,
      format,
      categoryId: categoryId || undefined,
      publishedOnly,
    },
    serializeOptions
  );

  return apiSuccess({
    animations,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    total,
    page,
    limit: perPage,
    totalPages: Math.ceil(total / perPage),
  });
}

export async function handleAnimationCreate(request: NextRequest, forPublicApi = false) {
  try {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const status = (formData.get("status") as string) || "Draft";
    const tags = formData.get("tags") as string;
    const description = formData.get("description") as string;
    const categoryId = (formData.get("categoryId") as string) || null;
    const file = formData.get("file") as File;

    if (!name?.trim()) return apiError("Animation name is required");
    if (!file) return apiError("Video file is required");

    const uploaded = await saveUploadedVideo(file, undefined, "animations");
    const serializeOptions = serializeOptionsForRequest(request, forPublicApi);
    try {
      const record = await createAnimationRecord(
        uploaded,
        {
          name: name.trim(),
          status,
          tags: tags || null,
          description: description || null,
          categoryId,
        },
        serializeOptions
      );
      return apiSuccess(record, 201);
    } catch (err) {
      await deleteMediaFiles(uploaded.fileName, uploaded.thumbnailUrl, "animations");
      throw err;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create animation";
    return apiError(message, 500);
  }
}

export async function handleAnimationGet(id: string, request?: NextRequest, forPublicApi = false) {
  await connectMongoDB();
  const record = await Animation.findById(id).populate(categoryPopulate).lean();
  if (!record) return apiError("Animation not found", 404);
  const serializeOptions = serializeOptionsForRequest(request, forPublicApi);
  return apiSuccess(serializeAnimation(record, serializeOptions));
}

export async function handleAnimationUpdate(request: NextRequest, id: string, forPublicApi = false) {
  await connectMongoDB();
  const existing = await Animation.findById(id).lean();
  if (!existing) return apiError("Animation not found", 404);

  try {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const status = formData.get("status") as string;
    const tags = formData.get("tags") as string;
    const description = formData.get("description") as string;
    const categoryId = formData.get("categoryId") as string | null;
    const file = formData.get("file") as File | null;

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name.trim();
    if (status) updateData.status = status;
    if (tags !== undefined && tags !== null) updateData.tags = tags || null;
    if (description !== undefined) updateData.description = description || null;
    if (categoryId !== undefined) updateData.categoryId = categoryId || null;

    if (file && file.size > 0) {
      const uploaded = await saveUploadedVideo(file, undefined, "animations");
      try {
        updateData.url = uploaded.url;
        updateData.fileName = uploaded.fileName;
        updateData.fileSize = uploaded.fileSize;
        updateData.format = uploaded.format;
        updateData.mimeType = uploaded.mimeType;
        updateData.width = uploaded.width;
        updateData.height = uploaded.height;
        updateData.duration = uploaded.duration;
        updateData.thumbnailUrl = uploaded.thumbnailUrl;
        await Animation.findByIdAndUpdate(id, updateData);
        await deleteMediaFiles(existing.fileName, existing.thumbnailUrl, "animations");
      } catch (err) {
        await deleteMediaFiles(uploaded.fileName, uploaded.thumbnailUrl, "animations");
        throw err;
      }
    } else {
      await Animation.findByIdAndUpdate(id, updateData);
    }

    const record = await Animation.findById(id).populate(categoryPopulate).lean();
    if (!record) return apiError("Animation not found", 404);
    const serializeOptions = serializeOptionsForRequest(request, forPublicApi);
    return apiSuccess(serializeAnimation(record, serializeOptions));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update animation";
    return apiError(message, 500);
  }
}

export async function handleAnimationDelete(id: string) {
  await connectMongoDB();
  const existing = await Animation.findById(id).lean();
  if (!existing) return apiError("Animation not found", 404);

  await Animation.findByIdAndDelete(id);
  await deleteMediaFiles(existing.fileName, existing.thumbnailUrl, "animations");
  await compactOrdersAfterDelete();

  return apiSuccess({ message: "Animation deleted" });
}

export async function handleBulkDelete(ids: string[]) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return apiError("No animation IDs provided");
  }

  await connectMongoDB();
  const records = await Animation.find({ _id: { $in: ids } }).lean();
  await Animation.deleteMany({ _id: { $in: ids } });

  for (const record of records) {
    await deleteMediaFiles(record.fileName, record.thumbnailUrl, "animations");
  }

  await compactOrdersAfterDelete();
  return apiSuccess({ deleted: records.length });
}

export async function handleAnimationReorder(orderedIds: string[]) {
  try {
    await reorderAnimations(orderedIds);
    return apiSuccess({ message: "Order updated" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reorder animations";
    return apiError(message, 400);
  }
}

export async function handleMultiUpload(request: NextRequest, forPublicApi = false) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const statuses = formData.getAll("statuses") as string[];
    const names = formData.getAll("names") as string[];

    if (files.length === 0) return apiError("No video files provided");

    let nextOrder = await getNextOrder();
    const created = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file || file.size === 0) continue;

      const uploaded = await saveUploadedVideo(file, undefined, "animations");
      const name = names[i]?.trim() || deriveMediaName(file.name);
      const status = statuses[i] || "Published";

      const serializeOptions = serializeOptionsForRequest(request, forPublicApi);
      try {
        const record = await createAnimationRecord(
          uploaded,
          {
            name,
            status,
            order: nextOrder++,
          },
          serializeOptions
        );
        created.push(record);
      } catch (err) {
        await deleteMediaFiles(uploaded.fileName, uploaded.thumbnailUrl, "animations");
        throw err;
      }
    }

    return apiSuccess({ count: created.length, animations: created }, 201);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to upload animations";
    return apiError(message, 500);
  }
}

export async function processZipBuffer(
  buffer: Buffer,
  options: { preview: boolean; defaultStatus?: string }
) {
  const preview = options.preview;
  const defaultStatus = options.defaultStatus || "Published";

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error("Invalid or corrupted ZIP file");
  }

  const extractedFiles: Array<{
    fileName: string;
    zipPath: string;
    category: string | null;
    size: number;
    type: string;
    resolution: string;
    duration: string;
    valid: boolean;
    reason?: string;
  }> = [];

  const videoEntries: Array<{
    zipPath: string;
    fileName: string;
    buffer: Buffer;
    categoryName: string | null;
  }> = [];

  const seenPaths = new Set<string>();

  for (const [zipPath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir || !isSafeZipEntryPath(zipPath)) continue;

    const normalizedPath = zipPath.replace(/\\/g, "/");
    if (seenPaths.has(normalizedPath)) continue;
    seenPaths.add(normalizedPath);

    const baseName = normalizedPath.split("/").pop() || normalizedPath;
    const content = await zipEntry.async("nodebuffer");
    const valid = isValidVideoFile(baseName);
    const type = baseName.split(".").pop()?.toUpperCase() || "UNKNOWN";
    const categoryName = getCategoryNameFromZipPath(normalizedPath);

    let resolution = "—";
    let durationStr = "—";

    if (valid) {
      try {
        const meta = await getVideoMetadataFromBuffer(content, baseName);
        if (meta.width && meta.height) resolution = `${meta.width} x ${meta.height}`;
        if (meta.duration) durationStr = formatDuration(meta.duration);
        videoEntries.push({
          zipPath: normalizedPath,
          fileName: baseName,
          buffer: content,
          categoryName,
        });
      } catch {
        extractedFiles.push({
          fileName: baseName,
          zipPath: normalizedPath,
          category: categoryName,
          size: content.length,
          type,
          resolution: "—",
          duration: "—",
          valid: false,
          reason: "Could not read video metadata",
        });
        continue;
      }
    }

    extractedFiles.push({
      fileName: baseName,
      zipPath: normalizedPath,
      category: categoryName,
      size: content.length,
      type,
      resolution: valid ? resolution : "—",
      duration: valid ? durationStr : "—",
      valid,
      reason: valid ? undefined : "Not a video file (MP4/WebM only)",
    });
  }

  if (extractedFiles.length === 0) {
    throw new Error("ZIP contains no files");
  }

  if (preview) {
    const categories = [...new Set(extractedFiles.map((f) => f.category).filter(Boolean))];
    return {
      previewData: {
        files: extractedFiles,
        summary: {
          total: extractedFiles.length,
          valid: extractedFiles.filter((f) => f.valid).length,
          invalid: extractedFiles.filter((f) => !f.valid).length,
          categories,
        },
      },
    };
  }

  if (videoEntries.length === 0) {
    throw new Error("ZIP contains no valid MP4/WebM video files");
  }

  videoEntries.sort((a, b) => a.zipPath.localeCompare(b.zipPath));

  let nextOrder = await getNextOrder();
  let count = 0;
  const createdCategories = new Map<string, string>();

  for (const entry of videoEntries) {
    let categoryId: string | null = null;
    if (entry.categoryName) {
      const cacheKey = entry.categoryName.toLowerCase();
      if (createdCategories.has(cacheKey)) {
        categoryId = createdCategories.get(cacheKey)!;
      } else {
        const category = await findOrCreateCategory(entry.categoryName);
        createdCategories.set(cacheKey, category.id);
        categoryId = category.id;
      }
    }

    const uploaded = await saveVideoFromBuffer(entry.buffer, entry.fileName, "animations");
    try {
      await createAnimationRecord(uploaded, {
        name: deriveMediaName(entry.fileName),
        status: defaultStatus,
        order: nextOrder++,
        categoryId,
      });
      count++;
    } catch (err) {
      await deleteMediaFiles(uploaded.fileName, uploaded.thumbnailUrl, "animations");
      throw err;
    }
  }

  await connectMongoDB();
  const categories = await Category.find()
    .sort({ order: 1 })
    .select("name slug order")
    .lean();

  return {
    saveData: {
      count,
      files: extractedFiles,
      categories: categories.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        slug: c.slug,
        order: c.order,
      })),
    },
  };
}

export async function handleZipUpload(request: NextRequest) {
  try {
    const formData = await request.formData();
    const zipFile = formData.get("file") as File;
    const preview = formData.get("preview") === "true";
    const defaultStatus = (formData.get("status") as string) || "Published";

    if (!zipFile) return apiError("ZIP file is required");
    if (!zipFile.name.toLowerCase().endsWith(".zip")) {
      return apiError("File must be a ZIP archive");
    }

    const maxSize = 500 * 1024 * 1024;
    if (zipFile.size > maxSize) return apiError("ZIP file exceeds 500MB limit");
    if (zipFile.size === 0) return apiError("ZIP file is empty");

    const buffer = Buffer.from(await zipFile.arrayBuffer());
    const result = await processZipBuffer(buffer, { preview, defaultStatus });

    if (preview) {
      return apiSuccess(result.previewData!);
    }

    return apiSuccess(result.saveData!, 201);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to process ZIP file";
    return apiError(message, 500);
  }
}

export async function handleCategoryList() {
  const categories = await listCategories();
  return apiSuccess({ categories });
}
