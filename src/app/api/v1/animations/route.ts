export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { validateApiAccess } from "@/lib/api-access";
import { handleAnimationList, handleAnimationCreate } from "@/lib/animation-handlers";

export async function GET(request: NextRequest) {
  const authError = await validateApiAccess(request);
  if (authError) return authError;
  return handleAnimationList(request, true, true);
}

export async function POST(request: NextRequest) {
  const authError = await validateApiAccess(request);
  if (authError) return authError;
  return handleAnimationCreate(request, true);
}
