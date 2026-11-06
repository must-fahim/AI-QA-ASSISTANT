"use client";

import { Button, Card, Empty, Table, Tag } from "antd";
import { FilePlus2, FolderClock, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import { formatDuration, formatTimestamp } from "@/lib/format";
import type { PublicStatus } from "@/lib/config";
import type { SuiteStats, TestSuiteRecord } from "@/types/domain";

interface SuiteList {
  suites: TestSuiteRecord[];
  stats: SuiteStats;
}

export function DashboardView() {
  const [status, setStatus] = useState<PublicStatus | null>(null);
  const [list, setList] = useState<SuiteList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const nextStatus = await apiFetch<PublicStatus>("/api/status");
        let nextList: SuiteList | null = null;
        if (nextStatus.databaseConfigured) {
          try {
            nextList = await apiFetch<SuiteList>("/api/test-suites");
          } catch (listError) {
            if (!(listError instanceof ApiClientError && listError.code === "DATABASE_NOT_CONFIGURED")) {
              throw listError;
            }
          }
        }
        if (!active) return;
        setStatus(nextStatus);
        setList(nextList);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Dashboard data could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const databaseReady = Boolean(status?.databaseConfigured && status.databaseReachable !== false && list);
  const stats = databaseReady ? list?.stats : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div>
        <p className="text-sm text-[#6b7280]">
          Generate structured test cases from requirements, then review, save, and export them.
        </p>
      </div>

      {error ? (
        <Card>
          <Empty description={error} />
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total generations" value={statValue(stats?.totalGenerations, databaseReady, loading)} />
        <Stat label="Total test cases" value={statValue(stats?.totalTestCases, databaseReady, loading)} />
        <Stat
          label="Average generation time"
          value={databaseReady ? formatDuration(stats?.averageGenerationTimeMs) : loading ? "…" : "—"}
        />
        <Stat label="Saved test suites" value={statValue(stats?.totalSavedTestSuites, databaseReady, loading)} />
      </div>

      {!loading && status && !databaseReady ? (
        <Card>
          <Empty
            description={
              status.databaseMessage ??
              "Connect Supabase to store generations. Statistics stay blank until saved suites can be read."
            }
          >
            <Link href="/settings">
              <Button type="primary">Review settings</Button>
            </Link>
          </Empty>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card title="Recent generations" loading={loading}>
          {databaseReady && list && list.suites.length === 0 ? (
            <Empty description="No generations have been saved yet.">
              <Link href="/generate">
                <Button type="primary">Generate test cases</Button>
              </Link>
            </Empty>
          ) : null}
          {databaseReady && list && list.suites.length > 0 ? (
            <Table
              rowKey="id"
              pagination={false}
              dataSource={list.suites.slice(0, 5)}
              columns={[
                { title: "Requirement", dataIndex: "title" },
                {
                  title: "Jira",
                  dataIndex: "jiraTicketId",
                  render: (value: string | null) => value || "—",
                },
                { title: "Cases", dataIndex: "testCaseCount", width: 90 },
                {
                  title: "Created",
                  dataIndex: "createdAt",
                  render: (value: string) => formatTimestamp(value),
                },
                {
                  title: "",
                  width: 90,
                  render: (_value, record: TestSuiteRecord) => (
                    <Link href={`/history/${record.id}`}>View</Link>
                  ),
                },
              ]}
            />
          ) : null}
          {!databaseReady && !loading ? <p className="text-sm text-[#6b7280]">Recent history appears after the database is connected.</p> : null}
        </Card>
        <Card title="Quick actions">
          <div className="flex flex-col gap-3">
            <Link href="/generate">
              <Button block type="primary" icon={<FilePlus2 size={16} />}>
                Generate test cases
              </Button>
            </Link>
            <Link href="/history">
              <Button block icon={<FolderClock size={16} />}>
                Open test history
              </Button>
            </Link>
            <Link href="/settings">
              <Button block icon={<Settings size={16} />}>
                Settings
              </Button>
            </Link>
            {status ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <Tag color={status.aiConfigured ? "green" : "default"}>
                  AI {status.aiConfigured ? "ready" : "not configured"}
                </Tag>
                <Tag color={databaseReady ? "green" : "default"}>
                  Database {databaseReady ? "ready" : "not ready"}
                </Tag>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-sm">
      <p className="text-sm text-[#6b7280]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[#1c1c1c]">{value}</p>
    </Card>
  );
}

function statValue(value: number | undefined, ready: boolean, loading: boolean) {
  if (loading) return "…";
  if (!ready || value == null) return "—";
  return String(value);
}
