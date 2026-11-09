import { describe, expect, it } from "vitest";
import { modelsForHost, resolveRequestedModel } from "@/lib/models";

describe("model selection", () => {
  it("offers the free Groq chat models and keeps the configured default", () => {
    const options = modelsForHost("api.groq.com", "openai/gpt-oss-120b");
    expect(options.map((option) => option.id)).toEqual([
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "qwen/qwen3.8-27b",
    ]);
    expect(resolveRequestedModel("qwen/qwen3.8-27b", options, "openai/gpt-oss-120b")).toBe(
      "qwen/qwen3.8-27b",
    );
    expect(resolveRequestedModel("gpt-4o", options, "openai/gpt-oss-120b")).toBe(
      "openai/gpt-oss-120b",
    );
  });
});
