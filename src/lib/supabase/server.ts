import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DbClient } from "@/repositories/db";

let cached: SupabaseClient | null = null;

export function isDatabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export function getServiceClient(): DbClient {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  if (!cached) {
    cached = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return cached as unknown as DbClient;
}

export function resetServiceClient() {
  cached = null;
}
