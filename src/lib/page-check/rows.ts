import type { PageCheckEvent } from "@/services/page-check/types";

export interface CheckRow {
  url: string;
  name: string;
  path: string;
  state: "loading" | "loaded" | "failed";
  detail: string;
}

export interface CheckState {
  rows: CheckRow[];
  running: boolean;
  error: string | null;
  summary: string | null;
}

export function emptyCheckState(): CheckState {
  return { rows: [], running: false, error: null, summary: null };
}

export function applyPageCheckEvent(state: CheckState, event: PageCheckEvent): CheckState {
  if (event.type === "checking" && event.url && event.name && event.path) {
    const next: CheckRow = { url: event.url, name: event.name, path: event.path, state: "loading", detail: "Loading" };
    const index = state.rows.findIndex((row) => row.url === event.url);
    const rows = index === -1 ? [...state.rows, next] : state.rows.map((row, rowIndex) => (rowIndex === index ? next : row));
    return { ...state, rows };
  }

  if (event.type === "result" && event.url && event.name && event.path && event.status && event.detail) {
    return {
      ...state,
      rows: state.rows.map((row) =>
        row.url === event.url
          ? { url: event.url, name: event.name, path: event.path, state: event.status, detail: event.detail }
          : row,
      ) as CheckRow[],
    };
  }

  if (event.type === "error" && event.message) {
    return {
      ...state,
      error: event.message,
      rows: state.rows.map((row) => (row.state === "loading" ? { ...row, state: "failed", detail: "Failed to load" } : row)),
    };
  }

  if (event.type === "done") {
    const loaded = (event.checked ?? 0) - (event.failed ?? 0);
    const extra = event.truncated ? " More linked pages were left unchecked." : "";
    return { ...state, summary: `${loaded} loaded, ${event.failed ?? 0} failed.${extra}` };
  }

  return state;
}
