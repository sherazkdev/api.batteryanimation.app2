import { writeFile, mkdir, unlink, access } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { uploadFileExists } from "@/lib/serve-media";

const execFileAsync = promisify(execFile);

function getUploadDir(subdir = "wallpapers") {
  return path.join(process.cwd(), "public", "uploads", subdir);
}

function getThumbnailDir(subdir = "wallpapers") {
  return path.join(process.cwd(), "public", "uploads", "thumbnails", subdir);
}

const VALID_VIDEO_EXTENSIONS = ["mp4", "webm"];
const VALID_VIDEO_MIMES = ["video/mp4", "video/webm"];
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

export const FFMPEG_TIMEOUT_MS = 30_000;
export const METADATA_CONCURRENCY = 4;
export const SAVE_CONCURRENCY = 2;

export class ThumbnailGenerationError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ThumbnailGenerationError";
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

function safeBaseName(fileName: string): string {
  const base = path.basename(fileName.replace(/\\/g, "/"));
  if (!base || base === "." || base === ".." || base.includes("\0")) {
    throw new Error("Invalid file name");
  }
  return base;
}

function getFfprobePath(): string {
  return ffprobeInstaller.path;
}

function getFfmpegPath(): string {
  return ffmpegInstaller.path;
}

export async function ensureUploadDir(subdir = "wallpapers") {
  await mkdir(getUploadDir(subdir), { recursive: true });
  await mkdir(getThumbnailDir(subdir), { recursive: true });
}

export function isValidVideoFile(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase();
  return VALID_VIDEO_EXTENSIONS.includes(ext || "");
}

export function isValidVideoMime(mimeType: string): boolean {
  return VALID_VIDEO_MIMES.includes(mimeType);
}

export function getVideoFormat(fileName: string): string {
  return (fileName.split(".").pop()?.toLowerCase() || "").toUpperCase();
}

export function getMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  return ext === "webm" ? "video/webm" : "video/mp4";
}

export function deriveMediaName(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
}

async function getVideoMetadataFromPath(filePath: string): Promise<{
  width: number;
  height: number;
  duration: number;
}> {
  try {
    const ffprobePath = getFfprobePath();
    const { stdout } = await execFileAsync(ffprobePath, [
      "-v", "quiet",
      "-print_format", "json",
      "-show_format",
      "-show_streams",
      filePath,
    ]);
    const data = JSON.parse(stdout);
    const videoStream = data.streams?.find(
      (s: { codec_type?: string }) => s.codec_type === "video"
    );
    return {
      width: videoStream?.width || 0,
      height: videoStream?.height || 0,
      duration: parseFloat(data.format?.duration || "0"),
    };
  } catch {
    return { width: 0, height: 0, duration: 0 };
  }
}

async function generateThumbnail(videoPath: string, thumbnailFileName: string, subdir = "wallpapers"): Promise<string> {
  const thumbnailDir = getThumbnailDir(subdir);
  const thumbnailPath = path.join(thumbnailDir, thumbnailFileName);
  const relativePath = `/uploads/thumbnails/${subdir}/${thumbnailFileName}`;

  try {
    const ffmpegPath = getFfmpegPath();
    await execFileAsync(ffmpegPath, [
      "-ss", "00:00:01",
      "-i", videoPath,
      "-frames:v", "1",
      "-q:v", "2",
      "-y",
      thumbnailPath,
    ]);
    await access(thumbnailPath);
    if (!uploadFileExists(`thumbnails/${subdir}/${thumbnailFileName}`)) {
      throw new ThumbnailGenerationError(
        `Thumbnail file missing after ffmpeg: ${thumbnailPath}`
      );
    }
    return relativePath;
  } catch (err) {
    console.error("[upload] Thumbnail generation failed:", {
      videoPath,
      thumbnailPath,
      error: err instanceof Error ? err.message : err,
    });
    try {
      await unlink(thumbnailPath);
    } catch {
      // ignore partial output cleanup
    }
    throw new ThumbnailGenerationError("Failed to generate video thumbnail", err);
  }
}

export interface UploadedVideoResult {
  url: string;
  fileName: string;
  fileSize: number;
  format: string;
  width: number;
  height: number;
  duration: number;
  mimeType: string;
  thumbnailUrl: string;
}

export async function saveUploadedVideo(
  file: File,
  customName?: string,
  subdir = "wallpapers"
): Promise<UploadedVideoResult> {
  await ensureUploadDir(subdir);

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!isValidVideoFile(file.name)) {
    throw new Error("Invalid video format. Only MP4 and WebM are supported.");
  }
  if (file.type && !isValidVideoMime(file.type) && file.type !== "application/octet-stream") {
    throw new Error("Invalid video MIME type. Only MP4 and WebM are supported.");
  }
  if (file.size > MAX_VIDEO_SIZE) {
    throw new Error("Video file exceeds 100MB limit.");
  }

  const fileName = customName || `${uuidv4()}.${ext}`;
  const filePath = path.join(getUploadDir(subdir), fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);
  if (!uploadFileExists(`${subdir}/${fileName}`)) {
    throw new Error(`Video file was not written to disk: ${filePath}`);
  }

  const metadata = await getVideoMetadataFromPath(filePath);
  const thumbnailFileName = `${path.parse(fileName).name}.jpg`;

  try {
    const thumbnailUrl = await generateThumbnail(filePath, thumbnailFileName, subdir);
    return {
      url: `/uploads/${subdir}/${fileName}`,
      fileName,
      fileSize: buffer.length,
      format: getVideoFormat(fileName),
      width: metadata.width,
      height: metadata.height,
      duration: metadata.duration,
      mimeType: getMimeType(fileName),
      thumbnailUrl,
    };
  } catch (err) {
    try {
      await unlink(filePath);
    } catch {
      // ignore cleanup errors
    }
    throw err;
  }
}

export async function getVideoMetadataFromBuffer(buffer: Buffer, fileName: string, subdir = "wallpapers") {
  await ensureUploadDir(subdir);
  const safeName = safeBaseName(fileName);
  const tempName = `temp_${uuidv4()}_${safeName}`;
  const tempPath = path.join(getUploadDir(subdir), tempName);
  await writeFile(tempPath, buffer);

  try {
    const metadata = await getVideoMetadataFromPath(tempPath);
    return {
      width: metadata.width,
      height: metadata.height,
      duration: metadata.duration,
      format: getVideoFormat(safeName),
      fileSize: buffer.length,
      mimeType: getMimeType(safeName),
    };
  } finally {
    try {
      await unlink(tempPath);
    } catch {
      // ignore
    }
  }
}

export async function saveVideoFromBuffer(
  buffer: Buffer,
  originalFileName: string,
  subdir = "wallpapers"
): Promise<UploadedVideoResult> {
  const safeName = safeBaseName(originalFileName);
  if (!isValidVideoFile(safeName)) {
    throw new Error("Invalid video format");
  }
  await ensureUploadDir(subdir);
  const ext = safeName.split(".").pop()?.toLowerCase() || "mp4";
  const fileName = `${uuidv4()}.${ext}`;
  const filePath = path.join(getUploadDir(subdir), fileName);
  await writeFile(filePath, buffer);
  if (!uploadFileExists(`${subdir}/${fileName}`)) {
    throw new Error(`Video file was not written to disk: ${filePath}`);
  }

  const metadata = await getVideoMetadataFromPath(filePath);
  const thumbnailFileName = `${path.parse(fileName).name}.jpg`;

  try {
    const thumbnailUrl = await generateThumbnail(filePath, thumbnailFileName, subdir);
    return {
      url: `/uploads/${subdir}/${fileName}`,
      fileName,
      fileSize: buffer.length,
      format: getVideoFormat(safeName),
      width: metadata.width,
      height: metadata.height,
      duration: metadata.duration,
      mimeType: getMimeType(safeName),
      thumbnailUrl,
    };
  } catch (err) {
    try {
      await unlink(filePath);
    } catch {
      // ignore cleanup errors
    }
    throw err;
  }
}

export async function deleteMediaFiles(fileName: string, thumbnailUrl?: string | null, subdir = "wallpapers") {
  try {
    await unlink(path.join(getUploadDir(subdir), fileName));
  } catch {
    // file may not exist
  }
  if (thumbnailUrl) {
    try {
      const thumbName = path.basename(thumbnailUrl);
      await unlink(path.join(getThumbnailDir(subdir), thumbName));
    } catch {
      // file may not exist
    }
  }
}

export function mediaDataFromUpload(
  uploaded: UploadedVideoResult,
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
  };
}

export const saveUploadedFile = saveUploadedVideo;
export const isValidImageFile = isValidVideoFile;
export const getImageMetadataFromBuffer = getVideoMetadataFromBuffer;
