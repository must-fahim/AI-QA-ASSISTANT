import type { PageLoadState } from "@/services/page-check/classify-page";

export interface PageCheckResume {
  seen?: string[];
  queue?: Array<{ url: string; name: string }>;
  similar?: Array<{ shape: string; count: number }>;
  menuDiscovered?: boolean;
  checked: number;
  failed: number;
  doneUrls?: string[];
}

export interface PageCheckEvent {
  type: "checking" | "result" | "done" | "error" | "continue";
  url?: string;
  name?: string;
  path?: string;
  status?: PageLoadState;
  detail?: string;
  message?: string;
  checked?: number;
  failed?: number;
  truncated?: boolean;
  resume?: PageCheckResume;
}
