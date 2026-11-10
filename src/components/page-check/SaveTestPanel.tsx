"use client";

import { Button, Input } from "antd";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { PageListError, pagesFromCheckRows, uniquePages } from "@/lib/saved-tests/pages";
import type { CheckRow } from "@/lib/page-check/rows";
import type { SavedTestRecord } from "@/types/saved-tests";
import { PageEditor, type DraftPage } from "@/components/saved-tests/PageEditor";

export function SaveTestPanel({
  siteUrl,
  rows,
  running,
}: {
  siteUrl: string;
  rows: CheckRow[];
  running: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [manual, setManual] = useState<DraftPage[]>([]);
  const [removedUrls, setRemovedUrls] = useState<string[]>([]);
  const [renamed, setRenamed] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);
  const found = siteUrl ? pagesFromCheckRows(siteUrl, rows) : [];
  const discovered = found
    .filter((page) => !removedUrls.includes(page.url))
    .map((page) => ({ ...page, key: page.url, name: renamed[page.url] ?? page.name }));
  const pages = [...discovered, ...manual];

  function applyList(next: DraftPage[]) {
    setManual(next.filter((page) => page.source === "manual"));
    const kept = new Set(next.filter((page) => page.source === "discovered").map((page) => page.url));
    setRemovedUrls((current) => {
      const removed = new Set(current);
      for (const page of found) {
        if (kept.has(page.url)) removed.delete(page.url);
        else removed.add(page.url);
      }
      return [...removed];
    });
    setRenamed((current) => {
      const names = { ...current };
      for (const page of next) {
        if (page.source !== "discovered") continue;
        const original = found.find((item) => item.url === page.url);
        if (!original) continue;
        if (page.name === original.name) delete names[page.url];
        else names[page.url] = page.name;
      }
      return names;
    });
  }

  async function save() {
    const website = name.replace(/\s+/g, " ").trim();
    if (!website) {
      setNameError(true);
      toast.error("Enter a website name.");
      return;
    }
    setNameError(false);
    try {
      const prepared = uniquePages(siteUrl, pages);
      setSaving(true);
      const saved = await apiFetch<SavedTestRecord>("/api/saved-tests", {
        method: "POST",
        body: JSON.stringify({ name: website, siteUrl, pages: prepared }),
      });
      toast.success(`Saved ${saved.name} with ${saved.pageCount} pages.`);
      router.push("/saved-tests");
    } catch (error) {
      const message =
        error instanceof PageListError || error instanceof ApiClientError
          ? error.message
          : "The test could not be saved.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold">Save test</h2>
      <p className="mb-4 text-xs text-[#6b7280]">
        Add pages yourself, or check the site and save what it finds. At least one page is required. A later retest uses this list and does not crawl again.
      </p>
      <label className="mb-4 flex flex-col gap-1 text-sm">
        <span className="font-medium text-[#374151]">
          Website name <span className="text-[#cf1322]">*</span>
        </span>
        <Input
          value={name}
          placeholder="MUST Company"
          status={nameError ? "error" : ""}
          disabled={saving}
          onChange={(event) => {
            setName(event.target.value);
            if (event.target.value.trim()) setNameError(false);
          }}
        />
        {nameError ? <span className="text-xs text-[#cf1322]">Enter a website name.</span> : null}
      </label>
      <h3 className="mb-2 text-sm font-medium">Pages to save</h3>
      {running ? <p className="mb-3 text-xs text-[#6b7280]">Stop the check before adding pages or saving.</p> : null}
      {!siteUrl ? <p className="mb-3 text-xs text-[#6b7280]">Enter the site URL above before adding a page.</p> : null}
      <PageEditor
        key={running ? "crawling" : "idle"}
        siteUrl={siteUrl}
        pages={pages}
        lockDiscovered
        disabled={running || !siteUrl}
        scrollable
        onChange={applyList}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#f3f4f6] pt-4">
        <Button
          type="primary"
          icon={<Save size={16} />}
          loading={saving}
          disabled={running || saving || !siteUrl || pages.length === 0}
          onClick={() => void save()}
        >
          Save test
        </Button>
        {pages.length === 0 ? <span className="text-xs text-[#6b7280]">At least one page is required.</span> : null}
      </div>
    </section>
  );
}
