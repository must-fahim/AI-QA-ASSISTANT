import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "qa_session";
export const OAUTH_STATE_COOKIE = "qa_oauth_state";
export const OAUTH_NEXT_COOKIE = "qa_oauth_next";

const SESSION_SECONDS = 60 * 60 * 24 * 30;

interface SessionPayload {
  userId: string;
  exp: number;
}

export function sessionSecret() {
  const secret = process.env.AUTH_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) throw new Error("AUTH_SECRET_MISSING");
  return secret;
}

export function signSession(userId: string, now = Date.now()) {
  const payload: SessionPayload = { userId, exp: now + SESSION_SECONDS * 1000 };
  const body = encode(payload);
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token: string | undefined | null, now = Date.now()) {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature || !safeEqual(sign(body), signature)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.userId || typeof payload.exp !== "number" || payload.exp <= now) return null;
    return payload.userId;
  } catch {
    return null;
  }
}

export function readSessionFromCookieHeader(header: string | null, now = Date.now()) {
  return readSessionToken(cookieValue(header, SESSION_COOKIE), now);
}

export function randomToken() {
  return randomBytes(24).toString("base64url");
}

export function cookieOptions(maxAge = SESSION_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function safeNextPath(value: string | undefined | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/login")) return "/dashboard";
  return value;
}

function sign(body: string) {
  return createHmac("sha256", sessionSecret()).update(body).digest("base64url");
}

function encode(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function cookieValue(header: string | null, name: string) {
  if (!header) return null;
  const parts = header.split(";").map((part) => part.trim());
  const match = parts.find((part) => part.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}
