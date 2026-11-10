"use client";

import { useSyncExternalStore } from "react";
import { toast } from "react-toastify";
import {
  applyPageCheckEvent,
  emptyCheckState,
  type CheckState,
} from "@/lib/page-check/rows";
import { failOpenRows, readPageCheckBatches } from "@/lib/page-check/read-stream";

interface RetestLogin {
  loginEmail?: string;
  loginPassword?: string;
}

const EMPTY_STATE = emptyCheckState();
const states = new Map<string, CheckState>();
const listeners = new Map<string, Set<() => void>>();
const queued = new Map<string, RetestLogin>();
const controllers = new Map<string, AbortController>();

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

export function stopSavedRetest(id: string) {
  controllers.get(id)?.abort();
}

export async function runSavedRetest(id: string, login: RetestLogin) {
  if (current(id).running) return;
  const controller = new AbortController();
  controllers.set(id, controller);
  update(id, () => ({ ...emptyCheckState(), running: true }));
  let stopped = false;
  try {
    await readPageCheckBatches(
      (resume) =>
        fetch(`/api/saved-tests/${id}/retest`, {
          method: "POST",
          headers: { Accept: "application/x-ndjson", "Content-Type": "application/json" },
          body: JSON.stringify({
            loginEmail: login.loginEmail || undefined,
            loginPassword: login.loginPassword || undefined,
            doneUrls: resume?.doneUrls,
            checked: resume?.checked,
            failed: resume?.failed,
          }),
          signal: controller.signal,
        }),
      (event) => {
        update(id, (state) => applyPageCheckEvent({ ...state, running: true }, event));
      },
      controller.signal,
    );
  } catch (error) {
    if (controller.signal.aborted) {
      stopped = true;
      update(id, (state) => ({
        ...state,
        error: null,
        rows: state.rows.filter((row) => row.state !== "loading"),
        summary: "Retest stopped.",
      }));
      return;
    }
    const message = error instanceof Error ? error.message : "The retest could not be completed.";
    update(id, (state) => failOpenRows(state, message));
  } finally {
    if (controllers.get(id) === controller) controllers.delete(id);
    update(id, (state) => ({ ...state, running: false }));
    if (!stopped) notifyRetest(current(id));
  }
}

function notifyRetest(state: CheckState) {
  const failed = state.rows.filter((row) => row.state === "failed").length;
  if (failed > 0) {
    toast.error(failed === 1 ? "1 test failed" : `${failed} tests failed`);
    return;
  }
  if (state.rows.length > 0 && state.rows.every((row) => row.state === "loaded")) {
    toast.success("All tests passed");
    return;
  }
  if (state.error) toast.error(state.error);
}
