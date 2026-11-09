import { ApiClientError } from "@/lib/api/client";
import type { CheckState } from "@/lib/page-check/rows";
import type { PageCheckEvent, PageCheckResume } from "@/services/page-check/types";

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
      if (event.type === "done" || event.type === "error" || event.type === "continue") finished = true;
      onEvent(event);
    }
  }
  if (!finished) throw new ApiClientError(504, "PAGE_CHECK_TIMEOUT", HOST_STOPPED);
}

const BATCH_LIMIT = 8;

export async function readPageCheckBatches(
  requestBatch: (resume: PageCheckResume | null) => Promise<Response>,
  onEvent: (event: PageCheckEvent) => void,
) {
  let resume: PageCheckResume | null = null;
  let previousKey = "";
  let repeats = 0;
  for (let batch = 0; batch < BATCH_LIMIT; batch += 1) {
    const response = await requestBatch(resume);
    if (!response.ok || !response.body) throw await readFailedResponse(response);
    const found: { resume: PageCheckResume | null } = { resume: null };
    await readPageCheckStream(response, (event) => {
      if (event.type === "continue" && event.resume) {
        found.resume = event.resume;
        return;
      }
      onEvent(event);
    });
    const next = found.resume;
    if (!next || !hasMore(next)) return;
    const key = `${next.checked}:${next.queue?.[0]?.url ?? ""}:${next.doneUrls?.length ?? 0}`;
    repeats = key === previousKey ? repeats + 1 : 0;
    previousKey = key;
    if (repeats >= 2) break;
    resume = next;
  }
  throw new ApiClientError(504, "PAGE_CHECK_TIMEOUT", HOST_STOPPED);
}

function hasMore(resume: PageCheckResume) {
  if ((resume.queue?.length ?? 0) > 0) return true;
  return Boolean(resume.doneUrls);
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
