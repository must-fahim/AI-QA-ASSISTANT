const SENSITIVE_KEY = /api[_-]?key|authorization|token|secret|password|service[_-]?role|credential/i;

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4 || value == null) return value;
  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1));
  if (typeof value !== "object") return value;

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    output[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : sanitize(entry, depth + 1);
  }
  return output;
}

function write(level: "info" | "error", message: string, meta?: Record<string, unknown>) {
  const payload = meta ? sanitize(meta) : undefined;
  if (level === "error") {
    console.error(`[ai-qa] ${message}`, payload ?? "");
    return;
  }
  console.info(`[ai-qa] ${message}`, payload ?? "");
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    write("info", message, meta);
  },
  error(message: string, meta?: Record<string, unknown>) {
    write("error", message, meta);
  },
};
