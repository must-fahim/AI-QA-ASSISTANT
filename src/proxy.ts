import { NextResponse } from "next/server";
import { readSessionFromCookieHeader, safeNextPath } from "@/lib/auth/session";

const PUBLIC_PREFIXES = ["/login", "/api/auth/", "/icon", "/apple-icon", "/opengraph-image", "/twitter-image"];

export function proxy(request: Request) {
  const url = new URL(request.url);
  const { pathname } = url;
  const userId = readSessionFromCookieHeader(request.headers.get("cookie"));
  if (pathname === "/login") {
    if (!userId) return NextResponse.next();
    return NextResponse.redirect(new URL(safeNextPath(url.searchParams.get("next")), url.origin));
  }
  if (PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (userId) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in with Google to continue." } },
      { status: 401 },
    );
  }

  const login = new URL("/login", url.origin);
  login.searchParams.set("next", `${pathname}${url.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)"],
};
