"use client";

import { Alert, Button, Input, Modal } from "antd";
import { ArrowLeft, RefreshCw, Save } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { PageResultList } from "@/components/page-check/PageResultList";
import { PageEditor, type DraftPage } from "@/components/saved-tests/PageEditor";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { applyPageCheckEvent, emptyCheckState, type CheckState } from "@/lib/page-check/rows";
import { failOpenRows, readFailedResponse, readPageCheckStream } from "@/lib/page-check/read-stream";
import { PageListError, mergeDiscoveredPages, pagesFromCheckRows, uniquePages } from "@/lib/saved-tests/pages";
import type { SavedTestRecord } from "@/types/saved-tests";

export function SavedTestEditView() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [name, setName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [pages, setPages] = useState<DraftPage[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<CheckState>(emptyCheckState());
  const [regenerateOpen, setRegenerateOpen] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch<SavedTestRecord>(`/api/saved-tests/${id}`)
      .then((saved) => {
        if (!active) return;
        setName(saved.name);
        setSiteUrl(saved.siteUrl);
        setPages(saved.pages.map((page) => ({ ...page, key: page.id })));
        setError(null);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "The saved test could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function save() {
    try {
      const prepared = uniquePages(siteUrl, pages);
      setSaving(true);
      await apiFetch<SavedTestRecord>(`/api/saved-tests/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name, siteUrl, pages: prepared }),
      });
      toast.success("Saved changes.");
      router.push(`/saved-tests/${id}`);
    } catch (caught) {
      toast.error(messageFrom(caught, "The saved test could not be updated."));
    } finally {
      setSaving(false);
    }
  }

  async function regenerate() {
    setReview({ ...emptyCheckState(), running: true });
    try {
      const response = await fetch("/api/page-check", {
        method: "POST",
        headers: { Accept: "application/x-ndjson", "Content-Type": "application/json" },
        body: JSON.stringify({
          siteUrl,
          loginEmail: email || undefined,
          loginPassword: password || undefined,
        }),
      });
      if (!response.ok || !response.body) throw await readFailedResponse(response);
      await readPageCheckStream(response, (event) => {
        setReview((state) => applyPageCheckEvent(state, event));
      });
    } catch (caught) {
      setReview((state) => failOpenRows(state, messageFrom(caught, "Pages could not be discovered again.")));
    } finally {
      setReview((state) => ({ ...state, running: false }));
    }
  }

  function applyDiscovered() {
    try {
      const discovered = pagesFromCheckRows(siteUrl, review.rows);
      const merged = mergeDiscoveredPages(siteUrl, pages, discovered);
      setPages(merged.map((page) => ({ ...page, key: crypto.randomUUID() })));
      setRegenerateOpen(false);
      toast.success("Discovered pages replaced the list. Added pages were kept. Save changes to store them.");
    } catch (caught) {
      toast.error(messageFrom(caught, "The discovered pages could not be applied."));
    }
  }

  if (loading) return <p className="text-sm text-[#6b7280]">Loading saved test…</p>;
  if (error && pages.length === 0) return <Alert type="error" showIcon title={error} />;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/saved-tests/${id}`} className="inline-flex items-center gap-1 text-sm text-[#6b7280] hover:text-[#712DC8]">
          <ArrowLeft size={16} aria-hidden />
          Back to view
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button icon={<RefreshCw size={16} />} onClick={() => setRegenerateOpen(true)}>
            Regenerate pages
          </Button>
          <Button type="primary" icon={<Save size={16} />} loading={saving} onClick={() => void save()}>
            Save changes
          </Button>
        </div>
      </div>

      <section className="rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">Website</h2>
        <div className="grid gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[#374151]">Website name</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[#374151]">Website URL</span>
            <Input value={siteUrl} onChange={(event) => setSiteUrl(event.target.value)} />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold">Pages</h2>
        <p className="mb-4 text-xs text-[#6b7280]">Change names and URLs, or add a page the check did not find.</p>
        <PageEditor siteUrl={siteUrl} pages={pages} onChange={setPages} />
      </section>

      <Modal
        title="Regenerate pages"
        open={regenerateOpen}
        width={640}
        onCancel={() => setRegenerateOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setRegenerateOpen(false)}>
            Cancel
          </Button>,
          <Button key="apply" type="primary" disabled={!review.summary || review.running} onClick={applyDiscovered}>
            Use discovered pages
          </Button>,
        ]}
        styles={{ body: { display: "flex", flexDirection: "column", gap: 20, maxHeight: "60vh", overflow: "hidden" } }}
      >
        <p className="m-0 shrink-0 text-sm leading-6 text-[#6b7280]">
          Runs the page check again. The list on this page stays as it is until you use the discovered pages and click Save changes. Pages you added are kept. The login is not stored.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input value={email} placeholder="Login email" autoComplete="off" onChange={(event) => setEmail(event.target.value)} />
          <Input.Password
            value={password}
            placeholder="Login password"
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <Button icon={<RefreshCw size={16} />} loading={review.running} onClick={() => void regenerate()}>
          Regenerate pages
        </Button>
        {review.error ? <div className="mt-3"><Alert type="error" showIcon title={review.error} /></div> : null}
        {review.rows.length > 0 || review.running ? (
          <div className="mt-4 flex min-h-0 flex-1 flex-col">
            <PageResultList rows={review.rows} summary={review.summary} empty="Discovered pages will appear here." embedded scrollable />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function messageFrom(error: unknown, fallback: string) {
  if (error instanceof PageListError || error instanceof ApiClientError || error instanceof Error) return error.message;
  return fallback;
}
