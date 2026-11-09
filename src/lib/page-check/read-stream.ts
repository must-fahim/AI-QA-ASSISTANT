import { ApiClientError } from "@/lib/api/client";
import { applyPageCheckEvent, type CheckState } from "@/lib/page-check/rows";
import type { PageCheckEvent } from "@/services/page-check/types";

export async function readPageCheckStream(response: Response, onEvent: (event: PageCheckEvent) => void) {
  if (!response.body) throw new ApiClientError(response.status, "REQUEST_FAILED", "The page check returned no result.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      onEvent(JSON.parse(line) as PageCheckEvent);
    }
  }
}

export async function readFailedResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
  return new ApiClientError(
    response.status,
    "REQUEST_FAILED",
    payload?.error?.message ?? "The page check could not be completed.",
  );
}

export function failOpenRows(state: CheckState, message: string): CheckState {
  return {
    ...state,
    running: false,
    error: message,
    rows: state.rows.map((row) => (row.state === "loading" ? { ...row, state: "failed", detail: "Failed to load" } : row)),
  };
}
