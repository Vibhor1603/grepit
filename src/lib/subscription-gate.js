import { getDb } from "./db";
import { subscriptions, usage_logs } from "../db/schema";
import { eq, and, gte, count } from "drizzle-orm";
import { getPlan } from "../config/plans";

// ─── Core subscription queries ───

export async function getSubscription(userId) {
  const db = getDb();
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.user_id, userId)).limit(1);
  return rows[0] || null;
}

export async function upsertSubscription(data) {
  const db = getDb();
  const existing = await getSubscription(data.user_id);
  if (existing) {
    const updated = await db.update(subscriptions)
      .set({ ...data, updated_at: new Date().toISOString() })
      .where(eq(subscriptions.user_id, data.user_id))
      .returning();
    return updated[0];
  }
  const inserted = await db.insert(subscriptions).values(data).returning();
  return inserted[0];
}

// ─── Entitlement-based access (source of truth) ───

/**
 * Get the user's current entitled plan.
 * This is the ONLY function that should be used for access control.
 * It checks entitlement_plan + entitlement_ends_at, NOT Razorpay status.
 */
export async function getUserPlan(userId) {
  if (!userId) return "free";
  const sub = await getSubscription(userId);
  if (!sub) return "free";

  // Use entitlement fields if populated (new system)
  if (sub.entitlement_plan && sub.entitlement_plan !== "free" && sub.entitlement_ends_at) {
    const endsAt = new Date(sub.entitlement_ends_at);
    if (endsAt > new Date()) {
      return sub.entitlement_plan;
    }
    // Entitlement expired — apply scheduled change or downgrade to free
    const db = getDb();
    if (sub.scheduled_change_type === "downgrade" && sub.scheduled_change_plan) {
      // Apply the scheduled downgrade
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
      return sub.scheduled_change_plan;
    }
    // No scheduled change — downgrade to free
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
    return "free";
  }

  // Fallback: legacy system (status + plan + current_period_end)
  if (sub.status !== "active" || !sub.plan || sub.plan === "free") return "free";

  if (sub.cancel_at_period_end && sub.current_period_end) {
    const periodEnd = new Date(sub.current_period_end);
    if (periodEnd < new Date()) {
      const db = getDb();
      await db.update(subscriptions)
        .set({ status: "cancelled", plan: "free", entitlement_plan: "free", updated_at: new Date().toISOString() })
        .where(eq(subscriptions.user_id, userId));
      return "free";
    }
  }

  return sub.plan;
}

export async function isUserPro(userId) {
  if (!userId) return false;
  const plan = await getUserPlan(userId);
  return plan === "basic" || plan === "pro";
}

// ─── Entitlement management ───

/**
 * Grant entitlement immediately.
 * Called after successful payment verification.
 */
export async function grantEntitlement(userId, { plan, endsAt, razorpaySubscriptionId, razorpayPaymentId, paymentMethod }) {
  const db = getDb();
  const now = new Date().toISOString();

  await upsertSubscription({
    user_id: userId,
    entitlement_plan: plan,
    entitlement_starts_at: now,
    entitlement_ends_at: endsAt,
    razorpay_subscription_id: razorpaySubscriptionId || null,
    razorpay_payment_id: razorpayPaymentId || null,
    razorpay_status: "active",
    payment_method: paymentMethod || null,
    auto_renew: true,
    // Legacy fields for backward compat
    status: "active",
    plan,
    stripe_subscription_id: razorpaySubscriptionId || null,
    stripe_customer_id: razorpayPaymentId || null,
    stripe_price_id: plan,
    current_period_end: endsAt,
    cancel_at_period_end: false,
    // Clear any scheduled changes
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
      razorpay_status: "active",
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .where(eq(subscriptions.user_id, userId));
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
