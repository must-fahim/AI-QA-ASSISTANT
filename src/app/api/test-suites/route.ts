import { AppError } from "@/lib/errors";
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
  return jsonData(await listTestSuites());
});

export const POST = withErrorHandling(async (request: Request) => {
  const input = parseWithZod(createSuiteSchema, await readJson(request));
  const suite = await createTestSuite(input);
  logger.info("saved test suite", { suiteId: suite.id, testCases: suite.testCaseCount });
  return jsonData(suite, 201);
});
