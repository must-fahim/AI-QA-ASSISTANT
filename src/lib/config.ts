export interface PublicStatus {
  aiConfigured: boolean;
  model: string | null;
  aiBaseHost: string | null;
  databaseConfigured: boolean;
  databaseReachable: boolean | null;
  databaseMessage: string | null;
}

export function readAiSettings() {
  const apiKey = process.env.AI_API_KEY?.trim() ?? "";
  const model = process.env.AI_MODEL?.trim() ?? "";
  const baseUrl = (process.env.AI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(
    /\/+$/,
    "",
  );
  return {
    apiKey,
    model,
    baseUrl,
    jsonMode: process.env.AI_JSON_MODE?.trim().toLowerCase() !== "false",
  };
}

export function readPublicStatus(database?: {
  reachable: boolean;
  message: string | null;
}): PublicStatus {
  const ai = readAiSettings();
  let aiBaseHost: string | null = null;
  try {
    aiBaseHost = new URL(ai.baseUrl).host;
  } catch {
    aiBaseHost = null;
  }

  const databaseConfigured = Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );

  return {
    aiConfigured: Boolean(ai.apiKey && ai.model),
    model: ai.model || null,
    aiBaseHost,
    databaseConfigured,
    databaseReachable: databaseConfigured ? (database?.reachable ?? null) : null,
    databaseMessage: databaseConfigured
      ? (database?.message ?? null)
      : "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then run the SQL migration.",
  };
}
