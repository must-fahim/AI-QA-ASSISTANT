import { Check, LoaderCircle, X } from "lucide-react";
import type { CheckRow } from "@/lib/page-check/rows";

export function PageResultList({
  rows,
  summary,
  empty,
}: {
  rows: CheckRow[];
  summary?: string | null;
  empty: string;
}) {
  const loading = rows.find((row) => row.state === "loading");

  return (
    <section className="rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-sm" aria-live="polite">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Pages</h2>
        {summary ? <p className="text-xs text-[#6b7280]">{summary}</p> : null}
      </div>
      {loading ? <p className="mb-3 text-sm text-[#712DC8]">Loading {loading.name}</p> : null}
      {rows.length === 0 ? (
        <p className="text-sm text-[#6b7280]">{empty}</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((row) => (
            <li key={row.url} className="flex items-center justify-between gap-3 border-t border-[#f3f4f6] py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#1c1c1c]">{row.name}</p>
                <p className="truncate text-xs text-[#6b7280]">{row.path}</p>
              </div>
              <Status state={row.state} detail={row.detail} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Status({ state, detail }: { state: CheckRow["state"]; detail: string }) {
  if (state === "loading") {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-[#712DC8]">
        <LoaderCircle size={16} className="animate-spin" aria-hidden />
        {detail}
      </span>
    );
  }
  if (state === "loaded") {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-[#15803d]">
        <Check size={16} aria-hidden />
        {detail}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm text-[#dc2626]">
      <X size={16} aria-hidden />
      {detail}
    </span>
  );
}
