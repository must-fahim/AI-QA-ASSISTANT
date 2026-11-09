import { afterEach, describe, expect, it } from "vitest";
import { readSessionToken, safeNextPath, signSession } from "@/lib/auth/session";

const originalSecret = process.env.AUTH_SECRET;

afterEach(() => {
  process.env.AUTH_SECRET = originalSecret;
});

describe("session", () => {
  it("round-trips a signed session and rejects a tampered token", () => {
    process.env.AUTH_SECRET = "test-secret";
    const token = signSession("user-1", 1_000);
    expect(readSessionToken(token, 1_000)).toBe("user-1");
    expect(readSessionToken(`${token}x`, 1_000)).toBeNull();
    expect(readSessionToken(token, 1_000 + 60 * 60 * 24 * 30 * 1000)).toBeNull();
  });

  it("only allows in-app paths after login", () => {
    expect(safeNextPath("/saved-tests")).toBe("/saved-tests");
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("/login")).toBe("/dashboard");
  });
});
