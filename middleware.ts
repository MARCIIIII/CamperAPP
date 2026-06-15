import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHash } from "crypto";

function makeAdminToken(): string {
  const pw = process.env.ADMIN_PASSWORD || "";
  return createHash("sha256").update(pw + "camperslot-salt").digest("hex");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const cookie = request.cookies.get("camperslot_admin");
    if (!cookie || cookie.value !== makeAdminToken()) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
