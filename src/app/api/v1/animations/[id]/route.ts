export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { validateApiAccess } from "@/lib/api-access";
import {
  handleAnimationGet,
  handleAnimationUpdate,
  handleAnimationDelete,
} from "@/lib/animation-handlers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await validateApiAccess(request);
  if (authError) return authError;
  const { id } = await params;
  return handleAnimationGet(id, request, true);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await validateApiAccess(request);
  if (authError) return authError;
  const { id } = await params;
  return handleAnimationUpdate(request, id, true);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await validateApiAccess(request);
  if (authError) return authError;
  const { id } = await params;
  return handleAnimationDelete(id);
}
