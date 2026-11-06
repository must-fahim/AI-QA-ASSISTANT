import type { ApiErrorBody } from "@/types/domain";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | { data: T }
    | ApiErrorBody
    | null;

  if (!response.ok) {
    const error = payload && "error" in payload ? payload.error : null;
    throw new ApiClientError(
      response.status,
      error?.code ?? "REQUEST_FAILED",
      error?.message ?? "The request could not be completed.",
      error?.details,
    );
  }

  if (!payload || !("data" in payload)) {
    throw new ApiClientError(response.status, "INVALID_RESPONSE", "The server returned an unexpected response.");
  }

  return payload.data;
}
