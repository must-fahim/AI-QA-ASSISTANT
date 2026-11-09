import { parseWithZod, readJson, withErrorHandling } from "@/lib/api/http";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { assertRateLimit, getClientIp } from "@/lib/rate-limit";
import { assertPublicHttpUrl } from "@/lib/page-visit/public-url";
import { pageCheckRequestSchema } from "@/schemas/page-check";
import { crawlSite } from "@/services/page-check/crawl-site";
import type { PageCheckEvent } from "@/services/page-check/types";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (request: Request) => {
  const input = parseWithZod(pageCheckRequestSchema, await readJson(request));
  assertRateLimit(
    `page-check:${getClientIp(request)}`,
    Date.now(),
    "Too many page checks. Try again shortly.",
  );
  await assertPublicHttpUrl(input.siteUrl);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: PageCheckEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        await crawlSite(input, emit);
      } catch (error) {
        const message =
          error instanceof AppError ? error.message : "The page check could not be completed.";
        logger.error("page check failed", {
          code: error instanceof AppError ? error.code : "PAGE_CHECK_FAILED",
          message,
        });
        emit({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
});
