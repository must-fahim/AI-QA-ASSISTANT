"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Button, Input } from "antd";
import { Check, LoaderCircle, ScanSearch, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { ApiClientError } from "@/lib/api/client";
import { pageCheckFormSchema, type PageCheckFormValues } from "@/schemas/page-check-form";
import type { PageCheckEvent } from "@/services/page-check/types";

interface CheckRow {
  url: string;
  name: string;
  path: string;
  state: "loading" | "loaded" | "failed";
  detail: string;
}

export function PageCheckView() {
  const [rows, setRows] = useState<CheckRow[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const form = useForm<PageCheckFormValues>({
    resolver: yupResolver(pageCheckFormSchema),
    defaultValues: { siteUrl: "", loginEmail: "", loginPassword: "" },
  });

  async function onSubmit(values: PageCheckFormValues) {
    setRunning(true);
    setError(null);
    setSummary(null);
    setRows([]);

    try {
      const response = await fetch("/api/page-check", {
        method: "POST",
        headers: { Accept: "application/x-ndjson", "Content-Type": "application/json" },
        body: JSON.stringify({
          siteUrl: values.siteUrl,
          loginEmail: values.loginEmail || undefined,
          loginPassword: values.loginPassword || undefined,
        }),
      });

      if (!response.ok || !response.body) {
        throw await readError(response);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          applyEvent(JSON.parse(line) as PageCheckEvent);
        }
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "The page check could not be completed.";
      setError(message);
      setRows((current) =>
        current.map((row) => (row.state === "loading" ? { ...row, state: "failed", detail: "Failed to load" } : row)),
      );
    } finally {
      setRunning(false);
    }
  }

  function applyEvent(event: PageCheckEvent) {
    if (event.type === "checking" && event.url && event.name && event.path) {
      const next = { url: event.url, name: event.name, path: event.path, state: "loading" as const, detail: "Loading" };
      setRows((current) => {
        const index = current.findIndex((row) => row.url === event.url);
        if (index === -1) return [...current, next];
        return current.map((row, rowIndex) => (rowIndex === index ? next : row));
      });
      return;
    }

    if (event.type === "result" && event.url && event.name && event.path && event.status && event.detail) {
      setRows((current) =>
        current.map((row) =>
          row.url === event.url
            ? { url: event.url, name: event.name, path: event.path, state: event.status, detail: event.detail }
            : row,
        ) as CheckRow[],
      );
      return;
    }

    if (event.type === "error" && event.message) {
      setError(event.message);
      setRows((current) =>
        current.map((row) => (row.state === "loading" ? { ...row, state: "failed", detail: "Failed to load" } : row)),
      );
      return;
    }

    if (event.type === "done") {
      const loaded = (event.checked ?? 0) - (event.failed ?? 0);
      const extra = event.truncated ? " More linked pages were left unchecked." : "";
      setSummary(`${loaded} loaded, ${event.failed ?? 0} failed.${extra}`);
    }
  }

  const loading = rows.find((row) => row.state === "loading");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <section className="rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold">Check page loads</h2>
        <p className="mb-4 text-xs text-[#6b7280]">
          Opens the site, signs in when you provide a login, then visits each page. A detail opens from a row, a View link, or a View or Details action.
          The password is used for this check only and is not saved.
        </p>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <Controller
            name="siteUrl"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field label="Site URL" required error={fieldState.error?.message}>
                <Input
                  {...field}
                  status={fieldState.error ? "error" : ""}
                  placeholder="https://stg.example.com"
                  disabled={running}
                />
              </Field>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Controller
              name="loginEmail"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field label="Login email" error={fieldState.error?.message}>
                  <Input {...field} autoComplete="off" placeholder="name@example.com" disabled={running} />
                </Field>
              )}
            />
            <Controller
              name="loginPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field label="Login password" error={fieldState.error?.message}>
                  <Input.Password {...field} autoComplete="new-password" disabled={running} />
                </Field>
              )}
            />
          </div>
          <div>
            <Button type="primary" htmlType="submit" size="large" loading={running} icon={<ScanSearch size={16} />}>
              Check pages
            </Button>
          </div>
        </form>
      </section>

      {error ? <Alert type="error" title={error} showIcon /> : null}

      <section className="rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-sm" aria-live="polite">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Pages</h2>
          {summary ? <p className="text-xs text-[#6b7280]">{summary}</p> : null}
        </div>
        {loading ? <p className="mb-3 text-sm text-[#712DC8]">Loading {loading.name}</p> : null}
        {rows.length === 0 ? (
          <p className="text-sm text-[#6b7280]">Each page appears here while it loads.</p>
        ) : (
          <ul className="flex flex-col">
            {rows.map((row) => (
              <li key={row.url} className="flex items-center justify-between gap-3 border-t border-[#f3f4f6] py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#1c1c1c]">{row.name}</p>
                  <p className="truncate text-xs text-[#6b7280]">{row.path}</p>
                </div>
                <Status state={row.state} detail={row.detail} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Status({ state, detail }: { state: CheckRow["state"]; detail: string }) {
  if (state === "loading") {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-[#712DC8]">
        <LoaderCircle size={16} className="animate-spin" aria-hidden />
        {detail}
      </span>
    );
  }
  if (state === "loaded") {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-[#15803d]">
        <Check size={16} aria-hidden />
        {detail}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm text-[#dc2626]">
      <X size={16} aria-hidden />
      {detail}
    </span>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-[#374151]">
        {label}
        {required ? <span className="text-[#cf1322]"> *</span> : null}
      </span>
      {children}
      {error ? <span className="text-xs text-[#cf1322]">{error}</span> : null}
    </label>
  );
}

async function readError(response: Response) {
  const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
  return new ApiClientError(
    response.status,
    "REQUEST_FAILED",
    payload?.error?.message ?? "The page check could not be completed.",
  );
}
