import { AppError } from "@/lib/errors";
import { requireUser } from "@/lib/auth/current-user";
import { ndjsonResponse } from "@/lib/api/ndjson";
import { parseWithZod, readJson, withErrorHandling } from "@/lib/api/http";
import { logger } from "@/lib/logger";
import { assertRateLimit, getClientIp } from "@/lib/rate-limit";
import { assertPublicHttpUrl } from "@/lib/page-visit/public-url";
import { recordIdSchema } from "@/schemas/records";
import { retestRequestSchema } from "@/schemas/saved-tests";
import { getSavedTest, markSavedTestRun } from "@/repositories/saved-tests/saved-test.repository";
import { retestSavedPages } from "@/services/page-check/retest-pages";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

interface RetestContext {
  params: Promise<{ id: string }>;
}

export const POST = withErrorHandling(async (request: Request, context: RetestContext) => {
  const { id: rawId } = await context.params;
  const id = parseWithZod(recordIdSchema, rawId);
  const input = parseWithZod(retestRequestSchema, await readJson(request));
  assertRateLimit(`page-check:${getClientIp(request)}`, Date.now(), "Too many page checks. Try again shortly.");

  const user = await requireUser();
  const saved = await getSavedTest(id, user.id);
  if (!saved) throw new AppError("Saved test was not found.", 404, "NOT_FOUND");
  await assertPublicHttpUrl(saved.siteUrl);

  return ndjsonResponse(async (emit) => {
    const outcome = await retestSavedPages(
      {
        siteUrl: saved.siteUrl,
        loginEmail: input.loginEmail,
        loginPassword: input.loginPassword,
        pages: saved.pages.map((page) => ({ name: page.name, url: page.url })),
      },
      emit,
    );
    await markSavedTestRun(id, outcome.results, user.id);
    logger.info("saved page retest stored", { testId: id, checked: outcome.checked, failed: outcome.failed });
  });
});
