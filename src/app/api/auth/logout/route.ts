import { NextResponse } from "next/server";
import { cookieOptions, SESSION_COOKIE } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export function POST() {
  const response = NextResponse.json({ data: { signedOut: true } });
  response.cookies.set(SESSION_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  return response;
}
