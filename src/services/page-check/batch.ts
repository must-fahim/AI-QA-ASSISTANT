/** One run lasts 12 minutes. The host allows 800 seconds, so this stops before that cut. */
export const PAGE_CHECK_BATCH_MS = 12 * 60 * 1000;

export function batchExpired(startedAt: number, now = Date.now()) {
  return now - startedAt >= PAGE_CHECK_BATCH_MS;
}
