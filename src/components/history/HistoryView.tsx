"use client";

import { App, Button, Card, Empty, Input, Select, Space, Table, Tag } from "antd";
import Link from "next/link";
import { toast } from "react-toastify";
import { useEffect, useMemo, useState } from "react";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import { buildCsvFilename, buildTestCasesCsv } from "@/lib/csv/export-test-cases";
import { downloadCsv } from "@/lib/csv/download";
import { formatTimestamp } from "@/lib/format";
import type { PublicStatus } from "@/lib/config";
import type { SuiteStats, TestingCategory, TestSuiteRecord } from "@/types/domain";

interface SuiteList {
  suites: TestSuiteRecord[];
  stats: SuiteStats;
}

async function readHistory() {
  const status = await apiFetch<PublicStatus>("/api/status");
  if (!status.databaseConfigured || status.databaseReachable === false) {
    return { status, suites: [] as TestSuiteRecord[] };
  }
  const list = await apiFetch<SuiteList>("/api/test-suites");
  return { status, suites: list.suites };
}

export function HistoryView() {
  const { modal } = App.useApp();
  const [status, setStatus] = useState<PublicStatus | null>(null);
  const [suites, setSuites] = useState<TestSuiteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  function applyHistory(result: { status: PublicStatus; suites: TestSuiteRecord[] }) {
    setStatus(result.status);
    setSuites(result.suites);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    readHistory()
      .then((result) => {
        if (active) applyHistory(result);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        if (loadError instanceof ApiClientError && loadError.code === "DATABASE_NOT_CONFIGURED") {
          setSuites([]);
          setLoading(false);
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Test history could not be loaded.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => [...new Set(suites.flatMap((suite) => suite.configuration.categories ?? []))],
    [suites],
  );

  const filtered = suites.filter((suite) => {
    const needle = query.trim().toLowerCase();
    const matchesQuery =
      !needle ||
      suite.title.toLowerCase().includes(needle) ||
      (suite.jiraTicketId ?? "").toLowerCase().includes(needle);
    const matchesCategory =
      category === "all" || suite.configuration.categories?.includes(category as TestingCategory);
    return matchesQuery && matchesCategory;
  });

  async function exportSuite(suite: TestSuiteRecord) {
    try {
      const detail = await apiFetch<TestSuiteRecord>(`/api/test-suites/${suite.id}`);
      downloadCsv(buildCsvFilename(detail.title), buildTestCasesCsv(detail.testCases));
    } catch (exportError) {
      toast.error(exportError instanceof Error ? exportError.message : "The suite could not be exported.");
    }
  }

  function confirmDelete(suite: TestSuiteRecord) {
    modal.confirm({
      title: `Delete ${suite.title}?`,
      content: "The suite and its test cases will be removed from the database.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        await apiFetch(`/api/test-suites/${suite.id}`, { method: "DELETE" });
        toast.success("Test suite deleted.");
        applyHistory(await readHistory());
      },
    });
  }

  const databaseReady = Boolean(status?.databaseConfigured && status.databaseReachable !== false);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <Card>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
          <Input.Search
            allowClear
            placeholder="Search by title or Jira ticket"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Select
            value={category}
            onChange={setCategory}
            options={[{ value: "all", label: "All categories" }, ...categories.map((item) => ({ value: item, label: item }))]}
          />
        </div>
      </Card>
      <Card>
        {!loading && status && !databaseReady ? (
          <Empty description={status.databaseMessage ?? "Connect Supabase to load saved test history."}>
            <Link href="/settings">
              <Button type="primary">Open settings</Button>
            </Link>
          </Empty>
        ) : null}
        {error ? <Empty description={error} /> : null}
        {databaseReady ? (
          <Table
            rowKey="id"
            loading={loading}
            dataSource={filtered}
            locale={{ emptyText: "No saved test suites match this search." }}
            columns={[
              { title: "Requirement title", dataIndex: "title" },
              {
                title: "Jira ticket",
                dataIndex: "jiraTicketId",
                render: (value: string | null) => value || "—",
              },
              {
                title: "Generated",
                dataIndex: "createdAt",
                render: (value: string) => formatTimestamp(value),
              },
              { title: "Test cases", dataIndex: "testCaseCount", width: 120 },
              {
                title: "Categories",
                render: (_value, record: TestSuiteRecord) => (
                  <Space size={[4, 4]} wrap>
                    {(record.configuration.categories ?? []).map((item) => (
                      <Tag key={item}>{item}</Tag>
                    ))}
                  </Space>
                ),
              },
              {
                title: "Actions",
                width: 280,
                render: (_value, record: TestSuiteRecord) => (
                  <Space wrap>
                    <Link href={`/history/${record.id}`}>View</Link>
                    <Link href={`/history/${record.id}`}>Edit</Link>
                    <Button type="link" size="small" onClick={() => exportSuite(record)}>
                      Export
                    </Button>
                    <Button type="link" size="small" danger onClick={() => confirmDelete(record)}>
                      Delete
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        ) : null}
      </Card>
    </div>
  );
}
