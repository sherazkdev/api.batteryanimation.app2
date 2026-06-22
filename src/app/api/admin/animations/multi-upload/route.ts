export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api-utils";
import { handleMultiUpload } from "@/lib/animation-handlers";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;
  return handleMultiUpload(request);
}
