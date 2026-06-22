export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api-utils";
import { handleAnimationList, handleAnimationCreate } from "@/lib/animation-handlers";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;
  return handleAnimationList(request);
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;
  return handleAnimationCreate(request);
}
