import { getDb } from "./db";
import { subscriptions, usage_logs } from "../db/schema";
import { eq, and, gte, count } from "drizzle-orm";
import { getPlan } from "../config/plans";
import { Redis } from "@upstash/redis";

// ─── Redis cache for subscription lookups ───
let _cacheRedis = null;
function getCacheRedis() {
  if (_cacheRedis) return _cacheRedis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _cacheRedis = new Redis({ url, token });
  return _cacheRedis;
}

const SUB_CACHE_TTL = 60; // Cache subscription for 60 seconds
const SUB_CACHE_PREFIX = "sub:";

// ─── In-memory fallback cache for local dev ───
const memCache = new Map();

async function getCachedSubscription(userId) {
  const redis = getCacheRedis();
  if (redis) {
    try {
      const cached = await redis.get(`${SUB_CACHE_PREFIX}${userId}`);
      if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached;
    } catch {}
  } else {
    const entry = memCache.get(userId);
    if (entry && Date.now() - entry.ts < SUB_CACHE_TTL * 1000) return entry.data;
  }
  return null;
}

async function setCachedSubscription(userId, data) {
  const redis = getCacheRedis();
  if (redis) {
    try {
      await redis.set(`${SUB_CACHE_PREFIX}${userId}`, JSON.stringify(data), { ex: SUB_CACHE_TTL });
    } catch {}
  } else {
    memCache.set(userId, { data, ts: Date.now() });
  }
}

export async function invalidateSubscriptionCache(userId) {
  const redis = getCacheRedis();
  if (redis) {
    try { await redis.del(`${SUB_CACHE_PREFIX}${userId}`); } catch {}
  } else {
    memCache.delete(userId);
  }
}

// ─── Core subscription queries ───

export async function getSubscription(userId) {
  if (!userId) return null;
  
  // Check cache first
  const cached = await getCachedSubscription(userId);
  if (cached) return cached;
  
  // Cache miss — query DB
  const db = getDb();
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.user_id, userId)).limit(1);
  const result = rows[0] || null;
  
  // Cache the result
  if (result) await setCachedSubscription(userId, result);
  
  return result;
}

export async function upsertSubscription(data) {
  const db = getDb();
  const existing = await getSubscription(data.user_id);
  
  let result;
  if (existing) {
    const updated = await db.update(subscriptions)
      .set({ ...data, updated_at: new Date().toISOString() })
      .where(eq(subscriptions.user_id, data.user_id))
      .returning();
    result = updated[0];
  } else {
    const inserted = await db.insert(subscriptions).values(data).returning();
    result = inserted[0];
  }
  
  // Invalidate cache after write
  await invalidateSubscriptionCache(data.user_id);
  
  return result;
}

// ─── Entitlement-based access (source of truth) ───

/**
 * Get the user's current entitled plan.
 * This is the ONLY function that should be used for access control.
 * Checks entitlement_plan + entitlement_ends_at.
 */
export async function getUserPlan(userId) {
  if (!userId) return "free";
  const sub = await getSubscription(userId);
  if (!sub) return "free";

  if (sub.entitlement_plan && sub.entitlement_plan !== "free" && sub.entitlement_ends_at) {
    const endsAt = new Date(sub.entitlement_ends_at);
    if (endsAt > new Date()) {
      return sub.entitlement_plan;
    }
    // Entitlement expired — apply scheduled downgrade or revert to free
    const db = getDb();
    if (sub.scheduled_change_type === "downgrade" && sub.scheduled_change_plan) {
      await db.update(subscriptions)
        .set({
          entitlement_plan: sub.scheduled_change_plan,
          plan: sub.scheduled_change_plan,
          scheduled_change_type: null,
          scheduled_change_plan: null,
          scheduled_change_at: null,
          updated_at: new Date().toISOString(),
        })
        .where(eq(subscriptions.user_id, userId));
      await invalidateSubscriptionCache(userId);
      return sub.scheduled_change_plan;
    }
    // No scheduled change — revert to free
    await db.update(subscriptions)
      .set({
        entitlement_plan: "free",
        plan: "free",
        status: "cancelled",
        auto_renew: false,
        scheduled_change_type: null,
        scheduled_change_plan: null,
        scheduled_change_at: null,
        updated_at: new Date().toISOString(),
      })
      .where(eq(subscriptions.user_id, userId));
    await invalidateSubscriptionCache(userId);
    return "free";
  }

  return "free";
}

export async function isUserPro(userId) {
  if (!userId) return false;
  const plan = await getUserPlan(userId);
  return plan === "starter" || plan === "pro";
}

// ─── Entitlement management ───

/**
 * Grant entitlement immediately.
 * Called by the webhook after payment is confirmed.
 */
export async function grantEntitlement(userId, { plan, endsAt, razorpaySubscriptionId: dodoSubscriptionId, razorpayPaymentId: dodoPaymentId, paymentMethod }) {
  const now = new Date().toISOString();

  await upsertSubscription({
    user_id: userId,
    entitlement_plan: plan,
    entitlement_starts_at: now,
    entitlement_ends_at: endsAt,
    dodo_subscription_id: dodoSubscriptionId || null,
    dodo_payment_id: dodoPaymentId || null,
    dodo_status: "active",
    payment_method: paymentMethod || null,
    auto_renew: true,
    status: "active",
    plan,
    current_period_end: endsAt,
    cancel_at_period_end: false,
    scheduled_change_type: null,
    scheduled_change_plan: null,
    scheduled_change_at: null,
  });
}

/**
 * Schedule a future change (downgrade or cancel).
 * User keeps current entitlement until effective_at.
 */
export async function scheduleChange(userId, { type, targetPlan, effectiveAt }) {
  const db = getDb();
  await db.update(subscriptions)
    .set({
      scheduled_change_type: type,
      scheduled_change_plan: targetPlan || "free",
      scheduled_change_at: effectiveAt,
      auto_renew: type === "cancel" ? false : true,
      // Legacy
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .where(eq(subscriptions.user_id, userId));
  await invalidateSubscriptionCache(userId);
}

/**
 * Clear a scheduled change (user changed their mind).
 */
export async function clearScheduledChange(userId) {
  const db = getDb();
  await db.update(subscriptions)
    .set({
      scheduled_change_type: null,
      scheduled_change_plan: null,
      scheduled_change_at: null,
      auto_renew: true,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .where(eq(subscriptions.user_id, userId));
  await invalidateSubscriptionCache(userId);
}

/**
 * Extend entitlement (called on successful renewal via webhook).
 */
export async function extendEntitlement(userId, newEndsAt) {
  const db = getDb();
  await db.update(subscriptions)
    .set({
      entitlement_ends_at: newEndsAt,
      current_period_end: newEndsAt,
      dodo_status: "active",
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .where(eq(subscriptions.user_id, userId));
  await invalidateSubscriptionCache(userId);
}

// ─── Usage tracking ───

export async function logUsage(userId, feature, metadata = {}) {
  const db = getDb();
  await db.insert(usage_logs).values({ user_id: userId, feature, metadata });
}

export async function getFeatureUsageCount(userId, feature, since) {
  const db = getDb();
  const clauses = [
    eq(usage_logs.user_id, userId),
    eq(usage_logs.feature, feature),
  ];
  if (since) {
    clauses.push(gte(usage_logs.created_at, since.toISOString()));
  }
  const result = await db.select({ count: count() }).from(usage_logs).where(and(...clauses));
  return result[0]?.count || 0;
}

export async function getTodaysUsage(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const db = getDb();
  const clauses = [
    eq(usage_logs.user_id, userId),
    gte(usage_logs.created_at, today.toISOString()),
  ];
  const result = await db.select({ count: count() }).from(usage_logs).where(and(...clauses));
  return result[0]?.count || 0;
}

export async function getAiQueryCountToday(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const db = getDb();
  const result = await db.select({ count: count() }).from(usage_logs).where(
    and(
      eq(usage_logs.user_id, userId),
      eq(usage_logs.feature, "ai_query"),
      gte(usage_logs.created_at, today.toISOString()),
    ),
  );
  return result[0]?.count || 0;
}

export async function getAnalysisCount(userId) {
  const db = getDb();
  const result = await db.select({ count: count() }).from(usage_logs).where(
    and(
      eq(usage_logs.user_id, userId),
      eq(usage_logs.feature, "repo_analyze"),
    ),
  );
  return result[0]?.count || 0;
}

export const FREE_LIMITS = getPlan('free');

// ─── Feature gating ───

export async function checkGate(userId, feature) {
  const userPlan = await getUserPlan(userId);
  const plan = getPlan(userPlan);
  
  // Paid plans get through most gates
  if (userPlan !== "free" && feature !== "pdf_export") {
    return { allowed: true, plan: userPlan };
  }

  switch (feature) {
    case "repo_analyze": {
      const usageCount = await getAnalysisCount(userId);
      if (usageCount >= plan.maxRepos) {
        return { allowed: false, plan: userPlan, reason: `You've reached your ${plan.name} plan limit of ${plan.maxRepos} repositories. Upgrade to add more — your existing analyses are still accessible.`, code: "REPO_LIMIT_REACHED" };
      }
      return { allowed: true, plan: userPlan };
    }
    case "ai_query": {
      const usageCount = await getAiQueryCountToday(userId);
      if (usageCount >= plan.maxAiQueriesPerDay) {
        return { allowed: false, plan: userPlan, reason: `You've used all ${plan.maxAiQueriesPerDay} AI queries for today. Resets at midnight.`, code: "QUERY_LIMIT_REACHED" };
      }
      return { allowed: true, plan: userPlan };
    }
    case "pdf_export": {
      if (!plan.pdfExport) {
        return { allowed: false, plan: userPlan, reason: "PDF export is available on Pro and Team plans.", code: "PRO_FEATURE_ONLY" };
      }
      return { allowed: true, plan: userPlan };
    }
    case "private_repo": {
      if (!plan.privateRepos) {
        return { allowed: false, plan: userPlan, reason: "Private repositories require a Pro or Team plan.", code: "PRO_FEATURE_ONLY" };
      }
      return { allowed: true, plan: userPlan };
    }
    case "reanalyze": {
      if (userPlan !== "free") return { allowed: true, plan: userPlan };
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const reanalyzeCount = await getFeatureUsageCount(userId, "reanalyze", weekAgo);
      if (reanalyzeCount >= 1) {
        return { allowed: false, plan: userPlan, reason: "Free plan allows 1 re-analysis per week. Upgrade for unlimited.", code: "REANALYZE_LIMIT_REACHED" };
      }
      return { allowed: true, plan: userPlan };
    }
    case "chat_share": {
      if (userPlan !== "free") return { allowed: true, plan: userPlan };
      const shareCount = await getFeatureUsageCount(userId, "chat_share", null);
      if (shareCount >= 2) {
        return { allowed: false, plan: userPlan, reason: "Free plan allows 2 shared chats. Upgrade for unlimited sharing.", code: "SHARE_LIMIT_REACHED" };
      }
      return { allowed: true, plan: userPlan };
    }
    default:
      return { allowed: true, plan: userPlan };
  }
}
