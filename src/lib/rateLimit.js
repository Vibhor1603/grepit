/**
 * Production-grade rate limiting with multiple layers:
 * 1. IP-based (prevents anonymous abuse)
 * 2. User-based (per authenticated user)
 * 3. Token budget (AI cost control per user per day)
 *
 * Uses in-memory Map with periodic cleanup.
 * For distributed deployments, replace with Upstash Redis.
 */

const store = new Map();
const tokenStore = new Map(); // Daily AI token usage per user

// ── Plan limits ──
export const PLAN_LIMITS = {
  free: {
    analysesPerDay: 3,
    queriesPerHour: 20,
    queriesPerDay: 100,
    diagramsPerHour: 5,
    fileViewsPerHour: 50,
    maxTokensPerDay: 150_000, // ~$0.05 at current AI provider rates
    maxRepoSize: 2000, // max files in repo
  },
  pro: {
    analysesPerDay: 30,
    queriesPerHour: 200,
    queriesPerDay: 2000,
    diagramsPerHour: 50,
    fileViewsPerHour: 500,
    maxTokensPerDay: 2_000_000, // ~$0.60
    maxRepoSize: 10000,
  },
};

/**
 * Sliding-window rate limiter.
 * Returns { success, remaining, resetIn }
 */
export function rateLimit(key, maxTokens = 10, windowMs = 60_000) {
  const now = Date.now();

  if (!store.has(key)) {
    store.set(key, { tokens: maxTokens - 1, windowStart: now });
    return { success: true, remaining: maxTokens - 1, resetIn: windowMs };
  }

  const bucket = store.get(key);
  const elapsed = now - bucket.windowStart;

  if (elapsed >= windowMs) {
    bucket.tokens = maxTokens - 1;
    bucket.windowStart = now;
    return { success: true, remaining: bucket.tokens, resetIn: windowMs };
  }

  if (bucket.tokens <= 0) {
    return { success: false, remaining: 0, resetIn: windowMs - elapsed };
  }

  bucket.tokens -= 1;
  return { success: true, remaining: bucket.tokens, resetIn: windowMs - elapsed };
}

/**
 * Build a rate-limit key preferring userId > email > IP.
 */
export function rateLimitKey(prefix, ip, userId) {
  const identity = userId || ip || "unknown";
  return `${prefix}:${identity}`;
}

/**
 * Track AI token usage per user per day.
 * Returns { allowed, used, limit, remaining }
 */
export function checkTokenBudget(userId, plan = 'free') {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const key = `tokens:${userId}`;
  const now = Date.now();
  const dayMs = 86_400_000;

  if (!tokenStore.has(key)) {
    tokenStore.set(key, { used: 0, dayStart: now });
  }

  const bucket = tokenStore.get(key);

  // Reset daily
  if (now - bucket.dayStart >= dayMs) {
    bucket.used = 0;
    bucket.dayStart = now;
  }

  const remaining = limits.maxTokensPerDay - bucket.used;
  return {
    allowed: remaining > 0,
    used: bucket.used,
    limit: limits.maxTokensPerDay,
    remaining: Math.max(0, remaining),
  };
}

/**
 * Record token usage after an AI call completes.
 */
export function recordTokenUsage(userId, tokensUsed) {
  const key = `tokens:${userId}`;
  const now = Date.now();

  if (!tokenStore.has(key)) {
    tokenStore.set(key, { used: tokensUsed, dayStart: now });
    return;
  }

  const bucket = tokenStore.get(key);
  const dayMs = 86_400_000;

  if (now - bucket.dayStart >= dayMs) {
    bucket.used = tokensUsed;
    bucket.dayStart = now;
  } else {
    bucket.used += tokensUsed;
  }
}

/**
 * IP-based global rate limit (prevents DDoS-style abuse).
 * Much stricter than user-based limits.
 */
export function ipRateLimit(ip) {
  return rateLimit(`ip-global:${ip}`, 60, 60_000); // 60 requests/min per IP
}

/**
 * Get user's plan-based limits for a specific action.
 */
export function getUserLimits(plan = 'free') {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

// Prune stale entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 600_000;
  for (const [key, val] of store) {
    if (val.windowStart < cutoff) store.delete(key);
  }
  // Prune token store entries older than 2 days
  const tokenCutoff = Date.now() - 172_800_000;
  for (const [key, val] of tokenStore) {
    if (val.dayStart < tokenCutoff) tokenStore.delete(key);
  }
}, 300_000);
