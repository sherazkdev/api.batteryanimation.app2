export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireAdmin, apiError } from "@/lib/api-utils";
import { handleAnimationReorder } from "@/lib/animation-handlers";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = await request.json();
  const orderedIds = body.orderedIds ?? body.ids;

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return apiError("orderedIds array is required");
  }

  return handleAnimationReorder(orderedIds);
}
