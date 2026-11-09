import type { Metadata } from "next";
import { LoginView } from "@/components/auth/LoginView";
import { safeNextPath } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const query = await searchParams;
  return <LoginView error={query.error} nextPath={safeNextPath(query.next)} />;
}
