import { NextResponse } from "next/server";
import { googleProfileFromCode } from "@/lib/auth/google";
import {
  cookieOptions,
  OAUTH_NEXT_COOKIE,
  OAUTH_STATE_COOKIE,
  safeNextPath,
  SESSION_COOKIE,
  signSession,
} from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { upsertGoogleUser } from "@/repositories/users/user.repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const expected = readCookie(request.headers.get("cookie"), OAUTH_STATE_COOKIE);
  const nextPath = safeNextPath(readCookie(request.headers.get("cookie"), OAUTH_NEXT_COOKIE));

  if (!code || !state || !expected || state !== expected) {
    return loginRedirect(url.origin, "google");
  }

  try {
    const profile = await googleProfileFromCode(url.origin, code);
    const user = await upsertGoogleUser(profile);
    const response = NextResponse.redirect(new URL(nextPath, url.origin));
    response.cookies.set(SESSION_COOKIE, signSession(user.id), cookieOptions());
    response.cookies.set(OAUTH_STATE_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
    response.cookies.set(OAUTH_NEXT_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
    return response;
  } catch (error) {
    const codeName = error instanceof AppError ? error.code : "GOOGLE_AUTH_FAILED";
    const reason = codeName === "DATABASE_NOT_READY" || codeName === "DATABASE_NOT_CONFIGURED" ? "database" : "google";
    return loginRedirect(url.origin, reason);
  }
}

function loginRedirect(origin: string, error: string) {
  const response = NextResponse.redirect(new URL(`/login?error=${error}`, origin));
  response.cookies.set(OAUTH_STATE_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  response.cookies.set(OAUTH_NEXT_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  return response;
}

function readCookie(header: string | null, name: string) {
  if (!header) return null;
  const match = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}
