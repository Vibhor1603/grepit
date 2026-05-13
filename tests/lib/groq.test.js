import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildGroqReasoningRequest, getGroqModel, groqFetch } from '../../src/lib/groq';

describe('getGroqModel', () => {
  it('returns the primary model', () => {
    const model = getGroqModel();
    expect(model).toBe('llama-3.3-70b-versatile');
  });
});

describe('buildGroqReasoningRequest', () => {
  it('builds a valid request body', () => {
    const body = buildGroqReasoningRequest({
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
    const body = buildGroqReasoningRequest({ messages: [] });
    expect(body.max_tokens).toBe(2400);
    expect(body.temperature).toBe(0.2);
  });
});

describe('groqFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('makes a fetch request to Groq API', async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 200, ok: true, json: () => Promise.resolve({ choices: [{ message: { content: 'test' } }] }) });
    const res = await groqFetch({ model: 'test', messages: [] });
    expect(res.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to next model on 429', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 2) return Promise.resolve({ status: 429, ok: false });
      return Promise.resolve({ status: 200, ok: true });
    });
    const res = await groqFetch({ model: 'test', messages: [] });
    expect(res.ok).toBe(true);
    expect(callCount).toBeGreaterThan(1);
  });

  it('throws after all models fail', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    await expect(groqFetch({ model: 'test', messages: [] })).rejects.toThrow();
  });
});
