import { NextRequest } from "next/server";
import { validateApiAccess } from "@/lib/api-access";

export async function validateApiKeyMiddleware(
  request: NextRequest
): Promise<ReturnType<typeof validateApiAccess>> {
  return validateApiAccess(request, true);
}
