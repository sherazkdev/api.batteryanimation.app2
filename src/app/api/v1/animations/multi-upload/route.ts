export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { validateApiAccess } from "@/lib/api-access";
import { handleMultiUpload } from "@/lib/animation-handlers";

export async function POST(request: NextRequest) {
  const authError = await validateApiAccess(request, false);
  if (authError) return authError;
  return handleMultiUpload(request, true);
}
