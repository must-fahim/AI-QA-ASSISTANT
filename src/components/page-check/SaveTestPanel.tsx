"use client";

import { Button, Input } from "antd";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { PageListError, pagesFromCheckRows, uniquePages } from "@/lib/saved-tests/pages";
import type { CheckRow } from "@/lib/page-check/rows";
import type { SavedTestRecord } from "@/types/saved-tests";
import { PageEditor, type DraftPage } from "@/components/saved-tests/PageEditor";

export function SaveTestPanel({
  siteUrl,
  rows,
  checkId,
  running,
  finished,
}: {
  siteUrl: string;
  rows: CheckRow[];
  checkId: number;
  running: boolean;
  finished: boolean;
}) {
  const [name, setName] = useState("");
  const [manual, setManual] = useState<DraftPage[]>([]);
  const [saving, setSaving] = useState(false);
  const discovered = pagesFromCheckRows(siteUrl, rows).map((page) => ({ ...page, key: page.url }));
  const pages = [...discovered, ...manual];

  useEffect(() => {
    setManual([]);
    setName("");
  }, [checkId]);

  if (!finished || !siteUrl) return null;

  async function save() {
    const website = name.replace(/\s+/g, " ").trim();
    if (!website) {
      toast.error("Enter a website name.");
      return;
    }
    try {
      const prepared = uniquePages(siteUrl, pages);
      setSaving(true);
      const saved = await apiFetch<SavedTestRecord>("/api/saved-tests", {
        method: "POST",
        body: JSON.stringify({ name: website, siteUrl, pages: prepared }),
      });
      toast.success(`Saved ${saved.name} with ${saved.pageCount} pages.`);
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
        Save the discovered pages and any pages you add. A later retest uses this list and does not crawl the site again.
      </p>
      <label className="mb-4 flex flex-col gap-1 text-sm">
        <span className="font-medium text-[#374151]">
          Website name <span className="text-[#cf1322]">*</span>
        </span>
        <Input
          value={name}
          placeholder="MUST Company"
          disabled={running || saving}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <h3 className="mb-2 text-sm font-medium">Add missing pages</h3>
      <PageEditor
        siteUrl={siteUrl}
        pages={pages}
        lockDiscovered
        onChange={(next) => setManual(next.filter((page) => page.source === "manual"))}
      />
      <div className="mt-4">
        <Button type="primary" icon={<Save size={16} />} loading={saving} disabled={running || pages.length === 0} onClick={() => void save()}>
          Save test
        </Button>
      </div>
    </section>
  );
}
