export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { validateApiAccess } from "@/lib/api-access";
import { handleChunkUploadInit } from "@/lib/chunk-upload-handlers";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const authError = await validateApiAccess(request, false);
  if (authError) return authError;
  return handleChunkUploadInit(request);
}
