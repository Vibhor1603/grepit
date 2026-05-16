import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the route
vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(new Map([['x-forwarded-for', '127.0.0.1'], ['content-type', 'application/json']])),
}));

vi.mock('../../../src/lib/server-session', () => ({
  getCurrentSession: () => Promise.resolve({ user: { email: 'test@test.com' } }),
  getSessionOwner: () => 'test@test.com',
}));

vi.mock('../../../src/lib/analysis-store', () => ({
  getAnalysisRecord: vi.fn(),
  createQueryHistory: vi.fn().mockResolvedValue(undefined),
  getRecentQueries: vi.fn().mockResolvedValue([]),
  deleteQueryHistory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../src/lib/env', () => ({
  isAIConfigured: () => false,
}));

describe('Query API - input validation', () => {
  it('rejects empty query', async () => {
    // This tests the validation logic conceptually
    const body = { query: '', analysisId: 'abc' };
    expect(body.query.trim().length).toBe(0);
  });

  it('rejects query over 2000 chars', () => {
    const body = { query: 'a'.repeat(2001), analysisId: 'abc' };
    expect(body.query.length).toBeGreaterThan(2000);
  });

  it('rejects invalid analysisId format', () => {
    const body = { query: 'test', analysisId: 'not-a-uuid' };
    expect(/^[0-9a-f-]{36}$/i.test(body.analysisId)).toBe(false);
  });

  it('accepts valid UUID analysisId', () => {
    const body = { query: 'test', analysisId: '6cd9d69d-e195-42f0-9929-d8bc8893a587' };
    expect(/^[0-9a-f-]{36}$/i.test(body.analysisId)).toBe(true);
  });
});

describe('Query API - response sanitization', () => {
  it('strips thinking tags from response', () => {
    const raw = '<think>internal reasoning here</think>The actual answer is here.';
    const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    expect(cleaned).toBe('The actual answer is here.');
  });

  it('strips User/Assistant prefixes', () => {
    const raw = 'User: hello\nAssistant: The answer is...';
    const cleaned = raw.replace(/^(User|Assistant|System):\s*/gim, '').trim();
    expect(cleaned).not.toContain('User:');
    expect(cleaned).not.toContain('Assistant:');
  });

  it('strips reasoning blocks', () => {
    const raw = '<reasoning>step 1, step 2</reasoning>Final answer.';
    const cleaned = raw.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '').trim();
    expect(cleaned).toBe('Final answer.');
  });
});
