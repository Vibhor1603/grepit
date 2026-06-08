import { describe, it, expect, vi } from 'vitest';
import { GET } from '@/app/api/share/[token]/route';

const mockDb = {
  select: vi.fn(),
};

vi.mock('@/lib/db', () => ({ getDb: () => mockDb }));

describe('Shared Chat API', () => {
  it('returns chat data for a valid token', async () => {
    const token = 'valid-token';
    const conversationId = 'conv-123';

    // Mock shared_chats lookup
    mockDb.select.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{
            token,
            conversation_id: conversationId,
            title: 'Test Chat',
            repo_name: 'test/repo',
            created_at: new Date().toISOString(),
            expires_at: null
          }])
        })
      })
    });

    // Mock query_history lookup
    mockDb.select.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          orderBy: () => Promise.resolve([
            { query: 'hi', response: 'hello', created_at: new Date().toISOString() }
          ])
        })
      })
    });

    const response = await GET(new Request('http://localhost'), { params: Promise.resolve({ token }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe('Test Chat');
    expect(data.messages).toHaveLength(1);
  });

  it('returns 404 for invalid token', async () => {
    mockDb.select.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([])
        })
      })
    });

    const response = await GET(new Request('http://localhost'), { params: Promise.resolve({ token: 'invalid' }) });
    expect(response.status).toBe(404);
  });

  it('returns 410 for expired token', async () => {
    const pastDate = new Date(Date.now() - 1000).toISOString();
    
    mockDb.select.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{
            token: 'expired',
            expires_at: pastDate
          }])
        })
      })
    });

    const response = await GET(new Request('http://localhost'), { params: Promise.resolve({ token: 'expired' }) });
    expect(response.status).toBe(410);
  });
});
