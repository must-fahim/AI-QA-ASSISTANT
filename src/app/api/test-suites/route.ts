import { AppError } from "@/lib/errors";
import { requireUser } from "@/lib/auth/current-user";
import { jsonData, parseWithZod, readJson, withErrorHandling } from "@/lib/api/http";
import { logger } from "@/lib/logger";
import { createSuiteSchema } from "@/schemas/records";
import {
  createTestSuite,
  listTestSuites,
} from "@/repositories/test-suites/test-suite.repository";

export const GET = withErrorHandling(async (request: Request) => {
  const pathname = new URL(request.url).pathname;
  if (!pathname) throw new AppError("Request URL is missing.", 400, "INVALID_REQUEST");
  const user = await requireUser();
  return jsonData(await listTestSuites(user.id));
});

export const POST = withErrorHandling(async (request: Request) => {
  const user = await requireUser();
  const input = parseWithZod(createSuiteSchema, await readJson(request));
  const suite = await createTestSuite(input, user.id);
  logger.info("saved test suite", { suiteId: suite.id, testCases: suite.testCaseCount });
  return jsonData(suite, 201);
});
