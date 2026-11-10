"use client";

import { App, Button, Input, Modal, Tag } from "antd";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageListError, normalizeSavedPageUrl, type SavedPageDraft } from "@/lib/saved-tests/pages";

export interface DraftPage extends SavedPageDraft {
  key: string;
}

export function PageEditor({
  siteUrl,
  pages,
  onChange,
  lockDiscovered = false,
  disabled = false,
  scrollable = false,
}: {
  siteUrl: string;
  pages: DraftPage[];
  onChange: (pages: DraftPage[]) => void;
  lockDiscovered?: boolean;
  disabled?: boolean;
  scrollable?: boolean;
}) {
  const { modal } = App.useApp();
  const listRef = useRef<HTMLUListElement>(null);
  const [draft, setDraft] = useState<{ key: string | null; name: string; url: string; lockUrl: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const discovered = pages.filter((page) => page.source === "discovered").length;
  const manual = pages.length - discovered;

  useEffect(() => {
    if (!scrollable) return;
    const list = listRef.current;
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior: "auto" });
  }, [scrollable, pages.length]);

  function openAdd() {
    setError(null);
    setDraft({ key: null, name: "", url: "", lockUrl: false });
  }

  function openEdit(page: DraftPage) {
    setError(null);
    setDraft({ key: page.key, name: page.name, url: page.url, lockUrl: lockDiscovered && page.source === "discovered" });
  }

  function removePage(page: DraftPage) {
    modal.confirm({
      title: `Delete ${page.name}?`,
      content: "This removes the page from the list.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => onChange(pages.filter((item) => item.key !== page.key)),
    });
  }

  function saveDraft() {
    if (!draft) return;
    const nextName = draft.name.replace(/\s+/g, " ").trim();
    if (!nextName) {
      setError("Enter a page name.");
      return;
    }
    const existing = draft.key ? pages.find((page) => page.key === draft.key) : undefined;
    try {
      const normalized = draft.lockUrl && existing ? existing.url : normalizeSavedPageUrl(siteUrl, draft.url);
      if (pages.some((page) => page.key !== draft.key && page.url === normalized)) {
        setError("That page URL is already in the list.");
        return;
      }
      if (existing) {
        onChange(pages.map((page) => (page.key === existing.key ? { ...page, name: nextName, url: normalized } : page)));
      } else {
        onChange([...pages, { key: crypto.randomUUID(), name: nextName, url: normalized, source: "manual", lastStatus: null }]);
      }
      setDraft(null);
      setError(null);
    } catch (caught) {
      setError(caught instanceof PageListError ? caught.message : "Enter a valid page URL.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[#6b7280]">
          Discovered {discovered} · Added {manual} · Total {pages.length}
        </p>
        <Button icon={<Plus size={16} />} onClick={openAdd} disabled={disabled || !siteUrl}>
          Add page
        </Button>
      </div>
      <ul ref={listRef} className={scrollable ? "custom-scrollbar-with-spacing flex max-h-80 flex-col overflow-y-auto" : "flex flex-col"}>
        {pages.map((page) => (
          <li key={page.key} className="flex items-center justify-between gap-3 border-t border-[#f3f4f6] py-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium text-[#1c1c1c]">{page.name}</p>
                <Tag color={page.source === "manual" ? "purple" : "default"}>
                  {page.source === "manual" ? "Added" : "Discovered"}
                </Tag>
              </div>
              <p className="truncate text-xs text-[#6b7280]">{pagePath(page.url)}</p>
            </div>
            <div className="flex shrink-0">
              <Button type="text" aria-label={`Edit ${page.name}`} icon={<Pencil size={16} />} disabled={disabled} onClick={() => openEdit(page)} />
              <Button
                type="text"
                danger
                aria-label={`Delete ${page.name}`}
                icon={<Trash2 size={16} />}
                disabled={disabled}
                onClick={() => removePage(page)}
              />
            </div>
          </li>
        ))}
      </ul>
      {pages.length === 0 ? <p className="text-sm text-[#6b7280]">No pages yet.</p> : null}
      <Modal
        title={draft?.key ? "Edit page" : "Add page"}
        open={Boolean(draft)}
        okText={draft?.key ? "Save page" : "Add page"}
        onOk={saveDraft}
        onCancel={() => setDraft(null)}
        destroyOnHidden
      >
        <p className="mb-3 text-sm text-[#6b7280]">Use a full URL or a path on this website, such as /pricing.</p>
        <div className="flex flex-col gap-3">
          <Input
            value={draft?.name ?? ""}
            placeholder="Page name"
            aria-label="Page name"
            onChange={(event) => setDraft((current) => (current ? { ...current, name: event.target.value } : current))}
            onPressEnter={saveDraft}
          />
          <Input
            value={draft?.url ?? ""}
            placeholder="https://example.com/pricing or /pricing"
            aria-label="Page URL"
            disabled={Boolean(draft?.lockUrl)}
            onChange={(event) => setDraft((current) => (current ? { ...current, url: event.target.value } : current))}
            onPressEnter={saveDraft}
          />
          {error ? <p className="text-xs text-[#cf1322]">{error}</p> : null}
        </div>
      </Modal>
    </div>
  );
}

function pagePath(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}` || "/";
  } catch {
    return url;
  }
}
