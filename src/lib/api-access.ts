import { NextRequest, NextResponse } from "next/server";
import {
  validateApiKey,
  ensureAppSettings,
  incrementApiRequests,
  getRateLimitInfo,
} from "@/lib/api-key";
import { getAdminSession } from "@/lib/auth";

function rateLimitHeaders(info: Awaited<ReturnType<typeof getRateLimitInfo>>) {
  return {
    "X-RateLimit-Limit": String(info.limit),
    "X-RateLimit-Remaining": String(info.remaining),
    "X-RateLimit-Reset-Minutes": String(info.resetMinutes),
  };
}

export async function validateApiAccess(
  request: NextRequest,
  trackRequest = true
): Promise<NextResponse | null> {
  await ensureAppSettings();

  const session = await getAdminSession();
  if (session) return null;

  const apiKey = request.headers.get("x-api-key");
  const isValid = await validateApiKey(apiKey);

  if (!isValid) {
    return NextResponse.json(
      { success: false, message: "Invalid or missing API key", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const rateInfo = await getRateLimitInfo();

  if (trackRequest) {
    const withinLimit = rateInfo.used < rateInfo.limit;
    if (!withinLimit) {
      return NextResponse.json(
        { success: false, message: "Rate limit exceeded", code: "RATE_LIMIT" },
        { status: 429, headers: rateLimitHeaders(rateInfo) }
      );
    }
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
    await incrementApiRequests(request.nextUrl.pathname, request.method, ip || undefined);
  }

  return null;
}

export async function withRateLimitHeaders(response: NextResponse): Promise<NextResponse> {
  try {
    const info = await getRateLimitInfo();
    for (const [key, value] of Object.entries(rateLimitHeaders(info))) {
      response.headers.set(key, value);
    }
  } catch {
    // ignore rate limit header failures
  }
  return response;
}
