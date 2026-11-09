import { cookies } from "next/headers";
import { AppError } from "@/lib/errors";
import { SESSION_COOKIE, readSessionToken } from "@/lib/auth/session";
import { getUserById, type AppUser } from "@/repositories/users/user.repository";

export async function requireUser(): Promise<AppUser> {
  const jar = await cookies();
  const userId = readSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!userId) throw unauthenticated();
  const user = await getUserById(userId);
  if (!user) throw unauthenticated();
  return user;
}

function unauthenticated() {
  return new AppError("Sign in with Google to continue.", 401, "UNAUTHENTICATED");
}
