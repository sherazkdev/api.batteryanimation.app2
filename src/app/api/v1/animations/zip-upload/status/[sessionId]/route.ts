export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { validateApiAccess } from "@/lib/api-access";
import { handleChunkUploadStatus } from "@/lib/chunk-upload-handlers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const authError = await validateApiAccess(_request, false);
  if (authError) return authError;
  const { sessionId } = await params;
  return handleChunkUploadStatus(sessionId);
}
