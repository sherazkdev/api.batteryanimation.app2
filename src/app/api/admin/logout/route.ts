import { clearAdminCookie } from "@/lib/auth";
import { apiSuccess } from "@/lib/api-utils";

export async function POST() {
  await clearAdminCookie();
  return apiSuccess({ message: "Logged out successfully" });
}
