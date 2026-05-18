import { describe, it, expect, vi } from 'vitest';
import { isAIConfigured, isGitHubAuthConfigured, isDatabaseConfigured } from '../../src/lib/env';

describe('env helpers', () => {
  it('isAIConfigured returns true when OPENROUTER_API_KEY is set', () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    expect(isAIConfigured()).toBe(true);
    vi.unstubAllEnvs();
  });

  it('isAIConfigured returns true when GROQ_API_KEY is set', () => {
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    expect(isAIConfigured()).toBe(true);
    vi.unstubAllEnvs();
  });

  it('isAIConfigured returns false when no AI keys are set', () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');
    vi.stubEnv('GROQ_API_KEY', '');
    expect(isAIConfigured()).toBe(false);
    vi.unstubAllEnvs();
  });

  it('isGitHubAuthConfigured checks Clerk keys', () => {
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_xxx');
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_xxx');
    expect(isGitHubAuthConfigured()).toBe(true);
    vi.unstubAllEnvs();
  });

  it('isDatabaseConfigured checks DATABASE_URL', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    expect(isDatabaseConfigured()).toBe(true);
    vi.unstubAllEnvs();
  });
});
