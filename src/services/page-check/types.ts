import type { PageLoadState } from "@/services/page-check/classify-page";

export interface PageCheckEvent {
  type: "checking" | "result" | "done" | "error";
  url?: string;
  name?: string;
  path?: string;
  status?: PageLoadState;
  detail?: string;
  message?: string;
  checked?: number;
  failed?: number;
  truncated?: boolean;
}
