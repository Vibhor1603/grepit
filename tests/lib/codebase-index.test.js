import { describe, it, expect } from 'vitest';
import { queryCodebase } from '../../src/lib/codebase-index';

const mockAnalysis = {
  repo_name: 'test-repo',
  file_tree: [
    { path: 'src/auth.js', type: 'blob' },
    { path: 'src/api/routes.js', type: 'blob' },
    { path: 'src/db/schema.js', type: 'blob' },
  ],
  results: {
    files: [
      { path: 'src/auth.js', summary: 'Authentication module', functions: [{ name: 'login' }, { name: 'logout' }], imports: ['bcrypt', 'jwt'] },
      { path: 'src/api/routes.js', summary: 'API route definitions', functions: [{ name: 'handleGet' }], imports: ['express'] },
      { path: 'src/db/schema.js', summary: 'Database schema', classes: [{ name: 'UserModel' }], imports: ['mongoose'] },
    ],
    dependencyGraph: [],
    callGraph: [],
  },
  architecture: { techStack: ['Node.js', 'Express'] },
};

describe('queryCodebase', () => {
  it('returns file matches for relevant queries', () => {
    const result = queryCodebase(mockAnalysis, 'authentication login', { maxFiles: 5, maxSymbols: 5, maxGraphDepth: 1 });
    expect(result.fileMatches).toBeDefined();
    expect(result.fileMatches.length).toBeGreaterThan(0);
    expect(result.fileMatches[0].path).toBe('src/auth.js');
  });

  it('returns symbol matches', () => {
    const result = queryCodebase(mockAnalysis, 'login function', { maxFiles: 5, maxSymbols: 5, maxGraphDepth: 1 });
    expect(result.symbolMatches).toBeDefined();
  });

  it('handles empty queries gracefully', () => {
    const result = queryCodebase(mockAnalysis, '', { maxFiles: 5, maxSymbols: 5, maxGraphDepth: 1 });
    expect(result).toBeDefined();
    expect(result.fileMatches).toBeDefined();
  });

  it('handles missing analysis data', () => {
    const result = queryCodebase({ repo_name: 'empty', results: {}, file_tree: [] }, 'test', { maxFiles: 5, maxSymbols: 5, maxGraphDepth: 1 });
    expect(result).toBeDefined();
  });
});
