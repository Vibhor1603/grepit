// Simple in-memory rate limiter
const rateLimitMap = new Map();

/**
 * Token bucket rate limiter.
 * @param {string} key - Unique identifier (IP, session, etc.)
 * @param {number} maxTokens - Max requests in the window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {{ success: boolean, remaining: number, resetIn: number }}
 */
export function rateLimit(key, maxTokens = 5, windowMs = 60000) {
  const now = Date.now();

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { tokens: maxTokens - 1, lastRefill: now });
    return { success: true, remaining: maxTokens - 1, resetIn: windowMs };
  }

  const bucket = rateLimitMap.get(key);
  const elapsed = now - bucket.lastRefill;
  const refill = Math.floor(elapsed / windowMs) * maxTokens;

  if (refill > 0) {
    bucket.tokens = Math.min(maxTokens, bucket.tokens + refill);
    bucket.lastRefill = now;
  }

  if (bucket.tokens <= 0) {
    const resetIn = windowMs - (now - bucket.lastRefill);
    return { success: false, remaining: 0, resetIn };
  }

  bucket.tokens -= 1;
  return { success: true, remaining: bucket.tokens, resetIn: windowMs - (now - bucket.lastRefill) };
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now - val.lastRefill > 300000) rateLimitMap.delete(key);
  }
}, 60000);
