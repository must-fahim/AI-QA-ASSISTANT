"use client";

import { useSyncExternalStore } from "react";
import { MODEL_STORAGE_KEY } from "@/lib/models";

const CHANGE_EVENT = "ai-qa-model-change";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function readStoredModel() {
  return window.localStorage.getItem(MODEL_STORAGE_KEY) ?? "";
}

export function useSelectedModel(fallback: string) {
  const stored = useSyncExternalStore(subscribe, readStoredModel, () => "");
  const selected = stored || fallback;

  function setSelected(modelId: string) {
    window.localStorage.setItem(MODEL_STORAGE_KEY, modelId);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return [selected, setSelected] as const;
}
