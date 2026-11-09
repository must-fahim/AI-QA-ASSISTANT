import { AppError } from "@/lib/errors";
import { PageListError, uniquePages, type SavedPageDraft } from "@/lib/saved-tests/pages";
import { getServiceClient } from "@/lib/supabase/server";
import type { DbClient, DbError } from "@/repositories/db";
import { databaseNotConfigured, mapDbError } from "@/repositories/test-cases/test-case.repository";
import type { SavedPageRecord, SavedTestRecord, SavedTestSummary } from "@/types/saved-tests";

const TESTS = "saved_page_tests";
const PAGES = "saved_page_test_pages";

interface TestRow {
  id: string;
  name: string;
  site_url: string;
  page_count: number;
  created_at: string;
  updated_at: string;
  last_tested_at: string | null;
}

interface PageRow {
  id: string;
  test_id: string;
  name: string;
  url: string;
  source: "discovered" | "manual";
  last_status: "loaded" | "failed" | null;
  position: number;
}

export interface SavedTestInput {
  name: string;
  siteUrl: string;
  pages: SavedPageDraft[];
}

export async function createSavedTest(input: SavedTestInput, client = resolveClient()) {
  const pages = prepare(input.siteUrl, input.pages);
  const inserted = await client
    .from(TESTS)
    .insert({
      name: input.name.trim(),
      site_url: input.siteUrl,
      page_count: pages.length,
      last_tested_at: null,
    })
    .select("*")
    .single();
  if (inserted.error || !inserted.data) throw asDbError(inserted.error ?? { message: "Insert failed" });

  const test = inserted.data as TestRow;
  const stored = await insertPages(client, test.id, pages);
  if (stored.error) {
    await client.from(TESTS).delete().eq("id", test.id);
    throw asDbError(stored.error);
  }
  return mapTest(test, asRows<PageRow>(stored.data));
}

export async function listSavedTests(client = resolveClient()): Promise<SavedTestSummary[]> {
  const result = await client.from(TESTS).select("*").order("created_at", { ascending: false });
  if (result.error) throw asDbError(result.error);
  return asRows<TestRow>(result.data).map((row) => mapSummary(row));
}

export async function getSavedTest(id: string, client = resolveClient()) {
  const test = await client.from(TESTS).select("*").eq("id", id).maybeSingle();
  if (test.error) throw asDbError(test.error);
  if (!test.data) return null;
  const pages = await pagesFor(client, id);
  return mapTest(test.data as TestRow, pages);
}

export async function updateSavedTest(id: string, input: SavedTestInput, client = resolveClient()) {
  const existing = await getSavedTest(id, client);
  if (!existing) return null;
  const pages = prepare(input.siteUrl, input.pages);
  const previous = existing.pages.map((page) => ({
    name: page.name,
    url: page.url,
    source: page.source,
    lastStatus: page.lastStatus,
  }));

  const removed = await client.from(PAGES).delete().eq("test_id", id);
  if (removed.error) throw asDbError(removed.error);
  const stored = await insertPages(client, id, pages);
  if (stored.error) {
    await insertPages(client, id, previous);
    throw asDbError(stored.error);
  }

  const updated = await client
    .from(TESTS)
    .update({
      name: input.name.trim(),
      site_url: input.siteUrl,
      page_count: pages.length,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (updated.error || !updated.data) throw asDbError(updated.error ?? { message: "Update failed" });
  return mapTest(updated.data as TestRow, asRows<PageRow>(stored.data));
}

export async function deleteSavedTest(id: string, client = resolveClient()) {
  const existing = await client.from(TESTS).select("id").eq("id", id).maybeSingle();
  if (existing.error) throw asDbError(existing.error);
  if (!existing.data) return false;

  const pages = await client.from(PAGES).delete().eq("test_id", id);
  if (pages.error) throw asDbError(pages.error);
  const test = await client.from(TESTS).delete().eq("id", id);
  if (test.error) throw asDbError(test.error);
  return true;
}

export async function markSavedTestRun(
  id: string,
  results: Array<{ url: string; status: "loaded" | "failed" }>,
  client = resolveClient(),
) {
  const existing = await getSavedTest(id, client);
  if (!existing) return null;

  const updated = await client
    .from(TESTS)
    .update({ last_tested_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (updated.error || !updated.data) throw asDbError(updated.error ?? { message: "Update failed" });

  for (const result of results) {
    const page = await client
      .from(PAGES)
      .update({ last_status: result.status })
      .eq("test_id", id)
      .eq("url", result.url);
    if (page.error) throw asDbError(page.error);
  }

  return getSavedTest(id, client);
}

function prepare(siteUrl: string, pages: SavedPageDraft[]) {
  try {
    return uniquePages(siteUrl, pages);
  } catch (error) {
    if (error instanceof PageListError) throw new AppError(error.message, 400, "VALIDATION_ERROR");
    throw error;
  }
}

async function insertPages(client: DbClient, testId: string, pages: SavedPageDraft[]) {
  if (pages.length === 0) return { data: [], error: null };
  return client
    .from(PAGES)
    .insert(
      pages.map((page, position) => ({
        test_id: testId,
        name: page.name,
        url: page.url,
        source: page.source,
        last_status: page.lastStatus ?? null,
        position,
      })),
    )
    .select("*");
}

async function pagesFor(client: DbClient, testId: string) {
  const result = await client.from(PAGES).select("*").eq("test_id", testId);
  if (result.error) throw asDbError(result.error);
  return asRows<PageRow>(result.data).sort((left, right) => left.position - right.position);
}

function mapSummary(row: TestRow): SavedTestSummary {
  return {
    id: row.id,
    name: row.name,
    siteUrl: row.site_url,
    pageCount: row.page_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastTestedAt: row.last_tested_at,
  };
}

function mapTest(row: TestRow, pages: PageRow[]): SavedTestRecord {
  return {
    ...mapSummary(row),
    pages: pages.map(mapPage),
  };
}

function mapPage(row: PageRow): SavedPageRecord {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    source: row.source,
    lastStatus: row.last_status,
    position: row.position,
  };
}

function asDbError(error: DbError) {
  if (error.code === "PGRST205" || error.code === "42P01") {
    return new AppError(
      "Saved tests are not ready. Run supabase/migrations/002_saved_page_tests.sql in the Supabase SQL editor.",
      503,
      "DATABASE_NOT_READY",
    );
  }
  if (error.code === "23505") {
    return new AppError("Each page URL can only be saved once.", 409, "CONFLICT");
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
    if (error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED") {
      throw databaseNotConfigured();
    }
    throw error;
  }
}
