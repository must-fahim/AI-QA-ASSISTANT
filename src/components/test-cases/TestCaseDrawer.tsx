"use client";

import { Button, Drawer, Input, Select, Space, Tag } from "antd";
import { useState, type ReactNode } from "react";
import { PRIORITIES, TESTING_CATEGORIES, type EditableTestCase, type Priority } from "@/types/domain";
import { updateTestCaseSchema } from "@/schemas/records";

export function TestCaseDrawer({
  testCase,
  mode,
  onClose,
  onSave,
  saving,
}: {
  testCase: EditableTestCase | null;
  mode: "view" | "edit";
  onClose: () => void;
  onSave: (testCase: EditableTestCase) => Promise<void>;
  saving: boolean;
}) {
  if (!testCase) {
    return <Drawer title="Test case" open={false} onClose={onClose} size="large" />;
  }

  return (
    <CaseEditor
      key={`${testCase.recordId ?? testCase.id}:${mode}`}
      testCase={testCase}
      mode={mode}
      onClose={onClose}
      onSave={onSave}
      saving={saving}
    />
  );
}

function CaseEditor({
  testCase,
  mode,
  onClose,
  onSave,
  saving,
}: {
  testCase: EditableTestCase;
  mode: "view" | "edit";
  onClose: () => void;
  onSave: (testCase: EditableTestCase) => Promise<void>;
  saving: boolean;
}) {
  const [draft, setDraft] = useState(() => structuredClone(testCase));
  const [error, setError] = useState<string | null>(null);

  const editing = mode === "edit";

  return (
    <Drawer
      title={draft ? `${editing ? "Edit" : "View"} ${draft.id}` : "Test case"}
      open={Boolean(testCase)}
      onClose={onClose}
      size="large"
      extra={
        editing ? (
          <Button
            type="primary"
            loading={saving}
            onClick={() => {
              if (!draft) return;
              const parsed = updateTestCaseSchema.safeParse(draft);
              if (!parsed.success) {
                setError(parsed.error.issues[0]?.message ?? "Check the test case fields.");
                return;
              }
              setError(null);
              void onSave({ ...draft, ...parsed.data });
            }}
          >
            Save changes
          </Button>
        ) : null
      }
    >
      {draft ? (
        <div className="flex flex-col gap-4">
          {error ? <p className="text-sm text-[#cf1322]">{error}</p> : null}
          <Field label="Title">
            {editing ? (
              <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            ) : (
              <p>{draft.title}</p>
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              {editing ? (
                <Select
                  value={draft.category}
                  options={categoryOptions(draft.category)}
                  onChange={(category) => setDraft({ ...draft, category })}
                />
              ) : (
                <Tag>{draft.category}</Tag>
              )}
            </Field>
            <Field label="Priority">
              {editing ? (
                <Select
                  value={draft.priority}
                  options={PRIORITIES.map((priority) => ({ value: priority, label: priority }))}
                  onChange={(priority: Priority) => setDraft({ ...draft, priority })}
                />
              ) : (
                <Tag color="purple">{draft.priority}</Tag>
              )}
            </Field>
          </div>
          <Field label="Preconditions">
            {editing ? (
              <StringList
                values={draft.preconditions}
                placeholder="Add a precondition"
                onChange={(preconditions) => setDraft({ ...draft, preconditions })}
              />
            ) : (
              <BulletList values={draft.preconditions} empty="No preconditions." />
            )}
          </Field>
          <Field label="Test steps">
            <div className="flex flex-col gap-3">
              {draft.testSteps.map((step, index) => (
                <div key={`${step.step}-${index}`} className="rounded-lg border border-[#e5e7eb] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#6b7280]">Step {index + 1}</span>
                    {editing && draft.testSteps.length > 1 ? (
                      <Button
                        size="small"
                        type="text"
                        danger
                        onClick={() =>
                          setDraft({
                            ...draft,
                            testSteps: draft.testSteps.filter((_, stepIndex) => stepIndex !== index),
                          })
                        }
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                  {editing ? (
                    <Space orientation="vertical" className="w-full">
                      <Input
                        value={step.action}
                        placeholder="Action"
                        onChange={(event) => updateStep(draft, index, { action: event.target.value }, setDraft)}
                      />
                      <Input
                        value={step.expectedResult}
                        placeholder="Expected result"
                        onChange={(event) =>
                          updateStep(draft, index, { expectedResult: event.target.value }, setDraft)
                        }
                      />
                    </Space>
                  ) : (
                    <div className="text-sm">
                      <p>{step.action}</p>
                      <p className="mt-1 text-[#6b7280]">{step.expectedResult}</p>
                    </div>
                  )}
                </div>
              ))}
              {editing ? (
                <Button
                  onClick={() =>
                    setDraft({
                      ...draft,
                      testSteps: [
                        ...draft.testSteps,
                        { step: draft.testSteps.length + 1, action: "", expectedResult: "" },
                      ],
                    })
                  }
                >
                  Add step
                </Button>
              ) : null}
            </div>
          </Field>
          <Field label="Test data">
            {editing ? (
              <Input.TextArea
                rows={3}
                value={draft.testData}
                onChange={(event) => setDraft({ ...draft, testData: event.target.value })}
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm">{draft.testData || "—"}</p>
            )}
          </Field>
          <Field label="Overall expected result">
            {editing ? (
              <Input.TextArea
                rows={3}
                value={draft.expectedResult}
                onChange={(event) => setDraft({ ...draft, expectedResult: event.target.value })}
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm">{draft.expectedResult}</p>
            )}
          </Field>
          <Field label="Tags">
            {editing ? (
              <Select
                mode="tags"
                value={draft.tags}
                onChange={(tags) => setDraft({ ...draft, tags })}
                tokenSeparators={[","]}
                placeholder="Add tags"
              />
            ) : (
              <Space wrap>
                {draft.tags.length ? draft.tags.map((tag) => <Tag key={tag}>{tag}</Tag>) : "—"}
              </Space>
            )}
          </Field>
        </div>
      ) : null}
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-[#374151]">{label}</span>
      {children}
    </label>
  );
}

function BulletList({ values, empty }: { values: string[]; empty: string }) {
  if (!values.length) return <p className="text-sm text-[#6b7280]">{empty}</p>;
  return (
    <ul className="list-disc pl-5 text-sm">
      {values.map((value) => (
        <li key={value}>{value}</li>
      ))}
    </ul>
  );
}

function StringList({
  values,
  placeholder,
  onChange,
}: {
  values: string[];
  placeholder: string;
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {values.map((value, index) => (
        <Space.Compact key={index} className="w-full">
          <Input
            value={value}
            placeholder={placeholder}
            onChange={(event) =>
              onChange(values.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
            }
          />
          <Button onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button>
        </Space.Compact>
      ))}
      <Button onClick={() => onChange([...values, ""])}>Add precondition</Button>
    </div>
  );
}

function categoryOptions(current: string) {
  const values = new Set<string>(TESTING_CATEGORIES);
  values.add(current);
  return [...values].map((category) => ({ value: category, label: category }));
}

function updateStep(
  draft: EditableTestCase,
  index: number,
  patch: Partial<EditableTestCase["testSteps"][number]>,
  setDraft: (next: EditableTestCase) => void,
) {
  setDraft({
    ...draft,
    testSteps: draft.testSteps.map((step, stepIndex) =>
      stepIndex === index ? { ...step, ...patch } : step,
    ),
  });
}
