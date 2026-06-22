export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { validateApiAccess } from "@/lib/api-access";
import { apiError } from "@/lib/api-utils";
import { handleBulkDelete } from "@/lib/animation-handlers";

export async function POST(request: NextRequest) {
  const authError = await validateApiAccess(request);
  if (authError) return authError;

  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return apiError("No animation IDs provided", 400, "MISSING_FIELD");
  }
  return handleBulkDelete(ids);
}
