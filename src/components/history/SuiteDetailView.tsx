"use client";

import { App, Button, Card, Empty, Input, Spin } from "antd";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ResultsPanel } from "@/components/test-cases/ResultsPanel";
import { TestCaseDrawer } from "@/components/test-cases/TestCaseDrawer";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { EditableTestCase, TestSuiteRecord } from "@/types/domain";

export function SuiteDetailView({ id }: { id: string }) {
  const { message, modal } = App.useApp();
  const [suite, setSuite] = useState<TestSuiteRecord | null>(null);
  const [title, setTitle] = useState("");
  const [jiraTicketId, setJiraTicketId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingCase, setSavingCase] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [activeCase, setActiveCase] = useState<{
    testCase: EditableTestCase;
    mode: "view" | "edit";
  } | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const next = await apiFetch<TestSuiteRecord>(`/api/test-suites/${id}`);
        if (!active) return;
        setSuite(next);
        setTitle(next.title);
        setJiraTicketId(next.jiraTicketId ?? "");
      } catch (loadError) {
        if (!active) return;
        setError(
          loadError instanceof ApiClientError
            ? loadError.message
            : "This test suite could not be loaded.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [id]);

  async function saveMetadata() {
    if (!suite) return;
    setSavingMeta(true);
    try {
      const updated = await apiFetch<TestSuiteRecord>(`/api/test-suites/${suite.id}`, {
        method: "PUT",
        body: JSON.stringify({ title, jiraTicketId: jiraTicketId || null }),
      });
      setSuite(updated);
      message.success("Suite details saved.");
    } catch (saveError) {
      message.error(saveError instanceof Error ? saveError.message : "Suite details could not be saved.");
    } finally {
      setSavingMeta(false);
    }
  }

  async function saveCase(next: EditableTestCase) {
    if (!suite || !next.recordId) return;
    setSavingCase(true);
    try {
      const saved = await apiFetch<EditableTestCase>(`/api/test-cases/${next.recordId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: next.title,
          category: next.category,
          priority: next.priority,
          preconditions: next.preconditions,
          testSteps: next.testSteps,
          testData: next.testData,
          expectedResult: next.expectedResult,
          tags: next.tags,
        }),
      });
      setSuite({
        ...suite,
        testCases: suite.testCases.map((item) => (item.recordId === saved.recordId ? saved : item)),
        testCaseCount: suite.testCases.length,
      });
      setActiveCase(null);
      message.success("Test case updated.");
    } catch (saveError) {
      message.error(saveError instanceof Error ? saveError.message : "The test case could not be updated.");
    } finally {
      setSavingCase(false);
    }
  }

  function removeCase(testCase: EditableTestCase) {
    if (!suite || !testCase.recordId) return;
    modal.confirm({
      title: `Delete ${testCase.id}?`,
      content: "This removes the test case from the saved suite.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        await apiFetch(`/api/test-cases/${testCase.recordId}`, { method: "DELETE" });
        setSuite({
          ...suite,
          testCases: suite.testCases.filter((item) => item.recordId !== testCase.recordId),
          testCaseCount: suite.testCases.length - 1,
        });
        message.success("Test case deleted.");
      },
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (error || !suite) {
    return (
      <Card>
        <Empty description={error ?? "Test suite was not found."}>
          <Link href="/history">
            <Button>Back to history</Button>
          </Link>
        </Empty>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <Card>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Requirement title</span>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Jira ticket ID</span>
            <Input value={jiraTicketId} onChange={(event) => setJiraTicketId(event.target.value)} />
          </label>
          <Button type="primary" loading={savingMeta} onClick={() => void saveMetadata()}>
            Save details
          </Button>
        </div>
      </Card>
      <ResultsPanel
        title={suite.title}
        persisted
        generationDurationMs={suite.configuration.generationDurationMs}
        requirementSummary={suite.requirementSummary || "No summary was stored."}
        assumptions={suite.assumptions}
        clarificationQuestions={suite.clarificationQuestions}
        cases={suite.testCases}
        onOpen={(testCase, mode) => setActiveCase({ testCase, mode })}
        onDelete={removeCase}
      />
      <TestCaseDrawer
        testCase={activeCase?.testCase ?? null}
        mode={activeCase?.mode ?? "view"}
        saving={savingCase}
        onClose={() => setActiveCase(null)}
        onSave={saveCase}
      />
    </div>
  );
}
