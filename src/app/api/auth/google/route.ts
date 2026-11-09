import { NextResponse } from "next/server";
import { googleAuthUrl, isGoogleConfigured } from "@/lib/auth/google";
import { cookieOptions, OAUTH_NEXT_COOKIE, OAUTH_STATE_COOKIE, randomToken, safeNextPath } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=not_configured", url.origin));
  }

  const state = randomToken();
  const response = NextResponse.redirect(googleAuthUrl(url.origin, state));
  response.cookies.set(OAUTH_STATE_COOKIE, state, cookieOptions(60 * 10));
  response.cookies.set(OAUTH_NEXT_COOKIE, safeNextPath(url.searchParams.get("next")), cookieOptions(60 * 10));
  return response;
}
