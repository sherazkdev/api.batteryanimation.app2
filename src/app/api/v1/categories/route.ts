export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { validateApiAccess } from "@/lib/api-access";
import { handleCategoryList } from "@/lib/animation-handlers";

export async function GET(request: NextRequest) {
  const authError = await validateApiAccess(request);
  if (authError) return authError;
  return handleCategoryList();
}
