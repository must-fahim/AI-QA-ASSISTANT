"use client";

import { Select } from "antd";
import { useSyncExternalStore } from "react";
import { useSelectedModel } from "@/hooks/useSelectedModel";
import { apiFetch } from "@/lib/api/client";
import type { PublicStatus } from "@/lib/config";
import type { AiModelOption } from "@/lib/models";

const listeners = new Set<() => void>();
let status: PublicStatus | null = null;
let request: Promise<void> | null = null;

function loadStatus() {
  if (request) return;
  request = apiFetch<PublicStatus>("/api/status")
    .then((next) => {
      status = next;
      listeners.forEach((listener) => listener());
    })
    .catch(() => undefined);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  loadStatus();
  return () => listeners.delete(listener);
}

function snapshot() {
  return status;
}

export function ModelSelect() {
  const current = useSyncExternalStore(subscribe, snapshot, () => null);
  const options: AiModelOption[] = current?.availableModels ?? [];
  const fallback = current?.model ?? "";
  const [selected, setSelected] = useSelectedModel(fallback);

  if (options.length === 0) return null;

  const value = options.some((option) => option.id === selected) ? selected : fallback;

  return (
    <label className="flex items-center gap-2 text-xs text-[#6b7280]">
      Model
      <Select
        aria-label="AI model"
        className="min-w-40"
        value={value || undefined}
        options={options.map((option) => ({ value: option.id, label: option.label }))}
        onChange={setSelected}
      />
    </label>
  );
}
