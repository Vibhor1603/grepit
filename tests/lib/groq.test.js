import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildReasoningRequest, getAIModel, getAIModelChain, aiFetch } from "../../src/lib/ai";

const TEST_MODELS = "test/primary-model,test/fallback-model";

describe("getAIModel", () => {
  it("returns primary model from OPENROUTER_CHAT_MODELS", () => {
    vi.stubEnv("OPENROUTER_CHAT_MODELS", TEST_MODELS);
    expect(getAIModel()).toBe("test/primary-model");
    vi.unstubAllEnvs();
  });

  it("returns OPENROUTER_CHAT_MODEL when list is unset", () => {
    vi.stubEnv("OPENROUTER_CHAT_MODELS", "");
    vi.stubEnv("OPENROUTER_CHAT_MODEL", "test/single-model");
    expect(getAIModel()).toBe("test/single-model");
    vi.unstubAllEnvs();
  });
});

describe("getAIModelChain", () => {
  it("returns full fallback chain from env", () => {
    vi.stubEnv("OPENROUTER_CHAT_MODELS", TEST_MODELS);
    expect(getAIModelChain()).toEqual(["test/primary-model", "test/fallback-model"]);
    vi.unstubAllEnvs();
  });
});

describe("buildReasoningRequest", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_CHAT_MODELS", TEST_MODELS);
  });

  it("builds a valid request body", () => {
    const body = buildReasoningRequest({
      messages: [{ role: "user", content: "hello" }],
      maxCompletionTokens: 1000,
      temperature: 0.3,
    });
    expect(body.messages).toHaveLength(1);
    expect(body.max_tokens).toBe(1000);
    expect(body.temperature).toBe(0.3);
    expect(body.stream).toBe(false);
    expect(body.model).toBe("test/primary-model");
  });

  it("uses default values when not specified", () => {
    const body = buildReasoningRequest({ messages: [] });
    expect(body.max_tokens).toBe(3000);
    expect(body.temperature).toBe(0.2);
  });
});

describe("aiFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("OPENROUTER_CHAT_MODELS", TEST_MODELS);
  });

  it("makes a fetch request to AI provider", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    global.fetch = vi.fn().mockResolvedValue({ status: 200, ok: true, json: () => Promise.resolve({ choices: [{ message: { content: "test" } }] }) });
    const res = await aiFetch({ model: "test", messages: [] });
    expect(res.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    vi.unstubAllEnvs();
  });

  it("throws when API key is missing", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    await expect(aiFetch({ model: "test", messages: [] })).rejects.toThrow(/OPENROUTER_API_KEY/);
    vi.unstubAllEnvs();
  });
});
