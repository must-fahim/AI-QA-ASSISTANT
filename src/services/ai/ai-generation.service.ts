import { readAiSettings } from "@/lib/config";
import { AiConfigurationError, AiProviderError, AiResponseError, AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  aiGenerationResultSchema,
  extractJsonObject,
  normalizeAiPayload,
} from "@/schemas/ai-response";
import type { generateRequestSchema } from "@/schemas/records";
import type { AiGenerationResult } from "@/types/domain";
import type { z } from "zod";
import { AI_SYSTEM_PROMPT, buildUserPrompt } from "@/services/ai/prompts";

type GenerateRequest = z.infer<typeof generateRequestSchema>;

interface GenerationOptions {
  fetchImpl?: typeof fetch;
  model?: string;
}

interface ChatCompletion {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
}

export async function generateTestCases(
  input: GenerateRequest,
  options: GenerationOptions = {},
): Promise<{ result: AiGenerationResult; model: string; durationMs: number }> {
  const settings = readAiSettings();
  if (!settings.apiKey || !settings.model) {
    throw new AiConfigurationError();
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const model = options.model?.trim() || settings.model;
  const started = Date.now();
  const content = await requestCompletion({ ...settings, model }, input, fetchImpl);
  const durationMs = Date.now() - started;

  let parsed: unknown;
  try {
    parsed = extractJsonObject(content);
  } catch (error) {
    logger.error("ai response was not json", {
      message: error instanceof Error ? error.message : "parse failed",
    });
    throw new AiResponseError("The AI response was not valid JSON.");
  }

  const validated = aiGenerationResultSchema.safeParse(normalizeAiPayload(parsed));
  if (!validated.success) {
    throw new AiResponseError(
      "The AI response did not match the required test-case structure.",
      validated.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  return { result: validated.data, model, durationMs };
}

async function requestCompletion(
  settings: ReturnType<typeof readAiSettings>,
  input: GenerateRequest,
  fetchImpl: typeof fetch,
) {
  const first = await callProvider(settings, input, fetchImpl, settings.jsonMode);
  if (first.ok) return first.content;

  if (settings.jsonMode && isJsonModeFailure(first.providerMessage)) {
    logger.error("ai json mode failed, retrying without response format", {
      providerMessage: first.providerMessage.slice(0, 300),
    });
    const second = await callProvider(settings, input, fetchImpl, false);
    if (second.ok) return second.content;
    throw new AiProviderError(second.status, second.providerMessage);
  }

  throw new AiProviderError(first.status, first.providerMessage);
}

function isJsonModeFailure(message: string) {
  return /failed to generate json|response_format|json_object/i.test(message);
}

async function callProvider(
  settings: ReturnType<typeof readAiSettings>,
  input: GenerateRequest,
  fetchImpl: typeof fetch,
  jsonMode: boolean,
): Promise<
  | { ok: true; content: string }
  | { ok: false; status: number; providerMessage: string }
> {
  const body: Record<string, unknown> = {
    model: settings.model,
    temperature: 0.2,
    messages: [
      { role: "system", content: AI_SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(input) },
    ],
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }
  if (settings.baseUrl.includes("groq.com")) {
    body.reasoning_effort = "low";
  }

  let response: Response;
  try {
    response = await fetchImpl(`${settings.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    logger.error("ai provider network failure", {
      message: error instanceof Error ? error.name : "network",
    });
    throw new AppError("The AI provider could not be reached.", 502, "AI_NETWORK_ERROR");
  }

  const payload = (await response.json().catch(() => null)) as ChatCompletion | null;
  if (!response.ok) {
    const providerMessage = payload?.error?.message || response.statusText || "Provider request failed";
    logger.error("ai provider returned an error", {
      status: response.status,
      providerMessage: providerMessage.slice(0, 300),
    });
    return { ok: false, status: response.status, providerMessage };
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new AiResponseError("The AI response did not include test-case content.");
  }
  return { ok: true, content };
}
