import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { PageCheckEvent } from "@/services/page-check/types";

export function ndjsonResponse(run: (emit: (event: PageCheckEvent) => void) => Promise<void>) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: PageCheckEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        await run(emit);
      } catch (error) {
        const message = error instanceof AppError ? error.message : "The page check could not be completed.";
        logger.error("page check failed", {
          code: error instanceof AppError ? error.code : "PAGE_CHECK_FAILED",
          message,
          cause: error instanceof Error ? error.message.slice(0, 300) : "unknown",
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
}
