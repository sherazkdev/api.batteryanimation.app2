import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-utils";
import {
  initChunkSession,
  saveChunk,
  getChunkSessionStatus,
  mergeChunkSession,
  isValidSessionId,
} from "@/lib/chunk-upload";
import { processZipBuffer } from "@/lib/animation-handlers";

export async function handleChunkUploadInit(request: NextRequest) {
  try {
    const body = await request.json();
    const fileName = String(body.fileName || "");
    const fileSize = Number(body.fileSize);
    const totalChunks = Number(body.totalChunks);

    if (!fileName) return apiError("fileName is required", 400, "MISSING_FIELD");
    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return apiError("fileSize must be a positive number", 400, "INVALID_FIELD");
    }
    if (!Number.isInteger(totalChunks) || totalChunks < 1) {
      return apiError("totalChunks must be a positive integer", 400, "INVALID_FIELD");
    }

    const sessionId = uuidv4();
    const meta = await initChunkSession({ fileName, fileSize, totalChunks, sessionId });

    return apiSuccess({
      sessionId: meta.sessionId,
      status: meta.status,
      totalChunks: meta.totalChunks,
    });
  } catch (err) {
    return apiErrorFromException(err, "Failed to init upload session");
  }
}

export async function handleChunkUploadChunk(request: NextRequest) {
  try {
    const formData = await request.formData();
    const sessionId = String(formData.get("sessionId") || "");
    const index = Number(formData.get("index"));
    const totalChunks = Number(formData.get("totalChunks"));
    const chunk = formData.get("chunk") as File | null;

    if (!sessionId) return apiError("sessionId is required", 400, "MISSING_FIELD");
    if (!isValidSessionId(sessionId)) {
      return apiError("sessionId must be a valid UUID", 400, "INVALID_SESSION");
    }
    if (!Number.isInteger(index)) return apiError("index must be an integer", 400, "INVALID_FIELD");
    if (!Number.isInteger(totalChunks)) {
      return apiError("totalChunks must be an integer", 400, "INVALID_FIELD");
    }
    if (!chunk || chunk.size === 0) return apiError("chunk file is required", 400, "MISSING_FIELD");

    const buffer = Buffer.from(await chunk.arrayBuffer());
    const result = await saveChunk({ sessionId, index, totalChunks, data: buffer });

    return apiSuccess({
      sessionId,
      index,
      received: result.meta.receivedChunks.length,
      totalChunks: result.meta.totalChunks,
      status: result.meta.status,
      readyToMerge: result.readyToMerge,
      missingChunks: result.missingChunks,
    });
  } catch (err) {
    return apiErrorFromException(err, "Failed to save chunk");
  }
}

export async function handleChunkUploadMerge(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId = String(body.sessionId || "");
    const preview = body.preview !== false;
    const defaultStatus = String(body.status || "Published");

    if (!sessionId) return apiError("sessionId is required", 400, "MISSING_FIELD");
    if (!isValidSessionId(sessionId)) {
      return apiError("sessionId must be a valid UUID", 400, "INVALID_SESSION");
    }

    const meta = await mergeChunkSession(
      sessionId,
      async (zipBuffer, opts) => processZipBuffer(zipBuffer, opts),
      { preview, defaultStatus }
    );

    if (preview) {
      return apiSuccess({
        sessionId,
        status: meta.status,
        ...(meta.previewData as object),
      });
    }

    return apiSuccess(
      {
        sessionId,
        status: meta.status,
        ...(meta.saveData as object),
      },
      201
    );
  } catch (err) {
    return apiErrorFromException(err, "Failed to merge chunks");
  }
}

export async function handleChunkUploadStatus(sessionId: string) {
  if (!isValidSessionId(sessionId)) {
    return apiError("Invalid session ID", 400, "INVALID_SESSION");
  }

  const status = await getChunkSessionStatus(sessionId);
  if (!status) return apiError("Upload session not found or expired", 404, "SESSION_NOT_FOUND");

  return apiSuccess({
    sessionId: status.sessionId,
    fileName: status.fileName,
    fileSize: status.fileSize,
    totalChunks: status.totalChunks,
    receivedChunks: status.receivedChunks,
    missingChunks: status.missingChunks,
    progress: status.progress,
    status: status.status,
    error: status.error,
    previewData: status.previewData,
    saveData: status.saveData,
  });
}
