export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { validateApiAccess } from "@/lib/api-access";
import { handleChunkUploadMerge } from "@/lib/chunk-upload-handlers";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const authError = await validateApiAccess(request, false);
  if (authError) return authError;
  return handleChunkUploadMerge(request);
}
