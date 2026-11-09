import { AppError } from "@/lib/errors";
import { requireUser } from "@/lib/auth/current-user";
import { jsonData, parseWithZod, readJson, withErrorHandling } from "@/lib/api/http";
import { logger } from "@/lib/logger";
import { assertPublicHttpUrl } from "@/lib/page-visit/public-url";
import { PageListError } from "@/lib/saved-tests/pages";
import { saveTestSchema } from "@/schemas/saved-tests";
import { createSavedTest, listSavedTests } from "@/repositories/saved-tests/saved-test.repository";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  return jsonData({ tests: await listSavedTests(user.id) });
});

export const POST = withErrorHandling(async (request: Request) => {
  const input = parseWithZod(saveTestSchema, await readJson(request));
  const site = await assertPublicHttpUrl(input.siteUrl);
  site.hash = "";
  const user = await requireUser();
  try {
    const saved = await createSavedTest(
      {
        name: input.name,
        siteUrl: site.toString(),
        pages: input.pages,
      },
      user.id,
    );
    logger.info("saved page test", { testId: saved.id, pages: saved.pageCount });
    return jsonData(saved, 201);
  } catch (error) {
    if (error instanceof PageListError) throw new AppError(error.message, 400, "VALIDATION_ERROR");
    throw error;
  }
});
