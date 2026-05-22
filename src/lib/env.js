export function isGitHubAuthConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
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
  // Priority: explicit app URL → Vercel production URL → localhost
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

// ── Environment helpers ────────────────────────────────────────────────────
// APP_ENV accepts "dev" or "prod".
// Set in .env.local or your deployment platform (Vercel env vars, etc.)

export function getAppEnv() {
  return process.env.NEXT_PUBLIC_APP_ENV || "dev";
}

export function isProduction() {
  return getAppEnv() === "prod";
}

export function isDevelopment() {
  return getAppEnv() === "dev";
}

// Sentry reports errors only when APP_ENV=prod
export function isSentryEnabled() {
  return isProduction();
}