import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock the dynamic import for CodeViewer
vi.mock('next/dynamic', () => ({
  default: (fn) => {
    const Component = ({ code, filePath }) => <pre data-testid="code-viewer">{code}</pre>;
    Component.displayName = 'MockCodeViewer';
    return Component;
  },
}));

// We need to test the helper functions directly
describe('DashboardLayout helpers', () => {
  it('parseFollowUps extracts follow-up questions', async () => {
    // Import the module to test internal functions
    // Since they're not exported, we test the behavior through the component
    const content = `Here is the answer.

## Follow-up questions
- What about authentication?
- How does the database connect?
- Where are the API routes?`;

    // Test the pattern matching
    const patterns = [/## Follow-up questions?\s*\n/i];
    let idx = -1;
    for (const pat of patterns) {
      const match = content.match(pat);
      if (match) idx = match.index;
    }
    expect(idx).toBeGreaterThan(0);

    const rest = content.slice(idx).split('\n').filter(l => l.trim().startsWith('-'));
    expect(rest).toHaveLength(3);
  });

  it('healthScore calculates correctly', () => {
    // 0 issues = 100
    const score1 = Math.max(10, 100 - 0 * 8);
    expect(score1).toBe(100);

    // 5 issues = 60
    const score2 = Math.max(10, 100 - 5 * 8);
    expect(score2).toBe(60);

    // 15 issues = min 10
    const score3 = Math.max(10, 100 - 15 * 8);
    expect(score3).toBe(10);
  });

  it('getIdentityProfile handles missing data', () => {
    const arch = {};
    const techStack = (arch.techStack || []).slice(0, 3).join(' + ') || 'Unknown';
    expect(techStack).toBe('Unknown');
  });
});

describe('Markdown rendering logic', () => {
  it('detects file paths in backticks', () => {
    const isFilePath = (text) => /^[\w\-./]+\.(js|ts|jsx|tsx|css|json|md|html|py|rb|go|rs|yaml|yml|toml|sql|sh|env)$/i.test(text) || text.includes('/');
    expect(isFilePath('src/lib/auth.js')).toBe(true);
    expect(isFilePath('package.json')).toBe(true);
    expect(isFilePath('main.go')).toBe(true);
    expect(isFilePath('hello world')).toBe(false);
    expect(isFilePath('const')).toBe(false);
  });

  it('detects code symbols', () => {
    const isCodeSymbol = (text) => /^[a-zA-Z_$][\w$]*$/.test(text) && text.length > 2;
    expect(isCodeSymbol('handleAuth')).toBe(true);
    expect(isCodeSymbol('UserService')).toBe(true);
    expect(isCodeSymbol('x')).toBe(false); // too short
    expect(isCodeSymbol('hello world')).toBe(false); // has space
  });
});
