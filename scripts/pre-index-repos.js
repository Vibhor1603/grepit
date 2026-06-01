/**
 * Pre-index suggested repositories.
 * Run this script manually to pre-analyze repos that appear on the landing page.
 * These analyses are stored with owner_email=null (public/shared).
 * When a user clicks a suggested repo, they get an instant clone instead of waiting.
 *
 * Usage: node scripts/pre-index-repos.js
 *
 * Requirements:
 * - The Next.js dev server must be running on localhost:3000
 * - Environment variables must be loaded (the server handles this)
 *
 * After running, update the DB to make analyses public:
 *   UPDATE analyses SET owner_email = NULL
 *   WHERE repo_url IN (...) AND status = 'COMPLETED';
 */

// These must match the suggestedRepos in src/lib/landing-config.js
const SUGGESTED_REPOS = [
  'https://github.com/dubinc/dub',
  'https://github.com/pmndrs/zustand',
  'https://github.com/BerriAI/litellm',
];

async function preIndex() {
  console.log('Pre-indexing suggested repositories...');
  console.log('Make sure the dev server is running on http://localhost:3000\n');

  const results = { success: [], failed: [] };

  for (const repoUrl of SUGGESTED_REPOS) {
    const repoName = repoUrl.split('/').pop();
    console.log(`\n→ Analyzing: ${repoUrl}`);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120_000); // 2 min timeout per repo

      const res = await fetch('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, repoName }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json();
      if (res.ok) {
        console.log(`  ✓ Done: ${data.repo_name} (${data.total_files} files)`);
        results.success.push(repoUrl);
      } else {
        console.log(`  ✗ Failed: ${data.message || data.error}`);
        results.failed.push({ url: repoUrl, reason: data.message || data.error });
      }
    } catch (err) {
      const reason = err.name === 'AbortError' ? 'Timed out (>2 min)' : err.message;
      console.log(`  ✗ Error: ${reason}`);
      results.failed.push({ url: repoUrl, reason });
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`Pre-indexing complete: ${results.success.length} succeeded, ${results.failed.length} failed`);

  if (results.success.length > 0) {
    console.log('\nTo make these analyses public (instant for all users), run this SQL:');
    console.log(`  UPDATE analyses SET owner_email = NULL`);
    console.log(`  WHERE repo_url IN (${results.success.map(u => `'${u}'`).join(', ')})`);
    console.log(`  AND status = 'COMPLETED';`);
  }

  if (results.failed.length > 0) {
    console.log('\nFailed repos:');
    results.failed.forEach(f => console.log(`  - ${f.url}: ${f.reason}`));
  }
}

preIndex();
