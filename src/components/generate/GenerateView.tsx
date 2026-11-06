"use client";

import { Alert, App } from "antd";
import { useCallback, useState } from "react";
import { ExampleCards } from "@/components/generate/ExampleCards";
import { GenerateForm } from "@/components/generate/GenerateForm";
import { SampleOutputModal } from "@/components/generate/SampleOutputModal";
import { ResultsPanel } from "@/components/test-cases/ResultsPanel";
import { TestCaseDrawer } from "@/components/test-cases/TestCaseDrawer";
import { usePreferences } from "@/hooks/usePreferences";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type {
  AiGenerationResult,
  EditableTestCase,
  GenerateFormValues,
  RequirementExample,
  TestSuiteRecord,
} from "@/types/domain";

interface GenerateResponse {
  result: AiGenerationResult;
  model: string;
  generationDurationMs: number;
  persisted: boolean;
  observedRequirement: string | null;
  pageVisit: { finalUrl: string; title: string; controlCount: number } | null;
}

interface GenerationSession {
  values: GenerateFormValues;
  result: AiGenerationResult;
  cases: EditableTestCase[];
  model: string;
  generationDurationMs: number;
  persisted: boolean;
  suiteId: string | null;
}

export function GenerateView() {
  const { message, modal } = App.useApp();
  const { preferences, ready } = usePreferences();
  const [exampleRequest, setExampleRequest] = useState<{
    example: RequirementExample;
    token: number;
  } | null>(null);
  const [sample, setSample] = useState<RequirementExample | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [caseSaving, setCaseSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<GenerationSession | null>(null);
  const [activeCase, setActiveCase] = useState<{
    testCase: EditableTestCase;
    mode: "view" | "edit";
  } | null>(null);

  const saveSuite = useCallback(
    async (current: GenerationSession) => {
      setSaving(true);
      try {
        const saved = await apiFetch<TestSuiteRecord>("/api/test-suites", {
          method: "POST",
          body: JSON.stringify({
            title: current.values.featureName,
            requirement: current.values.requirement || current.values.pageUrl,
            jiraTicketId: current.values.jiraTicketId || undefined,
            configuration: {
              featureName: current.values.featureName,
              applicationType: current.values.applicationType,
              priority: current.values.priority,
              categories: current.values.categories,
              testCaseCount: current.values.testCaseCount,
              detailLevel: current.values.detailLevel,
              environment: current.values.environment || undefined,
              browserDevice: current.values.browserDevice || undefined,
              generationDurationMs: current.generationDurationMs,
              model: current.model,
            },
            requirementSummary: current.result.requirementSummary,
            assumptions: current.result.assumptions,
            clarificationQuestions: current.result.clarificationQuestions,
            testCases: current.cases,
          }),
        });
        setSession({
          ...current,
          persisted: true,
          suiteId: saved.id,
          cases: saved.testCases,
        });
        message.success("Saved to test history.");
      } catch (saveError) {
        if (saveError instanceof ApiClientError && saveError.code === "DATABASE_NOT_CONFIGURED") {
          message.warning("Generated, but the database is not configured. You can still review and export.");
          return;
        }
        message.error(saveError instanceof Error ? saveError.message : "The suite could not be saved.");
      } finally {
        setSaving(false);
      }
    },
    [message],
  );

  async function handleSubmit(values: GenerateFormValues) {
    setSubmitting(true);
    setError(null);
    setActiveCase(null);
    try {
      const generated = await apiFetch<GenerateResponse>("/api/generate", {
        method: "POST",
        body: JSON.stringify(values),
      });
      const nextSession: GenerationSession = {
        values: {
          ...values,
          loginPassword: "",
          requirement: generated.observedRequirement || values.requirement,
        },
        result: generated.result,
        cases: generated.result.testCases,
        model: generated.model,
        generationDurationMs: generated.generationDurationMs,
        persisted: false,
        suiteId: null,
      };
      setSession(nextSession);
      await saveSuite(nextSession);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Test cases could not be generated.");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveCase(next: EditableTestCase) {
    if (!session) return;
    setCaseSaving(true);
    try {
      const saved = next.recordId
        ? await apiFetch<EditableTestCase>(`/api/test-cases/${next.recordId}`, {
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
          })
        : next;
      setSession({
        ...session,
        cases: session.cases.map((item) =>
          (item.recordId ?? item.id) === (next.recordId ?? next.id) ? saved : item,
        ),
      });
      setActiveCase(null);
      message.success(next.recordId ? "Test case updated." : "Test case updated locally.");
    } catch (saveError) {
      message.error(saveError instanceof Error ? saveError.message : "The test case could not be updated.");
    } finally {
      setCaseSaving(false);
    }
  }

  function removeCase(testCase: EditableTestCase) {
    if (!session) return;
    modal.confirm({
      title: `Delete ${testCase.id}?`,
      content: testCase.recordId
        ? "This removes the test case from the saved suite."
        : "This removes the test case from the current results.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        if (testCase.recordId) {
          await apiFetch(`/api/test-cases/${testCase.recordId}`, { method: "DELETE" });
        }
        setSession((current) =>
          current
            ? {
                ...current,
                cases: current.cases.filter((item) => (item.recordId ?? item.id) !== (testCase.recordId ?? testCase.id)),
              }
            : current,
        );
        message.success("Test case deleted.");
      },
    });
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      {error ? <Alert type="error" showIcon title={error} /> : null}
      <GenerateForm
        preferences={preferences}
        preferencesReady={ready}
        submitting={submitting}
        onSubmit={handleSubmit}
        exampleRequest={exampleRequest}
      />
      <ExampleCards
        onUse={(example) => setExampleRequest({ example, token: Date.now() })}
        onViewSample={setSample}
      />
      <SampleOutputModal example={sample} onClose={() => setSample(null)} />
      {session ? (
        <ResultsPanel
          title={session.values.featureName}
          model={session.model}
          persisted={session.persisted}
          saving={saving}
          generationDurationMs={session.generationDurationMs}
          requirementSummary={session.result.requirementSummary}
          assumptions={session.result.assumptions}
          clarificationQuestions={session.result.clarificationQuestions}
          cases={session.cases}
          onOpen={(testCase, mode) => setActiveCase({ testCase, mode })}
          onDelete={removeCase}
          onSaveSuite={session.persisted ? undefined : () => saveSuite(session)}
        />
      ) : null}
      <TestCaseDrawer
        testCase={activeCase?.testCase ?? null}
        mode={activeCase?.mode ?? "view"}
        saving={caseSaving}
        onClose={() => setActiveCase(null)}
        onSave={saveCase}
      />
    </div>
  );
}
