import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminToken, COOKIE_NAME } from "@/lib/auth";

const publicPaths = ["/", "/admin/login"];
const publicApiPaths = ["/api/admin/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.includes(pathname) || publicApiPaths.includes(pathname)) {
    if (pathname === "/admin/login") {
      const token = request.cookies.get(COOKIE_NAME)?.value;
      if (token) {
        const session = await verifyAdminToken(token);
        if (session) {
          return NextResponse.redirect(new URL("/admin/dashboard", request.url));
        }
      }
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    const session = await verifyAdminToken(token);
    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
