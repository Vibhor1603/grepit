import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, rateLimitKey } from '../../src/lib/rateLimit';

describe('rateLimit', () => {
  beforeEach(() => {
    // Rate limiter uses module-level Map in dev (no Redis), so we test fresh keys each time
  });

  it('allows requests within the limit', async () => {
    const key = `test-allow-${Date.now()}`;
    const result = await rateLimit(key, 5, 60000);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('decrements remaining tokens on each call', async () => {
    const key = `test-decrement-${Date.now()}`;
    await rateLimit(key, 5, 60000);
    await rateLimit(key, 5, 60000);
    const result = await rateLimit(key, 5, 60000);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('rejects when limit is exceeded', async () => {
    const key = `test-reject-${Date.now()}`;
    for (let i = 0; i < 5; i++) await rateLimit(key, 5, 60000);
    const result = await rateLimit(key, 5, 60000);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets after window expires', async () => {
    const key = `test-reset-${Date.now()}`;
    for (let i = 0; i < 5; i++) await rateLimit(key, 5, 50); // 50ms window
    await new Promise(r => setTimeout(r, 60));
    const result = await rateLimit(key, 5, 50);
    expect(result.success).toBe(true);
  });
});

describe('rateLimitKey', () => {
  it('generates key with userId when provided', () => {
    const key = rateLimitKey('query', '1.2.3.4', 'user_123');
    expect(key).toBe('query:user_123');
  });

  it('generates key with IP when no userId', () => {
    const key = rateLimitKey('query', '1.2.3.4', null);
    expect(key).toBe('query:1.2.3.4');
  });
});
