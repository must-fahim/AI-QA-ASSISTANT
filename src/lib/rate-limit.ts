import { AppError } from "@/lib/errors";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function assertRateLimit(key: string, now = Date.now()) {
  const max = positiveInt(process.env.RATE_LIMIT_MAX, 10);
  const windowMs = positiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000);
  const current = buckets.get(key);

  if (!current || now >= current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (current.count >= max) {
    throw new AppError(
      "Too many generation requests. Try again shortly.",
      429,
      "RATE_LIMITED",
    );
  }

  current.count += 1;
}

export function resetRateLimits() {
  buckets.clear();
}

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
