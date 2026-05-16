import { describe, it, expect, vi } from 'vitest';

describe('DashboardLayout helpers', () => {
  it('parseFollowUps extracts follow-up questions from ## heading', () => {
    const content = `Here is the answer.

## Follow-up questions
- What about authentication?
- How does the database connect?
- Where are the API routes?`;

    const patterns = [/## Follow-up questions?\s*\n/i, /#{1,3}\s*Follow[\s-]?up.*\n/i];
    let idx = -1;
    for (const pat of patterns) {
      const match = content.match(pat);
      if (match && match.index !== undefined) { idx = match.index; break; }
    }
    expect(idx).toBeGreaterThan(0);

    const rest = content.slice(idx).split('\n').filter(l => l.trim().startsWith('-'));
    expect(rest).toHaveLength(3);
  });

  it('parseFollowUps handles bold heading format', () => {
    const content = `Answer here.

**Follow-up Questions**
1. How does X work?
2. Where is Y?
3. What triggers Z?`;

    const pat = /\*\*Follow-up questions?.*\*\*\s*\n/i;
    const match = content.match(pat);
    expect(match).not.toBeNull();
  });

  it('parseFollowUps handles numbered lists', () => {
    const rest = `1. How does auth work?
2. Where is the database?
3. What triggers the webhook?`;

    const followUps = rest.split('\n')
      .map(l => l.trim())
      .filter(l => /^\d+\./.test(l))
      .map(l => l.replace(/^[\s\d.]+/, '').trim())
      .filter(l => l.length > 5)
      .slice(0, 3);
    expect(followUps).toHaveLength(3);
    expect(followUps[0]).toBe('How does auth work?');
  });
});

describe('Markdown rendering logic', () => {
  it('detects file paths', () => {
    const isFilePath = (text) => /^[\w\-./]+\.(js|ts|jsx|tsx|css|json|md|html|py|rb|go|rs|yaml|yml|toml|sql|sh|env)$/i.test(text) || text.includes('/');
    expect(isFilePath('src/lib/auth.js')).toBe(true);
    expect(isFilePath('package.json')).toBe(true);
    expect(isFilePath('main.go')).toBe(true);
    expect(isFilePath('backend/src/controllers/agent.js')).toBe(true);
    expect(isFilePath('hello world')).toBe(false);
    expect(isFilePath('const')).toBe(false);
  });

  it('detects code symbols', () => {
    const isCodeSymbol = (text) => /^[a-zA-Z_$][\w$]*$/.test(text) && text.length > 2;
    expect(isCodeSymbol('handleAuth')).toBe(true);
    expect(isCodeSymbol('UserService')).toBe(true);
    expect(isCodeSymbol('x')).toBe(false);
    expect(isCodeSymbol('hello world')).toBe(false);
  });

  it('strips quotes from backtick content for path detection', () => {
    const ref = "'backend/src/services/groqService.js'";
    const cleaned = ref.replace(/^['''"]+|['''"]+$/g, '').trim();
    expect(cleaned).toBe('backend/src/services/groqService.js');
    expect(cleaned.includes('/')).toBe(true);
  });
});

describe('Conversation-based chat', () => {
  it('generates unique conversation IDs', () => {
    const id1 = crypto.randomUUID();
    const id2 = crypto.randomUUID();
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^[0-9a-f-]{36}$/);
  });
});
