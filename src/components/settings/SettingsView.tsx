"use client";

import { Alert, Button, Card, Checkbox, InputNumber, Select, Tag } from "antd";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { clampTestCaseCount, LIMITS } from "@/constants/limits";
import { usePreferences } from "@/hooks/usePreferences";
import { apiFetch } from "@/lib/api/client";
import type { PublicStatus } from "@/lib/config";
import {
  DETAIL_LEVELS,
  TESTING_CATEGORIES,
  type AppPreferences,
  type DetailLevel,
  type TestingCategory,
} from "@/types/domain";

export function SettingsView() {
  const { preferences, save } = usePreferences();
  const [status, setStatus] = useState<PublicStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AppPreferences | null>(null);
  const categories = draft?.categories ?? preferences.categories;
  const testCaseCount = draft?.testCaseCount ?? preferences.testCaseCount;
  const detailLevel = draft?.detailLevel ?? preferences.detailLevel;

  useEffect(() => {
    let active = true;
    apiFetch<PublicStatus>("/api/status")
      .then((next) => {
        if (active) setStatus(next);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Settings status could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {error ? <Alert type="error" showIcon title={error} /> : null}
      <Card title="AI provider">
        <div className="flex flex-col gap-3 text-sm text-[#374151]">
          <StatusLine label="Configuration" ready={Boolean(status?.aiConfigured)} />
          <p>
            Model: <strong>{status?.model || "Not set"}</strong>
          </p>
          <p>
            Endpoint host: <strong>{status?.aiBaseHost || "Not set"}</strong>
          </p>
          <Alert
            type="info"
            showIcon
            title="API keys stay on the server"
            description="Set AI_API_KEY and AI_MODEL in .env.local. Optionally set AI_BASE_URL for an OpenAI-compatible gateway. Restart the dev server after changing environment variables. The key is never sent to the browser."
          />
        </div>
      </Card>
      <Card title="Database">
        <div className="flex flex-col gap-3 text-sm">
          <StatusLine label="Credentials" ready={Boolean(status?.databaseConfigured)} />
          <StatusLine label="Connection" ready={status?.databaseReachable === true} />
          {status?.databaseMessage ? <p className="text-[#6b7280]">{status.databaseMessage}</p> : null}
          <Alert
            type="info"
            showIcon
            title="Supabase setup"
            description="Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local, then run the SQL files in supabase/migrations. Google sign-in also needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. The service role key bypasses Row Level Security and must not use a NEXT_PUBLIC_ variable."
          />
        </div>
      </Card>
      <Card title="Generation defaults">
        <div className="flex flex-col gap-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Default number of test cases</span>
            <InputNumber
              min={LIMITS.testCaseCountMin}
              max={LIMITS.testCaseCountMax}
              value={testCaseCount}
              onChange={(value) =>
                setDraft({
                  categories,
                  detailLevel,
                  testCaseCount:
                    typeof value === "number" ? clampTestCaseCount(value) : LIMITS.testCaseCountMin,
                })
              }
            />
          </label>
          <div>
            <p className="mb-2 text-sm font-medium">Default testing categories</p>
            <Checkbox.Group
              className="grid gap-2 sm:grid-cols-2"
              value={categories}
              options={TESTING_CATEGORIES.map((category) => ({ label: category, value: category }))}
              onChange={(values) =>
                setDraft({
                  categories: values as TestingCategory[],
                  detailLevel,
                  testCaseCount,
                })
              }
            />
          </div>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Default detail level</span>
            <Select
              value={detailLevel}
              className="w-full max-w-xs"
              options={DETAIL_LEVELS.map((level) => ({ value: level, label: level }))}
              onChange={(value: DetailLevel) =>
                setDraft({ categories, detailLevel: value, testCaseCount })
              }
            />
          </label>
          <div>
            <Button
              type="primary"
              disabled={!categories.length}
              onClick={() => {
                save({ testCaseCount, categories, detailLevel });
                toast.success("Defaults saved in this browser.");
              }}
            >
              Save defaults
            </Button>
          </div>
          <p className="text-xs text-[#6b7280]">
            Defaults are stored in local storage for this browser. They are not secrets and do not change the server
            AI configuration.
          </p>
        </div>
      </Card>
    </div>
  );
}

function StatusLine({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <Tag color={ready ? "green" : "default"}>{ready ? "Ready" : "Not ready"}</Tag>
    </div>
  );
}
