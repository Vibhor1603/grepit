import { describe, it, expect, vi } from 'vitest';
import { handleQueryPost } from '@/controllers/query.controller';
import { getAnalysisRecord, createQueryHistory } from '@/lib/analysis-store';
import { getCurrentSession, getSessionOwner } from '@/lib/server-session';
import { checkGate, logUsage } from '@/lib/subscription-gate';
import { rateLimit } from '@/lib/rateLimit';

vi.mock('@/lib/analysis-store', () => ({
  getAnalysisRecord: vi.fn(),
  createQueryHistory: vi.fn(() => Promise.resolve()),
  getRecentQueries: vi.fn(() => Promise.resolve([])),
}));
vi.mock('@/lib/server-session');
vi.mock('@/lib/subscription-gate', () => ({
  checkGate: vi.fn(),
  logUsage: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(() => Promise.resolve({ success: true, remaining: 10 })),
  rateLimitKey: vi.fn(() => 'test-key'),
}));
vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve(new Map([['content-type', 'application/json']]))),
}));
vi.mock('@/lib/env', () => ({ isAIConfigured: () => false }));

describe('Access Control', () => {
  it('prevents User A from accessing User B analysis', async () => {
    // Setup: User A is logged in
    vi.mocked(getCurrentSession).mockResolvedValue({ userId: 'user-a' });
    vi.mocked(getSessionOwner).mockResolvedValue('user-a@example.com');
    
    // Setup: Analysis belongs to User B
    const analysisId = '00000000-0000-0000-0000-000000000000';
    vi.mocked(getAnalysisRecord).mockResolvedValue({
      id: analysisId,
      owner_email: 'user-b@example.com',
      repo_name: 'private-repo'
    });

    vi.mocked(checkGate).mockResolvedValue({ allowed: true });

    const request = new Request('http://localhost/api/query', {
      method: 'POST',
      body: JSON.stringify({ query: 'tell me about the code', analysisId })
    });

    const response = await handleQueryPost(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('You do not have access');
  });

  it('allows User A to access their own analysis', async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ userId: 'user-a' });
    vi.mocked(getSessionOwner).mockResolvedValue('user-a@example.com');
    
    const analysisId = '00000000-0000-0000-0000-000000000000';
    vi.mocked(getAnalysisRecord).mockResolvedValue({
      id: analysisId,
      owner_email: 'user-a@example.com',
      repo_name: 'my-repo',
      summary: 'A cool repo',
      languages: {},
      architecture: {},
      file_tree: []
    });

    vi.mocked(checkGate).mockResolvedValue({ allowed: true });

    const request = new Request('http://localhost/api/query', {
      method: 'POST',
      body: JSON.stringify({ query: 'tell me about the code', analysisId })
    });

    const response = await handleQueryPost(request);
    expect(response.status).toBe(200);
  });
});
