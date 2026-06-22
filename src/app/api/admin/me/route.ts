import { getAdminSession } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-utils";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return apiError("Unauthorized", 401);
  return apiSuccess(session);
}
