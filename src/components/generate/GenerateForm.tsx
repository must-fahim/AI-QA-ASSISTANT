"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { Button, Checkbox, Input, InputNumber, Select } from "antd";
import { Sparkles } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { clampTestCaseCount, LIMITS } from "@/constants/limits";
import { generateFormSchema } from "@/schemas/generate-form";
import {
  APPLICATION_TYPES,
  DETAIL_LEVELS,
  PRIORITIES,
  TESTING_CATEGORIES,
  type AppPreferences,
  type GenerateFormValues,
  type RequirementExample,
} from "@/types/domain";

export function GenerateForm({
  preferences,
  preferencesReady,
  submitting,
  onSubmit,
  exampleRequest,
}: {
  preferences: AppPreferences;
  preferencesReady: boolean;
  submitting: boolean;
  onSubmit: (values: GenerateFormValues) => Promise<void>;
  exampleRequest: { example: RequirementExample; token: number } | null;
}) {
  const form = useForm<GenerateFormValues>({
    resolver: yupResolver(generateFormSchema),
    defaultValues: {
      requirement: "",
      featureName: "",
      jiraTicketId: "",
      applicationType: "Web",
      priority: "Medium",
      categories: preferences.categories,
      testCaseCount: preferences.testCaseCount,
      detailLevel: preferences.detailLevel,
      environment: "",
      browserDevice: "",
      pageUrl: "",
      loginEmail: "",
      loginPassword: "",
    },
  });

  const { control, handleSubmit, setValue, formState } = form;

  useEffect(() => {
    if (!preferencesReady || formState.isDirty) return;
    setValue("categories", preferences.categories);
    setValue("testCaseCount", preferences.testCaseCount);
    setValue("detailLevel", preferences.detailLevel);
  }, [formState.isDirty, preferences, preferencesReady, setValue]);

  useEffect(() => {
    if (!exampleRequest) return;
    const example = exampleRequest.example;
    setValue("requirement", example.requirement, { shouldDirty: true, shouldValidate: true });
    setValue("featureName", example.featureName, { shouldDirty: true, shouldValidate: true });
    setValue("jiraTicketId", example.jiraTicketId, { shouldDirty: true });
    setValue("applicationType", example.applicationType, { shouldDirty: true });
    setValue("priority", example.priority, { shouldDirty: true });
    setValue("categories", example.categories, { shouldDirty: true, shouldValidate: true });
  }, [exampleRequest, setValue]);

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <section className="rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold">Open a page</h2>
        <p className="mb-4 text-xs text-[#6b7280]">
          The server opens this URL, signs in when you provide a login, and reads the visible fields.
          The password is used for that visit only. It is not saved and is not sent to the model.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            name="pageUrl"
            control={control}
            render={({ field, fieldState }) => (
              <Field label="Page URL" error={fieldState.error?.message} className="md:col-span-2">
                <Input
                  {...field}
                  status={fieldState.error ? "error" : ""}
                  placeholder="https://stg.example.com/create-campaign"
                />
              </Field>
            )}
          />
          <Controller
            name="loginEmail"
            control={control}
            render={({ field, fieldState }) => (
              <Field label="Login email" error={fieldState.error?.message}>
                <Input {...field} autoComplete="off" placeholder="name@example.com" />
              </Field>
            )}
          />
          <Controller
            name="loginPassword"
            control={control}
            render={({ field, fieldState }) => (
              <Field label="Login password" error={fieldState.error?.message}>
                <Input.Password {...field} autoComplete="new-password" />
              </Field>
            )}
          />
        </div>
      </section>

      <section className="rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-sm">
        <FormLabel htmlFor="requirement">Requirement</FormLabel>
        <p className="mb-2 text-xs text-[#6b7280]">
          Optional when a page URL is set. Add any extra rules the page does not show.
        </p>
        <Controller
          name="requirement"
          control={control}
          render={({ field, fieldState }) => (
            <>
              <Input.TextArea
                {...field}
                id="requirement"
                rows={12}
                status={fieldState.error ? "error" : ""}
                placeholder="Paste a user story, Jira description, feature specification, or API note."
              />
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-[#cf1322]">{fieldState.error?.message}</span>
                <span className="text-[#6b7280]">
                  {field.value.length} / {LIMITS.requirementMax}
                </span>
              </div>
            </>
          )}
        />
      </section>

      <section className="rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">Context</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            name="featureName"
            control={control}
            render={({ field, fieldState }) => (
              <Field label="Feature / module" error={fieldState.error?.message} required>
                <Input {...field} status={fieldState.error ? "error" : ""} placeholder="Password reset" />
              </Field>
            )}
          />
          <Controller
            name="jiraTicketId"
            control={control}
            render={({ field, fieldState }) => (
              <Field label="Jira ticket ID" error={fieldState.error?.message}>
                <Input {...field} status={fieldState.error ? "error" : ""} placeholder="AUTH-124" />
              </Field>
            )}
          />
          <Controller
            name="applicationType"
            control={control}
            render={({ field, fieldState }) => (
              <Field label="Application type" error={fieldState.error?.message} required>
                <Select
                  {...field}
                  options={APPLICATION_TYPES.map((value) => ({ value, label: value }))}
                  status={fieldState.error ? "error" : ""}
                />
              </Field>
            )}
          />
          <Controller
            name="priority"
            control={control}
            render={({ field, fieldState }) => (
              <Field label="Priority" error={fieldState.error?.message} required>
                <Select
                  {...field}
                  options={PRIORITIES.map((value) => ({ value, label: value }))}
                  status={fieldState.error ? "error" : ""}
                />
              </Field>
            )}
          />
        </div>
      </section>

      <section className="rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-sm">
        <FormLabel required>Testing categories</FormLabel>
        <Controller
          name="categories"
          control={control}
          render={({ field, fieldState }) => (
            <>
              <Checkbox.Group
                className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
                options={TESTING_CATEGORIES.map((category) => ({ label: category, value: category }))}
                value={field.value}
                onChange={(values) => field.onChange(values)}
              />
              {fieldState.error ? <p className="mt-2 text-xs text-[#cf1322]">{fieldState.error.message}</p> : null}
            </>
          )}
        />
      </section>

      <section className="rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">Configuration</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            name="testCaseCount"
            control={control}
            render={({ field, fieldState }) => (
              <Field label="Number of test cases" error={fieldState.error?.message} required>
                <InputNumber
                  className="w-full"
                  min={LIMITS.testCaseCountMin}
                  max={LIMITS.testCaseCountMax}
                  value={field.value}
                  onChange={(value) => field.onChange(clampTestCaseCount(value))}
                />
              </Field>
            )}
          />
          <Controller
            name="detailLevel"
            control={control}
            render={({ field, fieldState }) => (
              <Field label="Detail level" error={fieldState.error?.message} required>
                <Select
                  {...field}
                  options={DETAIL_LEVELS.map((value) => ({ value, label: value }))}
                />
              </Field>
            )}
          />
          <Controller
            name="environment"
            control={control}
            render={({ field }) => (
              <Field label="Testing environment">
                <Input {...field} placeholder="Staging" />
              </Field>
            )}
          />
          <Controller
            name="browserDevice"
            control={control}
            render={({ field }) => (
              <Field label="Browser / device">
                <Input {...field} placeholder="Chrome on macOS" />
              </Field>
            )}
          />
        </div>
      </section>

      <div>
        <Button type="primary" htmlType="submit" size="large" loading={submitting} icon={<Sparkles size={16} />}>
          Generate Test Cases
        </Button>
      </div>
    </form>
  );
}

function FormLabel({
  children,
  required,
  htmlFor,
}: {
  children: string;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-[#374151]">
      {children}
      {required ? <span className="text-[#cf1322]"> *</span> : null}
    </label>
  );
}

function Field({
  label,
  error,
  required,
  className,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className ?? ""}`}>
      <span className="font-medium text-[#374151]">
        {label}
        {required ? <span className="text-[#cf1322]"> *</span> : null}
      </span>
      {children}
      {error ? <span className="text-xs text-[#cf1322]">{error}</span> : null}
    </label>
  );
}
