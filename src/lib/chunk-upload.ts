import { createReadStream, createWriteStream, existsSync } from "fs";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "fs/promises";
import path from "path";

export type ChunkUploadStatus =
  | "uploading"
  | "ready"
  | "merging"
  | "extracting"
  | "saving"
  | "completed"
  | "failed";

export interface ChunkSessionMeta {
  sessionId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  receivedChunks: number[];
  status: ChunkUploadStatus;
  error?: string;
  mergedZipPath?: string;
  previewData?: unknown;
  saveData?: unknown;
  createdAt: string;
  updatedAt: string;
}

export class ChunkUploadError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "ChunkUploadError";
  }
}

export const CHUNK_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export const MERGE_TIMEOUT_MS = 5 * 60 * 1000;
export const MAX_ZIP_SIZE = 500 * 1024 * 1024;
export const MAX_CHUNK_BYTES = 15 * 1024 * 1024;

const CHUNKS_BASE = path.join(process.cwd(), "public", "uploads", "chunks");
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04] as const;
const EMPTY_ZIP_MAGIC = [0x50, 0x4b, 0x05, 0x06] as const;

const mergeLocks = new Set<string>();
const chunkSaveLocks = new Map<string, Promise<void>>();
let cleanupScheduled = false;

async function withSessionLock<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
  const previous = chunkSaveLocks.get(sessionId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  chunkSaveLocks.set(sessionId, previous.then(() => current));

  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (chunkSaveLocks.get(sessionId) === current) {
      chunkSaveLocks.delete(sessionId);
    }
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new ChunkUploadError(
                `${label} timed out after ${Math.round(ms / 1000)}s`,
                "TIMEOUT",
                504
              )
            ),
          ms
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function listReceivedChunkIndices(sessionId: string, totalChunks: number): Promise<number[]> {
  const received: number[] = [];
  for (let i = 0; i < totalChunks; i++) {
    if (existsSync(chunkFilePath(sessionId, i))) {
      received.push(i);
    }
  }
  return received;
}

export function getSessionDir(sessionId: string): string {
  return path.join(CHUNKS_BASE, sessionId);
}

function metaPath(sessionId: string): string {
  return path.join(getSessionDir(sessionId), "session.json");
}

export function chunkFilePath(sessionId: string, index: number): string {
  return path.join(getSessionDir(sessionId), `chunk_${String(index).padStart(5, "0")}`);
}

function mergedZipPath(sessionId: string): string {
  return path.join(getSessionDir(sessionId), "merged.zip");
}

export function isValidSessionId(sessionId: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(sessionId);
}

function assertSessionNotExpired(meta: ChunkSessionMeta): void {
  const age = Date.now() - new Date(meta.createdAt).getTime();
  if (age > CHUNK_SESSION_TTL_MS) {
    throw new ChunkUploadError(
      `Upload session expired (${Math.round(CHUNK_SESSION_TTL_MS / 3600000)}h TTL)`,
      "SESSION_EXPIRED",
      410
    );
  }
}

async function readMeta(sessionId: string): Promise<ChunkSessionMeta | null> {
  if (!isValidSessionId(sessionId)) return null;
  const file = metaPath(sessionId);
  if (!existsSync(file)) return null;
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as ChunkSessionMeta;
  } catch {
    throw new ChunkUploadError("Upload session metadata is corrupted", "CORRUPT_META", 500);
  }
}

async function writeMeta(meta: ChunkSessionMeta): Promise<void> {
  meta.updatedAt = new Date().toISOString();
  const file = metaPath(meta.sessionId);
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(meta, null, 2), "utf8");
  await rename(tmp, file);
}

export function scheduleChunkSessionCleanup(): void {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  void cleanupExpiredChunkSessions().catch(() => {});
}

export async function cleanupExpiredChunkSessions(): Promise<number> {
  await mkdir(CHUNKS_BASE, { recursive: true });
  const entries = await readdir(CHUNKS_BASE, { withFileTypes: true });
  const now = Date.now();
  let removed = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const sessionId = entry.name;
    if (!isValidSessionId(sessionId)) continue;

    const metaFile = metaPath(sessionId);
    if (!existsSync(metaFile)) {
      await rm(getSessionDir(sessionId), { recursive: true, force: true });
      removed++;
      continue;
    }

    try {
      const raw = await readFile(metaFile, "utf8");
      const meta = JSON.parse(raw) as ChunkSessionMeta;
      const age = now - new Date(meta.createdAt).getTime();
      const isStale =
        age > CHUNK_SESSION_TTL_MS ||
        (meta.status === "failed" && age > 60 * 60 * 1000) ||
        (meta.status === "completed" && meta.saveData && age > 60 * 60 * 1000);

      if (isStale) {
        await cleanupChunkSession(sessionId);
        removed++;
      }
    } catch {
      await rm(getSessionDir(sessionId), { recursive: true, force: true });
      removed++;
    }
  }

  return removed;
}

export async function initChunkSession(params: {
  fileName: string;
  fileSize: number;
  totalChunks: number;
  sessionId: string;
}): Promise<ChunkSessionMeta> {
  scheduleChunkSessionCleanup();

  const { fileName, fileSize, totalChunks, sessionId } = params;

  if (!isValidSessionId(sessionId)) {
    throw new ChunkUploadError("Invalid session ID", "INVALID_SESSION", 400);
  }
  if (!fileName.toLowerCase().endsWith(".zip")) {
    throw new ChunkUploadError("File must be a ZIP archive (.zip)", "INVALID_FILE_TYPE", 400);
  }
  if (fileSize <= 0) {
    throw new ChunkUploadError("File size must be greater than zero", "INVALID_FILE_SIZE", 400);
  }
  if (totalChunks < 1) {
    throw new ChunkUploadError("totalChunks must be at least 1", "INVALID_CHUNK_COUNT", 400);
  }
  if (fileSize > MAX_ZIP_SIZE) {
    throw new ChunkUploadError("ZIP file exceeds 500MB limit", "FILE_TOO_LARGE", 413);
  }

  const expectedMinChunkSize = Math.ceil(fileSize / totalChunks);
  if (expectedMinChunkSize > MAX_CHUNK_BYTES) {
    throw new ChunkUploadError(
      `Chunk size too large; use more chunks (max ${MAX_CHUNK_BYTES / 1024 / 1024}MB per chunk)`,
      "CHUNK_TOO_LARGE",
      400
    );
  }

  const dir = getSessionDir(sessionId);
  if (existsSync(dir)) {
    throw new ChunkUploadError("Upload session already exists", "SESSION_EXISTS", 409);
  }
  await mkdir(dir, { recursive: true });

  const now = new Date().toISOString();
  const meta: ChunkSessionMeta = {
    sessionId,
    fileName,
    fileSize,
    totalChunks,
    receivedChunks: [],
    status: "uploading",
    createdAt: now,
    updatedAt: now,
  };

  await writeMeta(meta);
  return meta;
}

function getMissingChunks(meta: ChunkSessionMeta): number[] {
  const received = new Set(meta.receivedChunks);
  const missing: number[] = [];
  for (let i = 0; i < meta.totalChunks; i++) {
    if (!received.has(i)) missing.push(i);
  }
  return missing;
}

export async function saveChunk(params: {
  sessionId: string;
  index: number;
  totalChunks: number;
  data: Buffer;
}): Promise<{ meta: ChunkSessionMeta; readyToMerge: boolean; missingChunks: number[] }> {
  const { sessionId, index, totalChunks, data } = params;

  if (!isValidSessionId(sessionId)) {
    throw new ChunkUploadError("Invalid session ID", "INVALID_SESSION", 400);
  }
  if (data.length > MAX_CHUNK_BYTES) {
    throw new ChunkUploadError(
      `Chunk exceeds ${MAX_CHUNK_BYTES / 1024 / 1024}MB limit`,
      "CHUNK_TOO_LARGE",
      413
    );
  }

  return withSessionLock(sessionId, async () => {
    const meta = await readMeta(sessionId);
    if (!meta) {
      throw new ChunkUploadError("Upload session not found", "SESSION_NOT_FOUND", 404);
    }

    assertSessionNotExpired(meta);

    if (meta.status === "merging" || meta.status === "extracting" || meta.status === "saving") {
      throw new ChunkUploadError("Upload session is busy processing", "SESSION_BUSY", 409);
    }
    if (meta.status === "completed") {
      throw new ChunkUploadError("Upload session already completed", "SESSION_COMPLETED", 409);
    }
    if (meta.status === "failed") {
      throw new ChunkUploadError(
        meta.error ? `Upload session failed: ${meta.error}` : "Upload session failed",
        "SESSION_FAILED",
        409
      );
    }

    if (!Number.isInteger(index) || index < 0 || index >= totalChunks) {
      throw new ChunkUploadError(`Invalid chunk index ${index}`, "INVALID_INDEX", 400);
    }
    if (totalChunks !== meta.totalChunks) {
      throw new ChunkUploadError(
        `totalChunks mismatch: expected ${meta.totalChunks}, got ${totalChunks}`,
        "CHUNK_COUNT_MISMATCH",
        400
      );
    }
    if (data.length === 0) {
      throw new ChunkUploadError("Chunk data is empty", "EMPTY_CHUNK", 400);
    }

    await writeFile(chunkFilePath(sessionId, index), data);

    const received = await listReceivedChunkIndices(sessionId, meta.totalChunks);
    meta.receivedChunks = received;
    meta.status = received.length === meta.totalChunks ? "ready" : "uploading";
    await writeMeta(meta);

    const missingChunks = getMissingChunks(meta);
    return {
      meta,
      readyToMerge: missingChunks.length === 0,
      missingChunks,
    };
  });
}

export async function getChunkSessionStatus(
  sessionId: string
): Promise<(ChunkSessionMeta & { missingChunks: number[]; progress: number }) | null> {
  if (!isValidSessionId(sessionId)) return null;

  const meta = await readMeta(sessionId);
  if (!meta) return null;

  try {
    assertSessionNotExpired(meta);
  } catch {
    return null;
  }

  meta.receivedChunks = await listReceivedChunkIndices(sessionId, meta.totalChunks);
  if (meta.receivedChunks.length === meta.totalChunks && meta.status === "uploading") {
    meta.status = "ready";
  }

  const missingChunks = getMissingChunks(meta);
  const progress =
    meta.totalChunks > 0
      ? Math.round((meta.receivedChunks.length / meta.totalChunks) * 100)
      : 0;

  return { ...meta, missingChunks, progress };
}

async function validateZipMagicBytes(filePath: string): Promise<void> {
  const fd = createReadStream(filePath, { start: 0, end: 3 });
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    fd.on("data", (chunk) => chunks.push(chunk as Buffer));
    fd.on("error", reject);
    fd.on("end", () => {
      const header = Buffer.concat(chunks);
      if (header.length < 4) {
        reject(
          new ChunkUploadError(
            "Merged file is too small to be a valid ZIP",
            "INVALID_ZIP",
            400
          )
        );
        return;
      }
      const bytes = [header[0], header[1], header[2], header[3]];
      const isStandard = ZIP_MAGIC.every((b, i) => bytes[i] === b);
      const isEmpty = EMPTY_ZIP_MAGIC.every((b, i) => bytes[i] === b);
      if (!isStandard && !isEmpty) {
        reject(
          new ChunkUploadError(
            "Merged file is not a valid ZIP archive (invalid magic bytes)",
            "INVALID_ZIP",
            400
          )
        );
        return;
      }
      resolve();
    });
  });
}

async function appendFileToStream(
  sourcePath: string,
  destStream: ReturnType<typeof createWriteStream>
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const readStream = createReadStream(sourcePath);
    readStream.on("error", reject);
    readStream.on("end", resolve);
    readStream.pipe(destStream, { end: false });
  });
}

async function streamMergeChunks(
  sessionId: string,
  totalChunks: number,
  outputPath: string
): Promise<void> {
  const writeStream = createWriteStream(outputPath, { flags: "w" });

  for (let i = 0; i < totalChunks; i++) {
    const partPath = chunkFilePath(sessionId, i);
    if (!existsSync(partPath)) {
      writeStream.destroy();
      throw new ChunkUploadError(`Missing chunk ${i} of ${totalChunks}`, "MISSING_CHUNK", 400);
    }
    await appendFileToStream(partPath, writeStream);
  }

  await new Promise<void>((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
    writeStream.end();
  });
}

async function cleanupChunkFiles(
  sessionId: string,
  totalChunks: number,
  keepMerged = false
): Promise<void> {
  for (let i = 0; i < totalChunks; i++) {
    const partPath = chunkFilePath(sessionId, i);
    if (existsSync(partPath)) {
      await rm(partPath, { force: true });
    }
  }
  if (!keepMerged) {
    const merged = mergedZipPath(sessionId);
    if (existsSync(merged)) await rm(merged, { force: true });
  }
}

export async function cleanupChunkSession(sessionId: string): Promise<void> {
  if (!isValidSessionId(sessionId)) return;
  const dir = getSessionDir(sessionId);
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true });
  }
}

export type MergeHandler = (
  zipBuffer: Buffer,
  options: { preview: boolean; defaultStatus: string }
) => Promise<{ previewData?: unknown; saveData?: unknown }>;

export async function mergeChunkSession(
  sessionId: string,
  processZip: MergeHandler,
  options: { preview?: boolean; defaultStatus?: string; force?: boolean } = {}
): Promise<ChunkSessionMeta> {
  const preview = options.preview ?? true;
  const defaultStatus = options.defaultStatus ?? "Published";

  if (!isValidSessionId(sessionId)) {
    throw new ChunkUploadError("Invalid session ID", "INVALID_SESSION", 400);
  }

  if (mergeLocks.has(sessionId)) {
    const meta = await readMeta(sessionId);
    if (!meta) {
      throw new ChunkUploadError("Upload session not found", "SESSION_NOT_FOUND", 404);
    }
    return meta;
  }

  mergeLocks.add(sessionId);

  let meta = await readMeta(sessionId);
  if (!meta) {
    mergeLocks.delete(sessionId);
    throw new ChunkUploadError("Upload session not found", "SESSION_NOT_FOUND", 404);
  }

  try {
    assertSessionNotExpired(meta);

    const missing = getMissingChunks(meta);
    if (missing.length > 0) {
      const onDisk = await listReceivedChunkIndices(sessionId, meta.totalChunks);
      meta.receivedChunks = onDisk;
      const stillMissing = getMissingChunks(meta);
      if (stillMissing.length > 0) {
        throw new ChunkUploadError(
          `Missing chunks: ${stillMissing.join(", ")}`,
          "MISSING_CHUNK",
          400
        );
      }
    }

    if (meta.status === "completed" && !options.force) {
      if (preview && meta.previewData) return meta;
      if (!preview && meta.saveData) return meta;
    }

    if (
      !options.force &&
      meta.mergedZipPath &&
      existsSync(meta.mergedZipPath) &&
      preview &&
      meta.previewData
    ) {
      meta.status = "completed";
      await writeMeta(meta);
      return meta;
    }

    const canReuseMergedZip =
      !options.force &&
      meta.mergedZipPath &&
      existsSync(meta.mergedZipPath) &&
      missing.length === 0;

    if (!canReuseMergedZip) {
      meta.status = "merging";
      meta.error = undefined;
      await writeMeta(meta);

      const outputPath = mergedZipPath(sessionId);
      await withTimeout(
        streamMergeChunks(sessionId, meta.totalChunks, outputPath),
        MERGE_TIMEOUT_MS,
        "Chunk merge"
      );

      const mergedStat = await stat(outputPath);
      if (mergedStat.size !== meta.fileSize) {
        throw new ChunkUploadError(
          `Merged file size mismatch: expected ${meta.fileSize}, got ${mergedStat.size}`,
          "SIZE_MISMATCH",
          400
        );
      }

      await validateZipMagicBytes(outputPath);
      meta.mergedZipPath = outputPath;
      await writeMeta(meta);
    }

    meta.status = "extracting";
    await writeMeta(meta);

    const zipBuffer = await readFile(meta.mergedZipPath!);

    if (!preview) {
      meta.status = "saving";
      await writeMeta(meta);
    }

    const result = await withTimeout(
      processZip(zipBuffer, { preview, defaultStatus }),
      MERGE_TIMEOUT_MS,
      preview ? "ZIP preview" : "ZIP save"
    );

    if (preview) {
      meta.previewData = result.previewData;
      meta.status = "completed";
    } else {
      meta.saveData = result.saveData;
      meta.status = "completed";
      await cleanupChunkFiles(sessionId, meta.totalChunks, false);
      await cleanupChunkSession(sessionId);
      mergeLocks.delete(sessionId);
      return meta;
    }

    await writeMeta(meta);
    return meta;
  } catch (err) {
    meta = (await readMeta(sessionId)) || meta;
    meta.status = "failed";
    meta.error = err instanceof Error ? err.message : "Merge failed";
    await writeMeta(meta);
    throw err;
  } finally {
    mergeLocks.delete(sessionId);
  }
}
