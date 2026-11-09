import { AppError } from "@/lib/errors";
import { getServiceClient } from "@/lib/supabase/server";
import type { DbClient, DbError } from "@/repositories/db";
import { databaseNotConfigured, mapDbError } from "@/repositories/test-cases/test-case.repository";
import type { GoogleProfile } from "@/lib/auth/google";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

interface UserRow {
  id: string;
  google_sub: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

export async function upsertGoogleUser(profile: GoogleProfile, client = resolveClient()) {
  const existing = await client.from("users").select("*").eq("google_sub", profile.sub).maybeSingle();
  if (existing.error) throw asUserError(existing.error);
  if (existing.data) {
    const updated = await client
      .from("users")
      .update({
        email: profile.email,
        name: profile.name,
        avatar_url: profile.avatarUrl,
      })
      .eq("id", (existing.data as UserRow).id)
      .select("*")
      .single();
    if (updated.error || !updated.data) throw asUserError(updated.error ?? { message: "Update failed" });
    return mapUser(updated.data as UserRow);
  }

  const count = await client.from("users").select("id");
  if (count.error) throw asUserError(count.error);
  const firstAccount = asRows<UserRow>(count.data).length === 0;

  const inserted = await client
    .from("users")
    .insert({
      google_sub: profile.sub,
      email: profile.email,
      name: profile.name,
      avatar_url: profile.avatarUrl,
    })
    .select("*")
    .single();
  if (inserted.error || !inserted.data) throw asUserError(inserted.error ?? { message: "Insert failed" });
  const user = mapUser(inserted.data as UserRow);
  if (firstAccount) await claimUnownedRecords(client, user.id);
  return user;
}

export async function getUserById(id: string, client = resolveClient()) {
  const result = await client.from("users").select("*").eq("id", id).maybeSingle();
  if (result.error) throw asUserError(result.error);
  if (!result.data) return null;
  return mapUser(result.data as UserRow);
}

async function claimUnownedRecords(client: DbClient, userId: string) {
  for (const table of ["test_suites", "saved_page_tests"]) {
    const rows = await client.from(table).select("id, user_id");
    if (rows.error) throw asUserError(rows.error);
    for (const row of asRows<{ id: string; user_id: string | null }>(rows.data)) {
      if (row.user_id) continue;
      const updated = await client.from(table).update({ user_id: userId }).eq("id", row.id);
      if (updated.error) throw asUserError(updated.error);
    }
  }
}

function mapUser(row: UserRow): AppUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
  };
}

function asUserError(error: DbError) {
  if (error.code === "PGRST205" || error.code === "42P01" || error.code === "42703") {
    return new AppError(
      "Accounts are not ready. Run supabase/migrations/003_users.sql in the Supabase SQL editor.",
      503,
      "DATABASE_NOT_READY",
    );
  }
  return mapDbError(error);
}

function asRows<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

function resolveClient() {
  try {
    return getServiceClient();
  } catch (error) {
    if (error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED") throw databaseNotConfigured();
    throw error;
  }
}
