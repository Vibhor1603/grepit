export function isGitHubAuthConfigured() {
  return Boolean(process.env.GITHUB_ID && process.env.GITHUB_SECRET && process.env.NEXTAUTH_SECRET);
}

export function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY);
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getBaseUrl() {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}
