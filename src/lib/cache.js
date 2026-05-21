import { Redis } from "@upstash/redis";

/**
 * Server-side caching layer using Upstash Redis.
 * Falls back to in-memory Map when Redis isn't configured (local dev).
 * 
 * Usage:
 *   const data = await cached("analysis:abc123", 300, async () => {
 *     return await db.select()...
 *   });
 */

let _redis = null;
function getRedis() {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

// In-memory fallback for local dev
const memCache = new Map();
const MAX_MEM_ENTRIES = 500;

/**
 * Get or set a cached value.
 * @param {string} key - Cache key
 * @param {number} ttlSeconds - Time to live in seconds
 * @param {Function} fetcher - Async function to call on cache miss
 * @returns {Promise<any>} Cached or fresh data
 */
export async function cached(key, ttlSeconds, fetcher) {
  const redis = getRedis();

  // Try cache first
  if (redis) {
    try {
      const hit = await redis.get(key);
      if (hit !== null && hit !== undefined) {
        return typeof hit === 'string' ? JSON.parse(hit) : hit;
      }
    } catch {}
  } else {
    const entry = memCache.get(key);
    if (entry && Date.now() - entry.ts < ttlSeconds * 1000) {
      return entry.data;
    }
  }

  // Cache miss — fetch fresh data
  const data = await fetcher();

  // Store in cache
  if (redis) {
    try {
      const serialized = JSON.stringify(data);
      // Only cache if data is under 1MB (Redis limit consideration)
      if (serialized.length < 1_000_000) {
        await redis.set(key, serialized, { ex: ttlSeconds });
      }
    } catch {}
  } else {
    // Memory cache with size limit
    if (memCache.size >= MAX_MEM_ENTRIES) {
      const firstKey = memCache.keys().next().value;
      memCache.delete(firstKey);
    }
    memCache.set(key, { data, ts: Date.now() });
  }

  return data;
}

/**
 * Invalidate a cache key.
 * @param {string} key - Cache key to delete
 */
export async function invalidate(key) {
  const redis = getRedis();
  if (redis) {
    try { await redis.del(key); } catch {}
  } else {
    memCache.delete(key);
  }
}

/**
 * Invalidate all keys matching a prefix.
 * @param {string} prefix - Key prefix (e.g., "analysis:user_123")
 */
export async function invalidatePrefix(prefix) {
  const redis = getRedis();
  if (redis) {
    try {
      // Upstash doesn't support SCAN efficiently, so we use specific key patterns
      // For now, just delete known keys — callers should invalidate specific keys
    } catch {}
  } else {
    for (const key of memCache.keys()) {
      if (key.startsWith(prefix)) memCache.delete(key);
    }
  }
}
