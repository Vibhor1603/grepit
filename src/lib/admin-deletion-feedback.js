import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { account_deletion_feedback } from "../db/schema";

const MAX_LIMIT = 500;

export async function listDeletionFeedback({ plan = "all", limit = 100, offset = 0 } = {}) {
  const db = getDb();
  const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
  const safeOffset = Math.max(0, offset);

  const planFilter =
    plan && plan !== "all" ? eq(account_deletion_feedback.plan, plan) : undefined;

  const rowsBase = db
    .select({
      id: account_deletion_feedback.id,
      reason: account_deletion_feedback.reason,
      plan: account_deletion_feedback.plan,
      created_at: account_deletion_feedback.created_at,
    })
    .from(account_deletion_feedback);

  const countBase = db
    .select({ count: sql`count(*)::int` })
    .from(account_deletion_feedback);

  const rowsQuery = planFilter ? rowsBase.where(planFilter) : rowsBase;
  const countQuery = planFilter ? countBase.where(planFilter) : countBase;

  const [rows, countRow] = await Promise.all([
    rowsQuery
      .orderBy(desc(account_deletion_feedback.created_at))
      .limit(safeLimit)
      .offset(safeOffset),
    countQuery,
  ]);

  return {
    feedback: rows,
    total: Number(countRow[0]?.count ?? 0),
    limit: safeLimit,
    offset: safeOffset,
  };
}
