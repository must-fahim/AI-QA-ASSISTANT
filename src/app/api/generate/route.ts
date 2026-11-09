import { jsonData, parseWithZod, readJson, withErrorHandling } from "@/lib/api/http";
import { assertRateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { readAiSettings } from "@/lib/config";
import { modelsForHost, resolveRequestedModel } from "@/lib/models";
import { generateRequestSchema } from "@/schemas/records";
import { generateTestCases } from "@/services/ai/ai-generation.service";
import { composeRequirement } from "@/services/page-visit/compose-requirement";
import { visitPage } from "@/services/page-visit/visit-page";

export const runtime = "nodejs";
export const maxDuration = 120;

export const POST = withErrorHandling(async (request: Request) => {
  const input = parseWithZod(generateRequestSchema, await readJson(request));
  assertRateLimit(`generate:${getClientIp(request)}`);
  const observation = input.pageUrl
    ? await visitPage({
        url: input.pageUrl,
        loginEmail: input.loginEmail,
        loginPassword: input.loginPassword,
      })
    : null;
  const requirement = composeRequirement(input.requirement, observation);
  const ai = readAiSettings();
  let host: string | null = null;
  try {
    host = new URL(ai.baseUrl).host;
  } catch {
    host = null;
  }
  const model = resolveRequestedModel(input.model, modelsForHost(host, ai.model), ai.model);
  const generated = await generateTestCases(
    {
      ...input,
      requirement,
      pageUrl: undefined,
      loginEmail: undefined,
      loginPassword: undefined,
    },
    { model },
  );
  logger.info("generated test cases", {
    model: generated.model,
    count: generated.result.testCases.length,
    durationMs: generated.durationMs,
    requirementLength: requirement.length,
    visitedPage: observation ? new URL(observation.finalUrl).host : null,
  });

  return jsonData({
    result: generated.result,
    model: generated.model,
    generationDurationMs: generated.durationMs,
    persisted: false,
    observedRequirement: observation ? requirement : null,
    pageVisit: observation
      ? {
          finalUrl: observation.finalUrl,
          title: observation.title,
          controlCount: observation.controls.length,
        }
      : null,
  });
});
