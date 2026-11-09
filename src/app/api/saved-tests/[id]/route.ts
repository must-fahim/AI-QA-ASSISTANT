import { AppError } from "@/lib/errors";
import { requireUser } from "@/lib/auth/current-user";
import { jsonData, parseWithZod, readJson, withErrorHandling } from "@/lib/api/http";
import { logger } from "@/lib/logger";
import { assertPublicHttpUrl } from "@/lib/page-visit/public-url";
import { recordIdSchema } from "@/schemas/records";
import { updateSavedTestSchema } from "@/schemas/saved-tests";
import {
  deleteSavedTest,
  getSavedTest,
  updateSavedTest,
} from "@/repositories/saved-tests/saved-test.repository";

interface SavedTestContext {
  params: Promise<{ id: string }>;
}

async function readId(context: SavedTestContext) {
  const { id } = await context.params;
  return parseWithZod(recordIdSchema, id);
}

export const GET = withErrorHandling(async (_request: Request, context: SavedTestContext) => {
  const user = await requireUser();
  const test = await getSavedTest(await readId(context), user.id);
  if (!test) throw new AppError("Saved test was not found.", 404, "NOT_FOUND");
  return jsonData(test);
});

export const PUT = withErrorHandling(async (request: Request, context: SavedTestContext) => {
  const user = await requireUser();
  const id = await readId(context);
  const input = parseWithZod(updateSavedTestSchema, await readJson(request));
  const site = await assertPublicHttpUrl(input.siteUrl);
  site.hash = "";
  const test = await updateSavedTest(
    id,
    {
      name: input.name,
      siteUrl: site.toString(),
      pages: input.pages,
    },
    user.id,
  );
  if (!test) throw new AppError("Saved test was not found.", 404, "NOT_FOUND");
  logger.info("updated saved page test", { testId: test.id, pages: test.pageCount });
  return jsonData(test);
});

export const DELETE = withErrorHandling(async (_request: Request, context: SavedTestContext) => {
  const user = await requireUser();
  const deleted = await deleteSavedTest(await readId(context), user.id);
  if (!deleted) throw new AppError("Saved test was not found.", 404, "NOT_FOUND");
  logger.info("deleted saved page test");
  return jsonData({ deleted: true });
});
