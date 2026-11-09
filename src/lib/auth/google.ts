import { AppError } from "@/lib/errors";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export function googleRedirectUri(origin: string) {
  return `${origin}/api/auth/callback`;
}

export function googleAuthUrl(origin: string, state: string) {
  const clientId = googleClientId();
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", googleRedirectUri(origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function googleProfileFromCode(origin: string, code: string): Promise<GoogleProfile> {
  const clientId = googleClientId();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientSecret) throw notConfigured();

  const tokenResponse = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleRedirectUri(origin),
      grant_type: "authorization_code",
    }),
  });
  const token = (await tokenResponse.json().catch(() => null)) as { access_token?: string } | null;
  if (!tokenResponse.ok || !token?.access_token) {
    throw new AppError("Google did not complete sign-in.", 502, "GOOGLE_AUTH_FAILED");
  }

  const profileResponse = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const profile = (await profileResponse.json().catch(() => null)) as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
  } | null;
  if (!profileResponse.ok || !profile?.sub || !profile.email) {
    throw new AppError("Google did not return an email for this account.", 502, "GOOGLE_AUTH_FAILED");
  }

  return {
    sub: profile.sub,
    email: profile.email,
    name: profile.name?.trim() || profile.email,
    avatarUrl: profile.picture?.trim() || null,
  };
}

export function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

function googleClientId() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET?.trim()) throw notConfigured();
  return clientId;
}

function notConfigured() {
  return new AppError(
    "Google login is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
    503,
    "AUTH_NOT_CONFIGURED",
  );
}
