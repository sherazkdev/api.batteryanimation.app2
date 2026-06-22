import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "./auth";
import { ChunkUploadError } from "@/lib/chunk-upload";

export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getAdminSession();
  if (!session) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }
  return null;
}

export async function requireAdminFromRequest(request: NextRequest): Promise<NextResponse | null> {
  return requireAdmin();
}

export function apiError(message: string, status: number = 400, code?: string) {
  return NextResponse.json(
    { success: false, message, ...(code ? { code } : {}) },
    { status }
  );
}

export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export async function runAdminRoute<T>(
  handler: () => Promise<NextResponse | T>
): Promise<NextResponse> {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const result = await handler();
    if (result instanceof NextResponse) return result;
    return apiSuccess(result);
  } catch (err) {
    console.error("[api]", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return apiError(message, 500);
  }
}

export function apiErrorFromException(err: unknown, fallbackMessage: string) {
  if (err instanceof ChunkUploadError) {
    return apiError(err.message, err.statusCode, err.code);
  }

  const message = err instanceof Error ? err.message : fallbackMessage;
  const lower = message.toLowerCase();

  if (lower.includes("not found")) {
    return apiError(message, 404, "NOT_FOUND");
  }
  if (lower.includes("busy") || lower.includes("already completed") || lower.includes("failed")) {
    return apiError(message, 409, "CONFLICT");
  }
  if (lower.includes("exceeds") && lower.includes("limit")) {
    return apiError(message, 413, "PAYLOAD_TOO_LARGE");
  }
  if (lower.includes("timed out")) {
    return apiError(message, 504, "TIMEOUT");
  }
  if (lower.includes("expired")) {
    return apiError(message, 410, "SESSION_EXPIRED");
  }

  return apiError(message, 400, "BAD_REQUEST");
}
