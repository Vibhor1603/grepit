import { getDb } from "./db";
import { subscriptions, usage_logs } from "../db/schema";
import { eq, and, gte, count } from "drizzle-orm";
import { getPlan } from "../config/plans";

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

export async function isUserPro(userId) {
  if (!userId) return false;
  const sub = await getSubscription(userId);
  return sub?.status === "active" && (sub?.plan === "pro" || sub?.plan === "team");
}

/**
 * Get the user's current plan name.
 */
export async function getUserPlan(userId) {
  if (!userId) return "free";
  const sub = await getSubscription(userId);
  if (sub?.status === "active" && sub?.plan) return sub.plan;
  return "free";
}

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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
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
      // Free users: 1 re-analysis per repo per week
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
      // Free users: 2 shared chats total
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
