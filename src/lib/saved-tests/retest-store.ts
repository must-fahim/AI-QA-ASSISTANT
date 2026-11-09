"use client";

import { useSyncExternalStore } from "react";
import {
  applyPageCheckEvent,
  emptyCheckState,
  type CheckState,
} from "@/lib/page-check/rows";
import { failOpenRows, readFailedResponse, readPageCheckStream } from "@/lib/page-check/read-stream";

interface RetestLogin {
  loginEmail?: string;
  loginPassword?: string;
}

const EMPTY_STATE = emptyCheckState();
const states = new Map<string, CheckState>();
const listeners = new Map<string, Set<() => void>>();
const queued = new Map<string, RetestLogin>();

function current(id: string) {
  return states.get(id) ?? EMPTY_STATE;
}

function update(id: string, recipe: (state: CheckState) => CheckState) {
  states.set(id, recipe(current(id)));
  listeners.get(id)?.forEach((listener) => listener());
}

export function queueRetest(id: string, login: RetestLogin) {
  queued.set(id, login);
}

export function takeQueuedRetest(id: string) {
  const login = queued.get(id) ?? null;
  queued.delete(id);
  return login;
}

export function useRetestState(id: string) {
  return useSyncExternalStore(
    (listener) => {
      const set = listeners.get(id) ?? new Set();
      set.add(listener);
      listeners.set(id, set);
      return () => set.delete(listener);
    },
    () => current(id),
    () => EMPTY_STATE,
  );
}

export async function runSavedRetest(id: string, login: RetestLogin) {
  if (current(id).running) return;
  update(id, () => ({ ...emptyCheckState(), running: true }));
  try {
    const response = await fetch(`/api/saved-tests/${id}/retest`, {
      method: "POST",
      headers: { Accept: "application/x-ndjson", "Content-Type": "application/json" },
      body: JSON.stringify({
        loginEmail: login.loginEmail || undefined,
        loginPassword: login.loginPassword || undefined,
      }),
    });
    if (!response.ok || !response.body) throw await readFailedResponse(response);
    await readPageCheckStream(response, (event) => {
      update(id, (state) => applyPageCheckEvent({ ...state, running: true }, event));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The retest could not be completed.";
    update(id, (state) => failOpenRows(state, message));
  } finally {
    update(id, (state) => ({ ...state, running: false }));
  }
}
