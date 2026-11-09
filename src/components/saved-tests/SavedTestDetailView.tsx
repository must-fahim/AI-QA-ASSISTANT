"use client";

import { Alert, App, Button, Input, Modal, Tag } from "antd";
import { ArrowLeft, Check, Pencil, Play, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { PageResultList } from "@/components/page-check/PageResultList";
import { apiFetch } from "@/lib/api/client";
import { formatTimestamp } from "@/lib/format";
import { runSavedRetest, takeQueuedRetest, useRetestState } from "@/lib/saved-tests/retest-store";
import type { SavedPageRecord, SavedTestRecord } from "@/types/saved-tests";

export function SavedTestDetailView() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { modal } = App.useApp();
  const retest = useRetestState(id);
  const [test, setTest] = useState<SavedTestRecord | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch<SavedTestRecord>(`/api/saved-tests/${id}`)
      .then((saved) => {
        if (!active) return;
        setTest(saved);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "The saved test could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const queued = takeQueuedRetest(id);
    if (queued) void runSavedRetest(id, queued);
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!retest.summary) return;
    let active = true;
    apiFetch<SavedTestRecord>(`/api/saved-tests/${id}`)
      .then((saved) => {
        if (active) setTest(saved);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [id, retest.summary]);

  function remove() {
    if (!test) return;
    modal.confirm({
      title: `Delete ${test.name}?`,
      content: "This deletes the saved test and every page saved with it.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await apiFetch(`/api/saved-tests/${id}`, { method: "DELETE" });
          toast.success("Saved test deleted.");
          router.push("/saved-tests");
        } catch (caught) {
          toast.error(caught instanceof Error ? caught.message : "The saved test could not be deleted.");
          throw caught;
        }
      },
    });
  }

  if (loading) return <p className="text-sm text-[#6b7280]">Loading saved test…</p>;
  if (!test) return <Alert type="error" showIcon title={error ?? "Saved test was not found."} />;

  const discovered = test.pages.filter((page) => page.source === "discovered").length;
  const added = test.pages.length - discovered;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/saved-tests" className="inline-flex items-center gap-1 text-sm text-[#6b7280] hover:text-[#712DC8]">
          <ArrowLeft size={16} aria-hidden />
          Saved tests
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link href={`/saved-tests/${id}/edit`}>
            <Button icon={<Pencil size={16} />}>Edit</Button>
          </Link>
          <Button danger icon={<Trash2 size={16} />} onClick={remove}>
            Delete
          </Button>
        </div>
      </div>

      <section className="rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1c1c1c]">{test.name}</h2>
        <a href={test.siteUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate text-sm text-[#712DC8]">
          {test.siteUrl}
        </a>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Pages" value={String(test.pageCount)} />
          <Stat label="Discovered" value={String(discovered)} />
          <Stat label="Added" value={String(added)} />
          <Stat label="Last tested" value={test.lastTestedAt ? formatTimestamp(test.lastTestedAt) : "Not yet"} />
        </div>
        <p className="mt-3 text-xs text-[#6b7280]">Created {formatTimestamp(test.createdAt)}</p>
      </section>

      <section className="rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold">Saved pages</h2>
        <p className="mb-3 text-xs text-[#6b7280]">These URLs are tested as they are. Discovery does not run again.</p>
        <ul className="flex flex-col">
          {test.pages.map((page, index) => (
            <PageRow key={page.id} page={page} index={index + 1} />
          ))}
        </ul>
      </section>

      <section id="retest" className="rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Retest</h2>
            <p className="text-xs text-[#6b7280]">Checks all {test.pageCount} saved pages. A login is optional and is not stored.</p>
          </div>
          <Button type="primary" icon={<Play size={16} />} loading={retest.running} onClick={() => setLoginOpen(true)}>
            Retest
          </Button>
        </div>
      </section>

      {retest.error ? <Alert type="error" showIcon title={retest.error} /> : null}
      {retest.rows.length > 0 || retest.running ? (
        <PageResultList rows={retest.rows} summary={retest.summary} empty="Saved pages will appear here while they load." />
      ) : null}

      <Modal
        title={`Retest ${test.name}`}
        open={loginOpen}
        okText="Start retest"
        confirmLoading={retest.running}
        onOk={() => {
          setLoginOpen(false);
          void runSavedRetest(id, { loginEmail: email, loginPassword: password });
          setPassword("");
        }}
        onCancel={() => setLoginOpen(false)}
      >
        <p className="mb-3 text-sm text-[#6b7280]">Leave these empty when the site does not need a login.</p>
        <div className="flex flex-col gap-3">
          <Input value={email} placeholder="Login email" autoComplete="off" onChange={(event) => setEmail(event.target.value)} />
          <Input.Password
            value={password}
            placeholder="Login password"
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#faf7fd] px-3 py-2">
      <p className="text-xs text-[#6b7280]">{label}</p>
      <p className="truncate text-sm font-semibold text-[#1c1c1c]">{value}</p>
    </div>
  );
}

function PageRow({ page, index }: { page: SavedPageRecord; index: number }) {
  let path = page.url;
  try {
    const parsed = new URL(page.url);
    path = `${parsed.pathname}${parsed.search}` || "/";
  } catch {
    path = page.url;
  }

  return (
    <li className="flex items-center justify-between gap-3 border-t border-[#f3f4f6] py-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 w-6 shrink-0 text-xs text-[#9ca3af]">{index}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-[#1c1c1c]">{page.name}</p>
            <Tag color={page.source === "manual" ? "purple" : "default"}>{page.source === "manual" ? "Added" : "Discovered"}</Tag>
          </div>
          <p className="truncate text-xs text-[#6b7280]">{path}</p>
        </div>
      </div>
      <PageStatus status={page.lastStatus} />
    </li>
  );
}

function PageStatus({ status }: { status: SavedPageRecord["lastStatus"] }) {
  if (status === "loaded") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-sm text-[#15803d]">
        <Check size={16} aria-hidden />
        Loaded
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-sm text-[#dc2626]">
        <X size={16} aria-hidden />
        Failed
      </span>
    );
  }
  return <span className="shrink-0 text-xs text-[#9ca3af]">Not tested</span>;
}
