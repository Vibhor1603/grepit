/**
 * Sliding-window rate limiter backed by a module-level Map.
 *
 * Keyed by a string you compose — typically `"endpoint:ip"` for anonymous
 * callers or `"endpoint:email"` for authenticated ones so limits are
 * per-user rather than per-IP when a session exists.
 *
 * Returns { success, remaining, resetIn } — same shape as before.
 */

const store = new Map();

export function rateLimit(key, maxTokens = 10, windowMs = 60_000) {
  const now = Date.now();

  if (!store.has(key)) {
    store.set(key, { tokens: maxTokens - 1, windowStart: now });
    return { success: true, remaining: maxTokens - 1, resetIn: windowMs };
  }

  const bucket = store.get(key);
  const elapsed = now - bucket.windowStart;

  // Full window elapsed — reset
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
 * Build a rate-limit key that prefers the authenticated user's email
 * over the raw IP address. This prevents a single user from bypassing
 * limits by rotating IPs, and gives authenticated users their own bucket.
 */
export function rateLimitKey(prefix, ip, ownerEmail) {
  const identity = ownerEmail || ip || "unknown";
  return `${prefix}:${identity}`;
}

// Prune stale entries every 2 minutes
setInterval(() => {
  const cutoff = Date.now() - 300_000;
  for (const [key, val] of store) {
    if (val.windowStart < cutoff) store.delete(key);
  }
}, 120_000);
