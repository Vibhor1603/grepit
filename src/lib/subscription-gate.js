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
  return sub?.plan === "pro" && sub?.status === "active";
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
  const isPro = await isUserPro(userId);
  const plan = getPlan(isPro ? 'pro' : 'free');
  if (isPro) return { allowed: true, plan: "pro" };

  switch (feature) {
    case "repo_analyze": {
      const usageCount = await getAnalysisCount(userId);
      if (usageCount >= plan.maxRepos) {
        return { allowed: false, plan: "free", reason: `Free plan allows ${plan.maxRepos} repos. Upgrade to Pro for more.`, code: "REPO_LIMIT_REACHED" };
      }
      return { allowed: true, plan: "free" };
    }
    case "ai_query": {
      const usageCount = await getAiQueryCountToday(userId);
      if (usageCount >= plan.maxAiQueriesPerDay) {
        return { allowed: false, plan: "free", reason: `You've used all ${plan.maxAiQueriesPerDay} AI queries for today. Resets at midnight.`, code: "QUERY_LIMIT_REACHED" };
      }
      return { allowed: true, plan: "free" };
    }
    case "pdf_export": {
      if (!plan.pdfExport) {
        return { allowed: false, plan: "free", reason: "PDF export is a Pro feature.", code: "PRO_FEATURE_ONLY" };
      }
      return { allowed: true, plan: "free" };
    }
    default:
      return { allowed: true, plan: "free" };
  }
}
