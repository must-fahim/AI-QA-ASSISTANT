import { ApiClientError } from "@/lib/api/client";
import type { CheckState } from "@/lib/page-check/rows";
import type { PageCheckEvent } from "@/services/page-check/types";

const HOST_STOPPED = "The server stopped the page check before it finished. A long run can exceed the hosting time limit.";

export async function readPageCheckStream(response: Response, onEvent: (event: PageCheckEvent) => void) {
  if (!response.body) throw new ApiClientError(response.status, "REQUEST_FAILED", "The page check returned no result.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      let event: PageCheckEvent;
      try {
        event = JSON.parse(line) as PageCheckEvent;
      } catch {
        continue;
      }
      if (event.type === "done" || event.type === "error") finished = true;
      onEvent(event);
    }
  }
  if (!finished) throw new ApiClientError(504, "PAGE_CHECK_TIMEOUT", HOST_STOPPED);
}

export async function readFailedResponse(response: Response) {
  const text = await response.text().catch(() => "");
  const payload = parseErrorBody(text);
  if (payload) {
    return new ApiClientError(response.status, "REQUEST_FAILED", payload);
  }
  if (response.status === 504 || /FUNCTION_INVOCATION_TIMEOUT|timed out/i.test(text)) {
    return new ApiClientError(response.status, "PAGE_CHECK_TIMEOUT", HOST_STOPPED);
  }
  return new ApiClientError(response.status, "REQUEST_FAILED", "The page check could not be completed.");
}

function parseErrorBody(text: string) {
  try {
    const payload = JSON.parse(text) as { error?: { message?: string } };
    return payload.error?.message || null;
  } catch {
    return null;
  }
}

export function failOpenRows(state: CheckState, message: string): CheckState {
  return {
    ...state,
    running: false,
    error: message,
    rows: state.rows.map((row) => (row.state === "loading" ? { ...row, state: "failed", detail: "Failed to load" } : row)),
  };
}
