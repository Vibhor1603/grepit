import { describe, it, expect, vi } from 'vitest';
import { isGroqConfigured, isGitHubAuthConfigured, isDatabaseConfigured } from '../../src/lib/env';

describe('env helpers', () => {
  it('isGroqConfigured returns true when GROQ_API_KEY is set', () => {
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    expect(isGroqConfigured()).toBe(true);
    vi.unstubAllEnvs();
  });

  it('isGroqConfigured returns false when GROQ_API_KEY is empty', () => {
    vi.stubEnv('GROQ_API_KEY', '');
    expect(isGroqConfigured()).toBe(false);
    vi.unstubAllEnvs();
  });

  it('isGitHubAuthConfigured checks all required vars', () => {
    vi.stubEnv('GITHUB_ID', 'id');
    vi.stubEnv('GITHUB_SECRET', 'secret');
    vi.stubEnv('NEXTAUTH_SECRET', 'secret');
    expect(isGitHubAuthConfigured()).toBe(true);
    vi.unstubAllEnvs();
  });

  it('isDatabaseConfigured checks DATABASE_URL', () => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    expect(isDatabaseConfigured()).toBe(true);
    vi.unstubAllEnvs();
  });
});
