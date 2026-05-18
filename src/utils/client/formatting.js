// Utils: client/formatting — extracted from src/components/DashboardLayout.jsx

/**
 * Parses follow-up questions from AI response content.
 * Splits the response into the main body and an array of follow-up question strings.
 *
 * @param {string} content - The full AI response text
 * @returns {{ body: string, followUps: string[] }} Parsed body and follow-up questions
 */
export function parseFollowUps(content) {
  const patterns = [
    /## Follow-up questions?.*\n/i,
    /## Follow-up\s*\n/i,
    /\*\*Follow-up questions?.*\*\*\s*\n/i,
    /\*\*Follow-up questions?[^*]*\n/i,
    /\*\*Follow-up:?\*\*\s*\n/i,
    /Follow-up questions?:?\s*\n/i,
    /### Follow-up.*\n/i,
    /#{1,3}\s*Follow[\s-]?up.*\n/i,
  ];
  let idx = -1;
  let matchLen = 0;
  for (const pat of patterns) {
    const match = content.match(pat);
    if (match && match.index !== undefined) {
      const pos = match.index;
      if (idx === -1 || pos > idx) { idx = pos; matchLen = match[0].length; }
    }
  }
  if (idx === -1) return { body: content, followUps: [] };
  const body = content.slice(0, idx).replace(/---\s*$/, '').trim();
  const rest = content.slice(idx + matchLen);
  const followUps = rest.split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('-') || l.startsWith('*') || /^\d+\./.test(l))
    .map(l => l.replace(/^[\s\-*\d.]+/, '').replace(/^\[|\]$/g, '').replace(/\?$/, '?').trim())
    .filter(l => l.length > 5)
    .slice(0, 3);
  return { body, followUps };
}

/**
 * Computes a health score for an analysis based on security issues found.
 * Score ranges from 10 to 100, penalizing 8 points per security issue.
 *
 * @param {object} a - The analysis object
 * @returns {number} Health score between 10 and 100
 */
export function healthScore(a) {
  const arch = a?.architecture || {};
  return Math.max(
    10,
    100 - ((arch.securityIssues || []).length + (a?.results?.security?.hardcodedSecrets || []).length) * 8
  );
}

/**
 * Extracts an identity profile (tech stack, storage, runtime) from an analysis object.
 *
 * @param {object} a - The analysis object
 * @returns {{ techStack: string, storage: string, runtime: string }} Identity profile
 */
export function getIdentityProfile(a) {
  const arch = a?.architecture || a?.results || {};
  return {
    techStack: (arch.techStack || []).slice(0, 3).join(' + ') || 'Unknown',
    storage: arch.storage || arch.database || 'Not detected',
    runtime: arch.runtime || 'Not detected',
  };
}

/**
 * Returns the top high-traffic files from an analysis (files with high complexity or line count).
 * Returns null if no qualifying files are found.
 *
 * @param {object} a - The analysis object
 * @returns {string[] | null} Array of file names or null
 */
export function getHighTrafficFiles(a) {
  const f = (a?.results?.files || [])
    .filter(f => f.complexity > 5 || f.lineCount > 100)
    .sort((a, b) => (b.complexity || 0) - (a.complexity || 0))
    .slice(0, 3)
    .map(f => f.path.split('/').pop());
  return f.length > 0 ? f : null;
}
