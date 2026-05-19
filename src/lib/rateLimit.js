/**
 * Production-grade distributed rate limiting using Upstash Redis.
 * 
 * Layers:
 * 1. IP-based global limit (prevents DDoS/anonymous abuse)
 * 2. User-based per-action limits (tied to plan)
 * 3. Token budget tracking (AI cost control per user per day)
 * 
 * Falls back to in-memory when UPSTASH_REDIS_REST_URL is not set (local dev).
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getPlanRateLimit } from "../config/plans";

// ── Redis client (singleton) ──
let _redis = null;
function getRedis() {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

// ── In-memory fallback for local dev ──
const memStore = new Map();
const MEM_CLEANUP_INTERVAL = 300_000; // 5 min

function memRateLimit(key, maxRequests, windowMs) {
  const now = Date.now();
  if (!memStore.has(key)) {
    memStore.set(key, { count: 1, windowStart: now });
    return { success: true, remaining: maxRequests - 1, resetIn: windowMs };
  }
  const bucket = memStore.get(key);
  if (now - bucket.windowStart >= windowMs) {
    bucket.count = 1;
    bucket.windowStart = now;
    return { success: true, remaining: maxRequests - 1, resetIn: windowMs };
  }
  if (bucket.count >= maxRequests) {
    return { success: false, remaining: 0, resetIn: windowMs - (now - bucket.windowStart) };
  }
  bucket.count++;
  return { success: true, remaining: maxRequests - bucket.count, resetIn: windowMs - (now - bucket.windowStart) };
}

// Periodic cleanup for in-memory store
if (typeof globalThis !== "undefined") {
  if (!globalThis.__rateLimitCleanup) {
    globalThis.__rateLimitCleanup = setInterval(() => {
      const cutoff = Date.now() - 600_000;
      for (const [key, val] of memStore) {
        if (val.windowStart < cutoff) memStore.delete(key);
      }
    }, MEM_CLEANUP_INTERVAL);
  }
}

// ── Upstash rate limiter cache (keyed by window config) ──
const limiterCache = new Map();

function getUpstashLimiter(prefix, maxRequests, windowMs) {
  const redis = getRedis();
  if (!redis) return null;

  const cacheKey = `${prefix}:${maxRequests}:${windowMs}`;
  if (limiterCache.has(cacheKey)) return limiterCache.get(cacheKey);

  // Convert windowMs to Upstash duration string
  let window;
  if (windowMs >= 86_400_000) window = `${Math.round(windowMs / 86_400_000)} d`;
  else if (windowMs >= 3_600_000) window = `${Math.round(windowMs / 3_600_000)} h`;
  else if (windowMs >= 60_000) window = `${Math.round(windowMs / 60_000)} m`;
  else window = `${Math.round(windowMs / 1000)} s`;

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, window),
    prefix: `rl:${prefix}`,
    analytics: true,
  });

  limiterCache.set(cacheKey, limiter);
  return limiter;
}

// ── Public API ──

/**
 * Rate limit a request. Uses Upstash Redis in production, in-memory in dev.
 * 
 * @param {string} key - Unique identifier (e.g., "stream:user_123")
 * @param {number} maxRequests - Max requests allowed in window
 * @param {number} windowMs - Window duration in milliseconds
 * @returns {Promise<{success: boolean, remaining: number, resetIn: number}>}
 */
export async function rateLimit(key, maxRequests = 10, windowMs = 60_000) {
  const prefix = key.split(":")[0] || "global";
  const limiter = getUpstashLimiter(prefix, maxRequests, windowMs);

  if (!limiter) {
    // Fallback to in-memory (local dev)
    return memRateLimit(key, maxRequests, windowMs);
  }

  try {
    const result = await limiter.limit(key);
    return {
      success: result.success,
      remaining: result.remaining,
      resetIn: result.reset ? result.reset - Date.now() : windowMs,
    };
  } catch (err) {
    // If Redis is down, fail open (allow request) but log
    console.warn("[rateLimit] Upstash error, failing open:", err.message);
    return { success: true, remaining: maxRequests, resetIn: windowMs };
  }
}

/**
 * Build a rate-limit key preferring userId > email > IP.
 */
export function rateLimitKey(prefix, ip, userId) {
  const identity = userId || ip || "unknown";
  return `${prefix}:${identity}`;
}

/**
 * IP-based global rate limit (prevents DDoS-style abuse).
 * 120 requests/min per IP — strict enough to stop abuse, loose enough for normal use.
 */
export async function ipRateLimit(ip) {
  return rateLimit(`ip-global:${ip}`, 120, 60_000);
}

/**
 * Plan-aware rate limit for a specific action.
 * Reads limits from the centralized plans config.
 * 
 * @param {string} action - Action name (analyze, query, stream, diagram, file)
 * @param {string} userId - User identifier
 * @param {string} planName - Plan name (free, pro, team)
 * @returns {Promise<{success: boolean, remaining: number, resetIn: number}>}
 */
export async function planRateLimit(action, userId, planName = "free") {
  const { max, windowMs } = getPlanRateLimit(planName, action);
  return rateLimit(`${action}:${userId}`, max, windowMs);
}

// ── Token budget tracking (uses Redis INCRBY with TTL) ──

/**
 * Check if user has remaining token budget for AI calls.
 * Uses Redis with daily TTL for automatic reset.
 */
export async function checkTokenBudget(userId, maxTokensPerDay) {
  const redis = getRedis();
  const key = `tokens:${userId}`;

  if (!redis) {
    // In-memory fallback
    const now = Date.now();
    const dayMs = 86_400_000;
    if (!memStore.has(key)) {
      memStore.set(key, { used: 0, dayStart: now });
    }
    const bucket = memStore.get(key);
    if (now - bucket.dayStart >= dayMs) {
      bucket.used = 0;
      bucket.dayStart = now;
    }
    return {
      allowed: bucket.used < maxTokensPerDay,
      used: bucket.used,
      limit: maxTokensPerDay,
      remaining: Math.max(0, maxTokensPerDay - bucket.used),
    };
  }

  try {
    const used = (await redis.get(key)) || 0;
    return {
      allowed: used < maxTokensPerDay,
      used: Number(used),
      limit: maxTokensPerDay,
      remaining: Math.max(0, maxTokensPerDay - Number(used)),
    };
  } catch {
    return { allowed: true, used: 0, limit: maxTokensPerDay, remaining: maxTokensPerDay };
  }
}

/**
 * Record token usage after an AI call completes.
 * Increments the daily counter with a 24h TTL.
 */
export async function recordTokenUsage(userId, tokensUsed) {
  const redis = getRedis();
  const key = `tokens:${userId}`;

  if (!redis) {
    // In-memory fallback
    if (!memStore.has(key)) {
      memStore.set(key, { used: tokensUsed, dayStart: Date.now() });
    } else {
      memStore.get(key).used += tokensUsed;
    }
    return;
  }

  try {
    const pipeline = redis.pipeline();
    pipeline.incrby(key, tokensUsed);
    pipeline.expire(key, 86400); // 24h TTL — auto-resets daily
    await pipeline.exec();
  } catch (err) {
    console.warn("[recordTokenUsage] Redis error:", err.message);
  }
}

// ── Response cache (for repeated identical queries) ──

/**
 * Get a cached response for a query.
 * Used to avoid re-running expensive AI calls for identical questions.
 */
export async function getCachedResponse(cacheKey) {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get(`cache:${cacheKey}`);
  } catch {
    return null;
  }
}

/**
 * Cache a response with TTL.
 * @param {string} cacheKey - Unique cache key
 * @param {string} value - Response to cache
 * @param {number} ttlSeconds - Time to live in seconds (default 1 hour)
 */
export async function setCachedResponse(cacheKey, value, ttlSeconds = 3600) {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(`cache:${cacheKey}`, value, { ex: ttlSeconds });
  } catch (err) {
    console.warn("[setCachedResponse] Redis error:", err.message);
  }
}

/**
 * Generate a cache key from query parameters.
 */
export function buildCacheKey(analysisId, query) {
  // Simple hash — good enough for cache keys
  const str = `${analysisId}:${query.trim().toLowerCase().slice(0, 200)}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `q:${Math.abs(hash).toString(36)}`;
}
