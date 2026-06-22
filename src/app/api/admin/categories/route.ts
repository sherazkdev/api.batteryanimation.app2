export const runtime = "nodejs";

import { requireAdmin } from "@/lib/api-utils";
import { handleCategoryList } from "@/lib/animation-handlers";

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;
  return handleCategoryList();
}
