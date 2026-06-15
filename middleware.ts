import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

async function makeAdminToken(): Promise<string> {
  const pw = process.env.ADMIN_PASSWORD || "";
  const data = new TextEncoder().encode(pw + "camperslot-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const cookie = request.cookies.get("camperslot_admin");
    const expected = await makeAdminToken();
    if (!cookie || cookie.value !== expected) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
