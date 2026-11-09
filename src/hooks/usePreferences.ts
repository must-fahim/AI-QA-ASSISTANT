"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_PREFERENCES, LIMITS, PREFERENCES_STORAGE_KEY } from "@/constants/limits";
import {
  DETAIL_LEVELS,
  TESTING_CATEGORIES,
  type AppPreferences,
  type DetailLevel,
  type TestingCategory,
} from "@/types/domain";

const fallback: AppPreferences = {
  testCaseCount: DEFAULT_PREFERENCES.testCaseCount,
  categories: [...DEFAULT_PREFERENCES.categories],
  detailLevel: DEFAULT_PREFERENCES.detailLevel,
};

const CHANGE_EVENT = "ai-qa-preferences-change";

let cachedRaw: string | null | undefined;
let cachedValue: AppPreferences = fallback;

function subscribe(onStoreChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getSnapshot() {
  const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  cachedValue = raw ? (parsePreferences(raw) ?? fallback) : fallback;
  return cachedValue;
}

function getServerSnapshot() {
  return fallback;
}

export function usePreferences() {
  const preferences = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function save(next: AppPreferences) {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(next));
    cachedRaw = JSON.stringify(next);
    cachedValue = next;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return { preferences, ready: true, save };
}

function parsePreferences(raw: string): AppPreferences | null {
  try {
    const value = JSON.parse(raw) as Partial<AppPreferences>;
    const testCaseCount = Number(value.testCaseCount);
    if (!Number.isInteger(testCaseCount) || testCaseCount < LIMITS.testCaseCountMin) return null;
    if (!Array.isArray(value.categories)) return null;
    const categories = value.categories.filter((item): item is TestingCategory =>
      (TESTING_CATEGORIES as readonly string[]).includes(item),
    );
    if (!categories.length) return null;
    if (!(DETAIL_LEVELS as readonly string[]).includes(value.detailLevel ?? "")) return null;
    return {
      testCaseCount: Math.min(testCaseCount, LIMITS.testCaseCountMax),
      categories,
      detailLevel: value.detailLevel as DetailLevel,
    };
  } catch {
    return null;
  }
}
