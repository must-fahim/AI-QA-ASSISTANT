import { ndjsonResponse } from "@/lib/api/ndjson";
import { parseWithZod, readJson, withErrorHandling } from "@/lib/api/http";
import { assertRateLimit, getClientIp } from "@/lib/rate-limit";
import { assertPublicHttpUrl } from "@/lib/page-visit/public-url";
import { pageCheckRequestSchema } from "@/schemas/page-check";
import { crawlSite } from "@/services/page-check/crawl-site";

export const runtime = "nodejs";
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

  return ndjsonResponse((emit) => crawlSite(input, emit));
});
