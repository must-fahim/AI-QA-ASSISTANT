import { AppError } from "@/lib/errors";
import { jsonData, parseWithZod, readJson, withErrorHandling } from "@/lib/api/http";
import { logger } from "@/lib/logger";
import { assertPublicHttpUrl } from "@/lib/page-visit/public-url";
import { PageListError } from "@/lib/saved-tests/pages";
import { saveTestSchema } from "@/schemas/saved-tests";
import { createSavedTest, listSavedTests } from "@/repositories/saved-tests/saved-test.repository";

export const GET = withErrorHandling(async () => {
  return jsonData({ tests: await listSavedTests() });
});

export const POST = withErrorHandling(async (request: Request) => {
  const input = parseWithZod(saveTestSchema, await readJson(request));
  const site = await assertPublicHttpUrl(input.siteUrl);
  site.hash = "";
  try {
    const saved = await createSavedTest({
      name: input.name,
      siteUrl: site.toString(),
      pages: input.pages,
    });
    logger.info("saved page test", { testId: saved.id, pages: saved.pageCount });
    return jsonData(saved, 201);
  } catch (error) {
    if (error instanceof PageListError) throw new AppError(error.message, 400, "VALIDATION_ERROR");
    throw error;
  }
});
