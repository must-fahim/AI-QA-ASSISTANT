"use client";

import { Alert, App, Button, Empty, Input, Modal, Table } from "antd";
import { Eye, Pencil, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { formatTimestamp } from "@/lib/format";
import { queueRetest } from "@/lib/saved-tests/retest-store";
import type { SavedTestSummary } from "@/types/saved-tests";

export function SavedTestsView() {
  const router = useRouter();
  const { modal } = App.useApp();
  const [tests, setTests] = useState<SavedTestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retestTarget, setRetestTarget] = useState<SavedTestSummary | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch<{ tests: SavedTestSummary[] }>("/api/saved-tests");
      setTests(data.tests);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Saved tests could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    apiFetch<{ tests: SavedTestSummary[] }>("/api/saved-tests")
      .then((data) => {
        if (!active) return;
        setTests(data.tests);
        setError(null);
        setLoading(false);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : "Saved tests could not be loaded.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function remove(test: SavedTestSummary) {
    modal.confirm({
      title: `Delete ${test.name}?`,
      content: "This deletes the saved test and every page saved with it.",
      okText: "Delete",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await apiFetch(`/api/saved-tests/${test.id}`, { method: "DELETE" });
          toast.success("Saved test deleted.");
          await load();
        } catch (caught) {
          toast.error(caught instanceof ApiClientError ? caught.message : "The saved test could not be deleted.");
        }
      },
    });
  }

  function startRetest() {
    if (!retestTarget) return;
    queueRetest(retestTarget.id, { loginEmail: email, loginPassword: password });
    const id = retestTarget.id;
    setRetestTarget(null);
    setEmail("");
    setPassword("");
    router.push(`/saved-tests/${id}?retest=1`);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      {error ? <Alert type="error" showIcon title={error} /> : null}
      <section className="rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Saved tests</h2>
            <p className="text-xs text-[#6b7280]">Retest a saved page list without crawling the website again.</p>
          </div>
          <Link href="/page-check">
            <Button type="primary">Check a website</Button>
          </Link>
        </div>
        {error ? null : (
        <Table<SavedTestSummary>
          rowKey="id"
          loading={loading}
          dataSource={tests}
          pagination={false}
          scroll={{ x: 860 }}
          locale={{ emptyText: <Empty description="No saved tests yet. Check a website, then save the page list." /> }}
          columns={[
            {
              title: "Website",
              dataIndex: "name",
              render: (name: string, test) => (
                <div className="min-w-0">
                  <Link href={`/saved-tests/${test.id}`} className="font-medium text-[#1c1c1c] hover:text-[#712DC8]">
                    {name}
                  </Link>
                  <p className="truncate text-xs text-[#6b7280]">{test.siteUrl}</p>
                </div>
              ),
            },
            { title: "Pages", dataIndex: "pageCount", width: 90 },
            {
              title: "Created",
              dataIndex: "createdAt",
              width: 180,
              render: (value: string) => formatTimestamp(value),
            },
            {
              title: "Last tested",
              dataIndex: "lastTestedAt",
              width: 180,
              render: (value: string | null) => (value ? formatTimestamp(value) : "Not tested"),
            },
            {
              title: "Actions",
              key: "actions",
              width: 280,
              render: (_value, test) => (
                <div className="flex flex-wrap gap-2">
                  <Button size="small" icon={<Play size={14} />} onClick={() => setRetestTarget(test)}>
                    Retest
                  </Button>
                  <Link href={`/saved-tests/${test.id}`}>
                    <Button size="small" icon={<Eye size={14} />}>
                      View
                    </Button>
                  </Link>
                  <Link href={`/saved-tests/${test.id}/edit`}>
                    <Button size="small" icon={<Pencil size={14} />}>
                      Edit
                    </Button>
                  </Link>
                  <Button size="small" danger icon={<Trash2 size={14} />} onClick={() => remove(test)}>
                    Delete
                  </Button>
                </div>
              ),
            },
          ]}
        />
        )}
      </section>
      <Modal
        title={retestTarget ? `Retest ${retestTarget.name}` : "Retest"}
        open={Boolean(retestTarget)}
        okText="Start retest"
        onOk={startRetest}
        onCancel={() => setRetestTarget(null)}
      >
        <p className="mb-3 text-sm text-[#6b7280]">
          Every saved page is tested directly. Leave the login empty when the site does not need one. The password is not saved.
        </p>
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
