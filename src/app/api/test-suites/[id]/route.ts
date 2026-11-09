import { AppError } from "@/lib/errors";
import { requireUser } from "@/lib/auth/current-user";
import { jsonData, parseWithZod, readJson, withErrorHandling } from "@/lib/api/http";
import { logger } from "@/lib/logger";
import { recordIdSchema, updateSuiteSchema } from "@/schemas/records";
import {
  deleteTestSuite,
  getTestSuite,
  updateTestSuite,
} from "@/repositories/test-suites/test-suite.repository";

interface SuiteContext {
  params: Promise<{ id: string }>;
}

async function readId(context: SuiteContext) {
  const { id } = await context.params;
  return parseWithZod(recordIdSchema, id);
}

export const GET = withErrorHandling(async (request: Request, context: SuiteContext) => {
  const pathname = new URL(request.url).pathname;
  if (!pathname) throw new AppError("Request URL is missing.", 400, "INVALID_REQUEST");
  const user = await requireUser();
  const suite = await getTestSuite(await readId(context), user.id);
  if (!suite) throw new AppError("Test suite was not found.", 404, "NOT_FOUND");
  return jsonData(suite);
});

export const PUT = withErrorHandling(async (request: Request, context: SuiteContext) => {
  const user = await requireUser();
  const id = await readId(context);
  const patch = parseWithZod(updateSuiteSchema, await readJson(request));
  const suite = await updateTestSuite(id, patch, user.id);
  if (!suite) throw new AppError("Test suite was not found.", 404, "NOT_FOUND");
  return jsonData(suite);
});

export const DELETE = withErrorHandling(async (_request: Request, context: SuiteContext) => {
  const user = await requireUser();
  const deleted = await deleteTestSuite(await readId(context), user.id);
  if (!deleted) throw new AppError("Test suite was not found.", 404, "NOT_FOUND");
  logger.info("deleted test suite");
  return jsonData({ deleted: true });
});
