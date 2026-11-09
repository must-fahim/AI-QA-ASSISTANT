export interface AiModelOption {
  id: string;
  label: string;
}

const GROQ_FREE_MODELS: AiModelOption[] = [
  { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B" },
  { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B" },
  { id: "qwen/qwen3.8-27b", label: "Qwen 3.8 27B" },
];

export const MODEL_STORAGE_KEY = "ai-qa-assistant.model";

export function modelsForHost(host: string | null, configuredModel: string | null): AiModelOption[] {
  const options = host === "api.groq.com" ? [...GROQ_FREE_MODELS] : [];
  if (configuredModel && !options.some((option) => option.id === configuredModel)) {
    options.unshift({ id: configuredModel, label: configuredModel });
  }
  return options;
}

export function resolveRequestedModel(
  requested: string | undefined,
  allowed: AiModelOption[],
  fallback: string,
) {
  const trimmed = requested?.trim() ?? "";
  if (trimmed && allowed.some((option) => option.id === trimmed)) return trimmed;
  return fallback;
}
