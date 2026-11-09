"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Button, Input } from "antd";
import { ScanSearch } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { PageResultList } from "@/components/page-check/PageResultList";
import { SaveTestPanel } from "@/components/page-check/SaveTestPanel";
import { applyPageCheckEvent, emptyCheckState, type CheckState } from "@/lib/page-check/rows";
import { failOpenRows, readPageCheckBatches } from "@/lib/page-check/read-stream";
import { pageCheckFormSchema, type PageCheckFormValues } from "@/schemas/page-check-form";

export function PageCheckView() {
  const [check, setCheck] = useState<CheckState>(emptyCheckState());
  const [checkId, setCheckId] = useState(0);
  const [checkedSiteUrl, setCheckedSiteUrl] = useState("");
  const form = useForm<PageCheckFormValues>({
    resolver: yupResolver(pageCheckFormSchema),
    defaultValues: { siteUrl: "", loginEmail: "", loginPassword: "" },
  });

  async function onSubmit(values: PageCheckFormValues) {
    setCheckId((current) => current + 1);
    setCheckedSiteUrl(values.siteUrl);
    setCheck({ ...emptyCheckState(), running: true });

    try {
      await readPageCheckBatches(
        (resume) =>
          fetch("/api/page-check", {
            method: "POST",
            headers: { Accept: "application/x-ndjson", "Content-Type": "application/json" },
            body: JSON.stringify({
              siteUrl: values.siteUrl,
              loginEmail: values.loginEmail || undefined,
              loginPassword: values.loginPassword || undefined,
              resume: resume ?? undefined,
            }),
          }),
        (event) => {
          setCheck((state) => applyPageCheckEvent(state, event));
        },
      );
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "The page check could not be completed.";
      setCheck((state) => failOpenRows(state, message));
    } finally {
      setCheck((state) => ({ ...state, running: false }));
    }
  }

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
                  disabled={check.running}
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
                  <Input {...field} autoComplete="off" placeholder="name@example.com" disabled={check.running} />
                </Field>
              )}
            />
            <Controller
              name="loginPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field label="Login password" error={fieldState.error?.message}>
                  <Input.Password {...field} autoComplete="new-password" disabled={check.running} />
                </Field>
              )}
            />
          </div>
          <div>
            <Button type="primary" htmlType="submit" size="large" loading={check.running} icon={<ScanSearch size={16} />}>
              Check pages
            </Button>
          </div>
        </form>
      </section>

      {check.error ? <Alert type="error" title={check.error} showIcon /> : null}
      <PageResultList rows={check.rows} summary={check.summary} empty="Each page appears here while it loads." />
      <SaveTestPanel
        siteUrl={checkedSiteUrl}
        rows={check.rows}
        checkId={checkId}
        running={check.running}
        finished={Boolean(check.summary)}
      />
    </div>
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
