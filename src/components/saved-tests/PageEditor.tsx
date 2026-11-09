"use client";

import { Button, Input, Tag } from "antd";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageListError, normalizeSavedPageUrl, type SavedPageDraft } from "@/lib/saved-tests/pages";

export interface DraftPage extends SavedPageDraft {
  key: string;
}

export function PageEditor({
  siteUrl,
  pages,
  onChange,
  lockDiscovered = false,
}: {
  siteUrl: string;
  pages: DraftPage[];
  onChange: (pages: DraftPage[]) => void;
  lockDiscovered?: boolean;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const discovered = pages.filter((page) => page.source === "discovered").length;
  const manual = pages.length - discovered;

  function addPage() {
    const nextName = name.replace(/\s+/g, " ").trim();
    if (!nextName) {
      setError("Enter a page name.");
      return;
    }
    try {
      const normalized = normalizeSavedPageUrl(siteUrl, url);
      if (pages.some((page) => page.url === normalized)) {
        setError("That page URL is already in the list.");
        return;
      }
      onChange([...pages, { key: crypto.randomUUID(), name: nextName, url: normalized, source: "manual", lastStatus: null }]);
      setName("");
      setUrl("");
      setError(null);
    } catch (caught) {
      setError(caught instanceof PageListError ? caught.message : "Enter a valid page URL.");
    }
  }

  function updatePage(key: string, patch: Partial<DraftPage>) {
    onChange(pages.map((page) => (page.key === key ? { ...page, ...patch } : page)));
  }

  function commitUrl(page: DraftPage, value: string) {
    try {
      const normalized = normalizeSavedPageUrl(siteUrl, value);
      if (pages.some((item) => item.key !== page.key && item.url === normalized)) {
        setError("That page URL is already in the list.");
        return;
      }
      updatePage(page.key, { url: normalized });
      setEditingKey(null);
      setError(null);
    } catch (caught) {
      setError(caught instanceof PageListError ? caught.message : "Enter a valid page URL.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[#6b7280]">
        Discovered {discovered} · Added {manual} · Total {pages.length}
      </p>
      <div className="grid gap-2 md:grid-cols-[1fr_1.4fr_auto]">
        <Input value={name} placeholder="Page name" onChange={(event) => setName(event.target.value)} aria-label="Missing page name" />
        <Input
          value={url}
          placeholder="https://example.com/pricing or /pricing"
          onChange={(event) => setUrl(event.target.value)}
          aria-label="Missing page URL"
          onPressEnter={addPage}
        />
        <Button icon={<Plus size={16} />} onClick={addPage}>
          Add page
        </Button>
      </div>
      {error ? <p className="text-xs text-[#cf1322]">{error}</p> : null}
      <ul className="flex flex-col">
        {pages.map((page) => {
          const locked = lockDiscovered && page.source === "discovered";
          return (
            <li key={page.key} className="grid gap-2 border-t border-[#f3f4f6] py-3 md:grid-cols-[140px_1fr_auto] md:items-center">
              <div className="flex items-center gap-2">
                <Tag color={page.source === "manual" ? "purple" : "default"}>
                  {page.source === "manual" ? "Added" : "Discovered"}
                </Tag>
              </div>
              {locked ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{page.name}</p>
                  <p className="truncate text-xs text-[#6b7280]">{page.url}</p>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={page.name}
                    aria-label={`Name for ${page.url}`}
                    onChange={(event) => updatePage(page.key, { name: event.target.value })}
                  />
                  <Input
                    value={page.url}
                    aria-label={`URL for ${page.name}`}
                    onFocus={() => setEditingKey(page.key)}
                    onChange={(event) => updatePage(page.key, { url: event.target.value })}
                    onBlur={(event) => {
                      if (editingKey === page.key) commitUrl(page, event.target.value);
                    }}
                  />
                </div>
              )}
              {locked ? null : (
                <Button
                  type="text"
                  danger
                  aria-label={`Remove ${page.name}`}
                  icon={<Trash2 size={16} />}
                  onClick={() => onChange(pages.filter((item) => item.key !== page.key))}
                />
              )}
            </li>
          );
        })}
      </ul>
      {pages.length === 0 ? <p className="text-sm text-[#6b7280]">No pages yet.</p> : null}
    </div>
  );
}
