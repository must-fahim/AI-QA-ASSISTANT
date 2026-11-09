export const PAGE_CHECK_BATCH_MS = 240_000;

export function batchExpired(startedAt: number, now = Date.now()) {
  return now - startedAt >= PAGE_CHECK_BATCH_MS;
}
