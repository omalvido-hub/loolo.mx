import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { extractTenantSlug, TENANT_HEADER } from "@/lib/tenant";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];
const API_PREFIX = "/api";

function withTenantHeader(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  const tenantSlug = extractTenantSlug(request.headers.get("host"));
  if (tenantSlug) headers.set(TENANT_HEADER, tenantSlug);
  else headers.delete(TENANT_HEADER);
  return headers;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = withTenantHeader(request);

  if (pathname.startsWith(API_PREFIX)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const session = getSessionCookie(request);

  if (!session && !PUBLIC_PATHS.includes(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session && PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
