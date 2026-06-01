const ONBOARDING_CHIP = "Guide me through something";
const NEW_HERE_CHIP = "I'm new here";

/**
 * Returns 4 chat suggestion chips: onboarding + new-here (fixed), then 2 repo-specific.
 */
export function buildChatSuggestions(analysis) {
  const fixed = [NEW_HERE_CHIP, ONBOARDING_CHIP];

  if (!analysis) {
    return [...fixed, "Show architecture diagram", "Explain the tech stack"];
  }

  const repoName = analysis.repo_name || "this repo";
  const arch = analysis.architecture || analysis.results || {};
  const tree = analysis.file_tree || [];
  const hasApi = (arch.apiEndpoints || []).length > 0;
  const hasAuth = tree.some((f) => /auth|login|session|middleware/i.test(f.path));
  const hasDb = tree.some((f) => /database|schema|model|migration|drizzle|prisma/i.test(f.path));
  const hasConfig = tree.some((f) => /config|\.env|docker|readme/i.test(f.path));
  const hasFrontend = tree.some((f) => /components?\/|pages\/|app\//i.test(f.path));
  const hasML = tree.some((f) => /model|train|inference|pipeline/i.test(f.path));
  const hasTests = tree.some((f) => /test|spec|__test/i.test(f.path));

  const primaryFlow = arch.flowPaths?.[0]?.name;
  const primaryCapability = arch.mainCapabilities?.[0];
  const techStack = arch.techStack?.slice?.(0, 2)?.join(", ");

  const candidates = [];

  if (hasApi) {
    candidates.push({ score: 10, text: `How do the ${repoName} API routes work?` });
  }
  if (hasAuth) {
    candidates.push({ score: 9, text: "Walk me through the auth flow" });
  }
  if (primaryFlow) {
    candidates.push({ score: 9, text: `Trace the ${primaryFlow} flow` });
  }
  if (hasDb) {
    candidates.push({ score: 8, text: "Explain the data model" });
  }
  if (primaryCapability) {
    const cap = primaryCapability.length > 42
      ? `${primaryCapability.slice(0, 39).trim()}…`
      : primaryCapability;
    candidates.push({ score: 8, text: `How does ${cap} work?` });
  }
  if (hasML) {
    candidates.push({ score: 8, text: "Explain the ML pipeline" });
  }
  if (techStack) {
    candidates.push({ score: 7, text: `Explain the ${techStack} stack` });
  }
  if (hasConfig) {
    candidates.push({ score: 7, text: "How do I run this locally?" });
  }
  if (hasFrontend && !hasApi) {
    candidates.push({ score: 6, text: "How is the UI structured?" });
  }
  if (hasTests) {
    candidates.push({ score: 5, text: "What's the test coverage like?" });
  }

  candidates.push({ score: 4, text: "Show architecture diagram" });
  candidates.push({ score: 3, text: `What does ${repoName} do?` });
  candidates.push({ score: 2, text: `How is ${repoName} structured?` });

  candidates.sort((a, b) => b.score - a.score);

  const dynamic = [];
  const seen = new Set(fixed.map((c) => c.toLowerCase()));

  for (const { text } of candidates) {
    if (dynamic.length >= 2) break;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    dynamic.push(text);
  }

  while (dynamic.length < 2) {
    const fallback = dynamic.length === 0 ? "Show architecture diagram" : `How is ${repoName} structured?`;
    if (!seen.has(fallback.toLowerCase())) {
      dynamic.push(fallback);
      seen.add(fallback.toLowerCase());
    } else break;
  }

  return [...fixed, ...dynamic.slice(0, 2)];
}

export { NEW_HERE_CHIP, ONBOARDING_CHIP };
