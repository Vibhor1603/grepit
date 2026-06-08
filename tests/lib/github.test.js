import { describe, it, expect } from 'vitest';
import { normalizeGitHubRepoUrl } from '@/lib/github';

describe('GitHub Lib - URL Normalization', () => {
  it('normalizes standard GitHub URLs', () => {
    const urls = [
      'https://github.com/owner/repo',
      'https://github.com/owner/repo.git',
      'https://github.com/owner/repo/',
      ' https://github.com/owner/repo ',
    ];

    for (const url of urls) {
      const { owner, repo, repoPath, repoUrl } = normalizeGitHubRepoUrl(url);
      expect(owner).toBe('owner');
      expect(repo).toBe('repo');
      expect(repoPath).toBe('owner/repo');
      expect(repoUrl).toBe('https://github.com/owner/repo');
    }
  });

  it('handles repos with dots and hyphens', () => {
    const { owner, repo } = normalizeGitHubRepoUrl('https://github.com/my-org/my.cool-repo');
    expect(owner).toBe('my-org');
    expect(repo).toBe('my.cool-repo');
  });

  it('throws on invalid URLs', () => {
    const invalid = [
      'https://github.com/owner',
      'https://gitlab.com/owner/repo',
      'not a url',
      '',
    ];

    for (const url of invalid) {
      expect(() => normalizeGitHubRepoUrl(url)).toThrow();
    }
  });
});
