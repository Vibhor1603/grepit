import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { getDb } from "../../../../lib/db";
import {
  analyses,
  query_history,
  subscriptions,
  usage_logs,
  shared_chats,
  conversations,
  account_deletion_feedback,
} from "../../../../db/schema";
import { eq, sql } from "drizzle-orm";
import { getSubscription } from "../../../../lib/subscription-gate";
import { enforceJsonBodySize } from "../../../../lib/request-security";

const MIN_REASON_LEN = 10;
const MAX_REASON_LEN = 2000;

/**
 * DELETE /api/profile/delete-account
 * Permanently deletes the user and all associated data.
 * Body: { reason: string } — required, stored without PII for product feedback.
 */
export async function DELETE(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const headersList = await headers();
  const bodySizeCheck = enforceJsonBodySize(headersList, 8_192);
  if (!bodySizeCheck.ok) {
    return NextResponse.json({ error: bodySizeCheck.error }, { status: bodySizeCheck.status });
  }

  let reason = "";
  try {
    const body = await request.json();
    reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (reason.length < MIN_REASON_LEN) {
    return NextResponse.json(
      { error: `Please tell us why you're leaving (at least ${MIN_REASON_LEN} characters).` },
      { status: 400 },
    );
  }
  if (reason.length > MAX_REASON_LEN) {
    return NextResponse.json(
      { error: `Reason is too long (max ${MAX_REASON_LEN} characters).` },
      { status: 400 },
    );
  }

  console.log("[delete-account] Initiated by user:", userId);

  try {
    const db = getDb();
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const ownerEmail = user.emailAddresses?.[0]?.emailAddress;

    const sub = await getSubscription(userId);
    const planAtDeletion = sub?.entitlement_plan || sub?.plan || "free";

    await db
      .insert(account_deletion_feedback)
      .values({ reason, plan: planAtDeletion })
      .catch((err) => console.warn("[delete-account] feedback insert:", err.message));

    if (sub) {
      await db
        .update(subscriptions)
        .set({
          status: "cancelled",
          entitlement_plan: "free",
          dodo_status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .where(eq(subscriptions.user_id, userId))
        .catch((err) => console.warn("[delete-account] subscription update:", err.message));
    }

    const userAnalyses = await db
      .select({ id: analyses.id })
      .from(analyses)
      .where(eq(analyses.owner_email, ownerEmail));

    const analysisIds = userAnalyses.map((a) => a.id);

    await db.delete(shared_chats).where(eq(shared_chats.shared_by, userId)).catch(() => {});

    for (const id of analysisIds) {
      await db.execute(sql`DELETE FROM code_embeddings WHERE analysis_id = ${id}`).catch(() => {});
      await db.delete(query_history).where(eq(query_history.analysis_id, id)).catch(() => {});
      await db.delete(conversations).where(eq(conversations.analysis_id, id)).catch(() => {});
    }

    if (ownerEmail) {
      await db.delete(query_history).where(eq(query_history.owner_email, ownerEmail)).catch(() => {});
      await db.delete(conversations).where(eq(conversations.owner_email, ownerEmail)).catch(() => {});
      await db.delete(analyses).where(eq(analyses.owner_email, ownerEmail)).catch(() => {});
    }

    await db.delete(usage_logs).where(eq(usage_logs.user_id, userId)).catch(() => {});
    await db.delete(subscriptions).where(eq(subscriptions.user_id, userId)).catch(() => {});

    await client.users.deleteUser(userId);

    console.log("[delete-account] Successfully deleted user:", userId);

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[delete-account] error:", err.message);
    return NextResponse.json({ error: "Failed to delete account. Contact support." }, { status: 500 });
  }
}
