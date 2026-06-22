import { NextRequest, NextResponse } from "next/server";
import {
  createAdminToken,
  setAdminCookie,
  validateAdminCredentials,
} from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return apiError("Email and password are required", 400);
    }
    if (!validateAdminCredentials(email, password)) {
      return apiError("Invalid email or password", 401);
    }
    const token = await createAdminToken({ email, role: "Super Admin" });
    await setAdminCookie(token);
    return apiSuccess({ email, role: "Super Admin" });
  } catch {
    return apiError("Login failed", 500);
  }
}
