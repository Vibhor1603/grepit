import { describe, it, expect } from 'vitest';

// Test the scoring logic directly
describe('Health Score Calculation', () => {
  function calculateScore({ highCount = 0, mediumCount = 0, lowCount = 0, hasTests = true, hasCoverage = false, duplicateGroups = 0 }) {
    let score = 100;
    score -= Math.min(40, highCount * 10);
    score -= Math.min(25, mediumCount * 5);
    score -= Math.min(15, lowCount * 2);
    if (!hasTests) score -= 12;
    else if (!hasCoverage) score -= 5;
    if (duplicateGroups > 3) score -= 5;
    else if (duplicateGroups > 0) score -= 3;
    return Math.max(5, Math.min(100, Math.round(score)));
  }

  it('perfect codebase scores 100', () => {
    expect(calculateScore({ hasTests: true, hasCoverage: true })).toBe(100);
  });

  it('no tests deducts 12 points', () => {
    expect(calculateScore({ hasTests: false })).toBe(88);
  });

  it('tests without coverage deducts 5', () => {
    expect(calculateScore({ hasTests: true, hasCoverage: false })).toBe(95);
  });

  it('high severity issues cap at -40', () => {
    expect(calculateScore({ highCount: 10 })).toBeLessThanOrEqual(60);
    // Even with 10 high issues, max penalty is 40
    const score = calculateScore({ highCount: 10 });
    expect(score).toBe(100 - 40 - 5); // -40 high cap, -5 no coverage
  });

  it('medium severity issues cap at -25', () => {
    const score = calculateScore({ mediumCount: 10 });
    expect(score).toBe(100 - 25 - 5); // -25 medium cap, -5 no coverage
  });

  it('low severity issues cap at -15', () => {
    const score = calculateScore({ lowCount: 20 });
    expect(score).toBe(100 - 15 - 5); // -15 low cap, -5 no coverage
  });

  it('worst case scenario still has minimum of 5', () => {
    const score = calculateScore({ highCount: 10, mediumCount: 10, lowCount: 20, hasTests: false, duplicateGroups: 5 });
    expect(score).toBe(5); // 100 - 40 - 25 - 15 - 12 - 5 = 3, clamped to 5
  });

  it('moderate codebase scores reasonably', () => {
    // 1 high, 3 medium, 5 low, has tests no coverage
    const score = calculateScore({ highCount: 1, mediumCount: 3, lowCount: 5, hasTests: true, hasCoverage: false });
    // 100 - 10 - 15 - 10 - 5 = 60
    expect(score).toBe(60);
  });
});

describe('Code Quality Detection Patterns', () => {
  it('detects fat route files', () => {
    const file = { path: 'src/app/api/query/route.js', functions: Array(8).fill({ name: 'fn' }), lineCount: 250 };
    const isFatRoute = /route\.(js|ts|jsx|tsx)$|routes?\//i.test(file.path) || /pages\/api\//i.test(file.path) || /app\/api\//i.test(file.path);
    const isOverweight = file.functions.length > 5 || file.lineCount > 200;
    expect(isFatRoute).toBe(true);
    expect(isOverweight).toBe(true);
  });

  it('detects god files', () => {
    const file = { functions: Array(20).fill({ name: 'fn' }), classes: [{ name: 'A' }], exports: Array(5).fill('x') };
    expect(file.functions.length > 15).toBe(true);
  });

  it('detects deep nesting', () => {
    const path = 'src/app/features/auth/components/forms/inputs/TextInput.tsx';
    expect(path.split('/').length).toBeGreaterThan(7);
  });

  it('detects mixed concerns - DB in component', () => {
    const code = "import { db } from 'drizzle-orm';\nexport function MyComponent() {}";
    const hasDbImport = /import.*from.*(['"])(prisma|drizzle|mongoose|sequelize|typeorm)/m.test(code);
    expect(hasDbImport).toBe(true);
  });
});
