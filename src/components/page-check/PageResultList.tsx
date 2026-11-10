"use client";

import { Check, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { CheckRow } from "@/lib/page-check/rows";

export function PageResultList({
  rows,
  summary,
  empty,
  running = false,
  embedded = false,
  scrollable = false,
}: {
  rows: CheckRow[];
  summary?: string | null;
  empty: string;
  running?: boolean;
  embedded?: boolean;
  scrollable?: boolean;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const settled = rows.filter((row) => row.state !== "loading");
  const showSkeleton = running;

  const latestUrl = settled.at(-1)?.url;
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior: "auto" });
    list.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [settled.length, showSkeleton, latestUrl]);

  return (
    <section
      className={`${embedded ? "" : "rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-sm"} ${scrollable ? "flex min-h-0 flex-1 flex-col" : ""}`}
      aria-live="polite"
    >
      <div className={`mb-3 flex items-center justify-between gap-3 ${scrollable ? "shrink-0" : ""}`}>
        <h2 className="text-sm font-semibold">Pages</h2>
        <ResultHeading rows={rows} running={running} summary={summary} />
      </div>
      {settled.length === 0 && !showSkeleton ? (
        <p className="text-sm text-[#6b7280]">{empty}</p>
      ) : (
        <ul
          ref={listRef}
          className={scrollable ? "custom-scrollbar-with-spacing flex max-h-[45vh] min-h-0 flex-1 flex-col overflow-y-auto" : "flex max-h-[45vh] flex-col overflow-y-auto"}
        >
          {settled.map((row) => (
            <li key={row.url} className="flex items-center justify-between gap-3 border-t border-[#f3f4f6] py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#1c1c1c]">{row.name}</p>
                <p className="truncate text-xs text-[#6b7280]">{row.path}</p>
              </div>
              <Status state={row.state} detail={row.detail} />
            </li>
          ))}
          {showSkeleton ? <SkeletonRow /> : null}
        </ul>
      )}
    </section>
  );
}

function ResultHeading({ rows, running, summary }: { rows: CheckRow[]; running: boolean; summary?: string | null }) {
  const loaded = rows.filter((row) => row.state === "loaded").length;
  const failed = rows.filter((row) => row.state === "failed").length;
  const finished = !running && Boolean(summary && /^\d+ loaded, \d+ failed/.test(summary));

  if (running) {
    return (
      <p className="text-sm text-[#6b7280]">
        {loaded} loaded, {failed} failed
      </p>
    );
  }

  if (finished && failed > 0) {
    return <p className="text-sm font-medium text-[#dc2626]">{failed === 1 ? "1 page failed to load" : `${failed} pages failed to load`}</p>;
  }

  if (finished && loaded > 0) {
    return (
      <p className="text-sm font-medium text-[#15803d]">
        {loaded === 1 ? "1 page loaded successfully" : `${loaded} pages loaded successfully`}
      </p>
    );
  }

  if (summary) return <p className="text-sm text-[#6b7280]">{summary}</p>;
  return null;
}

function SkeletonRow() {
  return (
    <li className="flex items-center justify-between gap-3 border-t border-[#f3f4f6] py-3" aria-hidden>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="h-3.5 w-40 max-w-full animate-pulse rounded bg-[#f3f4f6]" />
        <span className="h-2.5 w-24 animate-pulse rounded bg-[#f3f4f6]" />
      </div>
      <span className="h-3.5 w-16 animate-pulse rounded bg-[#f3f4f6]" />
    </li>
  );
}

function Status({ state, detail }: { state: CheckRow["state"]; detail: string }) {
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
