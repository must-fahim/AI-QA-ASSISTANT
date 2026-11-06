import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getServiceClient } from "@/lib/supabase/server";
import type { DbClient, DbError } from "@/repositories/db";
import { mapCaseRow, type CaseRow } from "@/repositories/rows";
import type { TestCasePatch } from "@/lib/test-cases/edit";
import { applyTestCasePatch } from "@/lib/test-cases/edit";

export async function updateTestCase(id: string, patch: TestCasePatch, client = resolveClient()) {
  const existing = await client.from("test_cases").select("*").eq("id", id).maybeSingle();
  if (existing.error) throw mapDbError(existing.error);
  if (!existing.data) throw notFound("Test case");

  const current = mapCaseRow(existing.data as CaseRow);
  const next = applyTestCasePatch(current, patch);
  const result = await client
    .from("test_cases")
    .update({
      title: next.title,
      category: next.category,
      priority: next.priority,
      preconditions: next.preconditions,
      test_steps: next.testSteps,
      test_data: next.testData,
      expected_result: next.expectedResult,
      tags: next.tags,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (result.error || !result.data) throw mapDbError(result.error ?? { message: "Update failed" });
  return mapCaseRow(result.data as CaseRow);
}

export async function deleteTestCase(id: string, client = resolveClient()) {
  const existing = await client.from("test_cases").select("id").eq("id", id).maybeSingle();
  if (existing.error) throw mapDbError(existing.error);
  if (!existing.data) throw notFound("Test case");

  const result = await client.from("test_cases").delete().eq("id", id);
  if (result.error) throw mapDbError(result.error);
  return { id };
}

export function mapDbError(error: DbError) {
  logger.error("database request failed", { code: error.code, message: error.message });
  if (error.code === "PGRST116") return notFound("Record");
  if (error.code === "23503") return new AppError("Related record was not found.", 400, "FOREIGN_KEY");
  if (error.code === "23505") {
    return new AppError("A test case with this ID already exists in the suite.", 409, "CONFLICT");
  }
  if (error.code === "22P02" || error.code === "PGRST204") {
    return new AppError("Invalid identifier.", 400, "INVALID_ID");
  }
  if (error.message === "DATABASE_NOT_CONFIGURED") return databaseNotConfigured();
  return new AppError("Database request failed.", 500, "DATABASE_ERROR");
}

export function databaseNotConfigured() {
  return new AppError(
    "Database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then run the SQL migration.",
    503,
    "DATABASE_NOT_CONFIGURED",
  );
}

function notFound(label: string) {
  return new AppError(`${label} was not found.`, 404, "NOT_FOUND");
}

function resolveClient() {
  try {
    return getServiceClient();
  } catch (error) {
    if (error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED") {
      throw databaseNotConfigured();
    }
    throw error;
  }
}

export type RepositoryClient = DbClient;
