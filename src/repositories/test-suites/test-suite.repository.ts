import type { z } from "zod";
import { getServiceClient } from "@/lib/supabase/server";
import type { DbClient } from "@/repositories/db";
import {
  databaseNotConfigured,
  mapDbError,
} from "@/repositories/test-cases/test-case.repository";
import {
  mapCaseRow,
  mapSuiteRow,
  toCaseInsert,
  type CaseRow,
  type SuiteRow,
} from "@/repositories/rows";
import type { createSuiteSchema, updateSuiteSchema } from "@/schemas/records";
import type { SuiteStats, TestSuiteRecord } from "@/types/domain";

type CreateSuiteInput = z.infer<typeof createSuiteSchema>;
type UpdateSuiteInput = z.infer<typeof updateSuiteSchema>;

export async function createTestSuite(input: CreateSuiteInput, client = resolveClient()) {
  const inserted = await client
    .from("test_suites")
    .insert({
      title: input.title,
      requirement: input.requirement,
      jira_ticket_id: input.jiraTicketId?.trim() ? input.jiraTicketId.trim() : null,
      configuration: input.configuration,
      requirement_summary: input.requirementSummary,
      assumptions: input.assumptions,
      clarification_questions: input.clarificationQuestions,
    })
    .select("*")
    .single();

  if (inserted.error || !inserted.data) {
    throw mapDbError(inserted.error ?? { message: "Insert failed" });
  }

  const suite = inserted.data as SuiteRow;
  const cases = await client
    .from("test_cases")
    .insert(input.testCases.map((testCase) => toCaseInsert(suite.id, testCase)))
    .select("*");

  if (cases.error) {
    await client.from("test_suites").delete().eq("id", suite.id);
    throw mapDbError(cases.error);
  }

  const testCases = asRows<CaseRow>(cases.data).map(mapCaseRow);
  return mapSuiteRow(suite, testCases);
}

export async function listTestSuites(client = resolveClient()) {
  const suites = await client
    .from("test_suites")
    .select("*")
    .order("created_at", { ascending: false });
  if (suites.error) throw mapDbError(suites.error);

  const cases = await client.from("test_cases").select("id, suite_id, category");
  if (cases.error) throw mapDbError(cases.error);

  const counts = new Map<string, number>();
  for (const row of asRows<{ suite_id: string }>(cases.data)) {
    counts.set(row.suite_id, (counts.get(row.suite_id) ?? 0) + 1);
  }

  const records = asRows<SuiteRow>(suites.data).map((row) => {
    const record = mapSuiteRow(row, []);
    record.testCaseCount = counts.get(row.id) ?? 0;
    return record;
  });

  return { suites: records, stats: buildStats(records) };
}

export async function getTestSuite(id: string, client = resolveClient()) {
  const suite = await client.from("test_suites").select("*").eq("id", id).maybeSingle();
  if (suite.error) throw mapDbError(suite.error);
  if (!suite.data) return null;

  const cases = await client
    .from("test_cases")
    .select("*")
    .eq("suite_id", id)
    .order("test_case_id", { ascending: true });
  if (cases.error) throw mapDbError(cases.error);

  return mapSuiteRow(suite.data as SuiteRow, asRows<CaseRow>(cases.data).map(mapCaseRow));
}

export async function updateTestSuite(id: string, patch: UpdateSuiteInput, client = resolveClient()) {
  const existing = await getTestSuite(id, client);
  if (!existing) return null;

  const result = await client
    .from("test_suites")
    .update(toSuiteUpdate(patch))
    .eq("id", id)
    .select("*")
    .single();
  if (result.error || !result.data) throw mapDbError(result.error ?? { message: "Update failed" });

  return mapSuiteRow(result.data as SuiteRow, existing.testCases);
}

export async function deleteTestSuite(id: string, client = resolveClient()) {
  const existing = await client.from("test_suites").select("id").eq("id", id).maybeSingle();
  if (existing.error) throw mapDbError(existing.error);
  if (!existing.data) return false;

  const cases = await client.from("test_cases").delete().eq("suite_id", id);
  if (cases.error) throw mapDbError(cases.error);
  const suite = await client.from("test_suites").delete().eq("id", id);
  if (suite.error) throw mapDbError(suite.error);
  return true;
}

export async function pingDatabase(client = resolveClient()) {
  const result = await client.from("test_suites").select("id").limit(1);
  if (!result.error) return { reachable: true, message: null as string | null };

  if (result.error.code === "42P01" || result.error.code === "PGRST205") {
    return {
      reachable: false,
      message: "Supabase is configured, but the test_suites table is missing. Run the SQL migration.",
    };
  }

  return {
    reachable: false,
    message: "The server could not query Supabase. Check the project URL, service role key, and migration.",
  };
}

export function buildStats(suites: TestSuiteRecord[]): SuiteStats {
  const durations = suites
    .map((suite) => suite.configuration.generationDurationMs)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  const totalTestCases = suites.reduce((sum, suite) => sum + suite.testCaseCount, 0);
  return {
    totalGenerations: suites.length,
    totalTestCases,
    averageGenerationTimeMs: durations.length
      ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
      : null,
    totalSavedTestSuites: suites.length,
  };
}

function toSuiteUpdate(patch: UpdateSuiteInput) {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.requirement !== undefined) row.requirement = patch.requirement;
  if (patch.jiraTicketId !== undefined) row.jira_ticket_id = patch.jiraTicketId;
  if (patch.requirementSummary !== undefined) row.requirement_summary = patch.requirementSummary;
  if (patch.assumptions !== undefined) row.assumptions = patch.assumptions;
  if (patch.clarificationQuestions !== undefined) {
    row.clarification_questions = patch.clarificationQuestions;
  }
  return row;
}

function asRows<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
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

export type { DbClient };
