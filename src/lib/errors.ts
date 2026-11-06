export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class AiConfigurationError extends AppError {
  constructor() {
    super(
      "AI generation is not configured. Set AI_API_KEY and AI_MODEL in the server environment.",
      503,
      "AI_NOT_CONFIGURED",
    );
  }
}

export class AiResponseError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 502, "AI_INVALID_RESPONSE", details);
  }
}

export class AiProviderError extends AppError {
  constructor(status: number, providerMessage: string) {
    const limited = status === 429;
    super(
      limited
        ? "The AI provider rate limit was reached. Wait a moment and try again."
        : "The AI provider could not generate test cases.",
      limited ? 429 : 502,
      limited ? "AI_RATE_LIMITED" : "AI_PROVIDER_ERROR",
      { providerStatus: status, providerMessage: providerMessage.slice(0, 300) },
    );
  }
}
