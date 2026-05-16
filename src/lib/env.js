export function isGitHubAuthConfigured() {
  return Boolean(process.env.GITHUB_ID && process.env.GITHUB_SECRET && process.env.NEXTAUTH_SECRET);
}

export function isAIConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY);
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabaseUrl() {
  return process.env.DATABASE_URL || "";
}

export function getBaseUrl() {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}
