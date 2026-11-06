import { jsonData, parseWithZod, readJson, withErrorHandling } from "@/lib/api/http";
import { recordIdSchema, updateTestCaseSchema } from "@/schemas/records";
import {
  deleteTestCase,
  updateTestCase,
} from "@/repositories/test-cases/test-case.repository";

interface CaseContext {
  params: Promise<{ id: string }>;
}

export const PATCH = withErrorHandling(async (request: Request, context: CaseContext) => {
  const { id } = await context.params;
  const recordId = parseWithZod(recordIdSchema, id);
  const patch = parseWithZod(updateTestCaseSchema, await readJson(request));
  return jsonData(await updateTestCase(recordId, patch));
});

export const DELETE = withErrorHandling(async (_request: Request, context: CaseContext) => {
  const { id } = await context.params;
  const recordId = parseWithZod(recordIdSchema, id);
  await deleteTestCase(recordId);
  return jsonData({ deleted: true });
});
