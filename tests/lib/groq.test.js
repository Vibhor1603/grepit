import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildReasoningRequest, getAIModel, aiFetch } from '../../src/lib/ai';

describe('getAIModel', () => {
  it('returns OpenRouter model when OPENROUTER_API_KEY is set', () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    const model = getAIModel();
    expect(model).toBe('REDACTED_CHAT_MODEL');
    vi.unstubAllEnvs();
  });

  it('returns Groq fallback model when only GROQ_API_KEY is set', () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    const model = getAIModel();
    expect(model).toBe('llama-3.1-8b-instant');
    vi.unstubAllEnvs();
  });
});

describe('buildReasoningRequest', () => {
  it('builds a valid request body', () => {
    const body = buildReasoningRequest({
      messages: [{ role: 'user', content: 'hello' }],
      maxCompletionTokens: 1000,
      temperature: 0.3,
    });
    expect(body.messages).toHaveLength(1);
    expect(body.max_tokens).toBe(1000);
    expect(body.temperature).toBe(0.3);
    expect(body.stream).toBe(false);
    expect(body.model).toBeDefined();
  });

  it('uses default values when not specified', () => {
    const body = buildReasoningRequest({ messages: [] });
    expect(body.max_tokens).toBe(3000);
    expect(body.temperature).toBe(0.2);
  });
});

describe('aiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('makes a fetch request to AI provider', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    global.fetch = vi.fn().mockResolvedValue({ status: 200, ok: true, json: () => Promise.resolve({ choices: [{ message: { content: 'test' } }] }) });
    const res = await aiFetch({ model: 'test', messages: [] });
    expect(res.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    vi.unstubAllEnvs();
  });

  it('falls back to Groq on OpenRouter failure', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      // First call is OpenRouter (fails with 500 — non-retryable)
      if (callCount === 1) return Promise.resolve({ status: 500, ok: false });
      // Second call is Groq fallback (succeeds)
      return Promise.resolve({ status: 200, ok: true });
    });
    const res = await aiFetch({ model: 'test', messages: [] });
    expect(res.ok).toBe(true);
    expect(callCount).toBe(2);
    vi.unstubAllEnvs();
  });

  it('throws after all providers fail', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');
    vi.stubEnv('GROQ_API_KEY', '');
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    await expect(aiFetch({ model: 'test', messages: [] })).rejects.toThrow();
    vi.unstubAllEnvs();
  });
});
