import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, rateLimitKey } from '../../src/lib/rateLimit';

describe('rateLimit', () => {
  beforeEach(() => {
    // Rate limiter uses module-level Map, so we test fresh keys each time
  });

  it('allows requests within the limit', () => {
    const key = `test-allow-${Date.now()}`;
    const result = rateLimit(key, 5, 60000);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('decrements remaining tokens on each call', () => {
    const key = `test-decrement-${Date.now()}`;
    rateLimit(key, 5, 60000);
    rateLimit(key, 5, 60000);
    const result = rateLimit(key, 5, 60000);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('rejects when limit is exceeded', () => {
    const key = `test-reject-${Date.now()}`;
    for (let i = 0; i < 5; i++) rateLimit(key, 5, 60000);
    const result = rateLimit(key, 5, 60000);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets after window expires', async () => {
    const key = `test-reset-${Date.now()}`;
    for (let i = 0; i < 5; i++) rateLimit(key, 5, 50); // 50ms window
    await new Promise(r => setTimeout(r, 60));
    const result = rateLimit(key, 5, 50);
    expect(result.success).toBe(true);
  });
});

describe('rateLimitKey', () => {
  it('generates key with email when provided', () => {
    const key = rateLimitKey('query', '1.2.3.4', 'user@test.com');
    expect(key).toBe('query:user@test.com');
  });

  it('generates key with IP when no email', () => {
    const key = rateLimitKey('query', '1.2.3.4', null);
    expect(key).toBe('query:1.2.3.4');
  });
});
