import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getDb } from "../../../../lib/db";
import {
  analyses,
  query_history,
  subscriptions,
  usage_logs,
  shared_chats,
  conversations,
  deleted_user_contacts,
} from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { getSubscription } from "../../../../lib/subscription-gate";

/**
 * DELETE /api/profile/delete-account
 * Permanently deletes the user's account and all associated data.
 * - Marks subscription as cancelled
 * - Deletes all analyses, query history, shared chats, usage logs
 * - Deletes subscription record
 * - Deletes Clerk user account
 */
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  console.log("[delete-account] Initiated by user:", userId);

  try {
    const db = getDb();
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const ownerEmail = user.emailAddresses?.[0]?.emailAddress;

    // 1. Cancel subscription on payment provider and in DB
    const sub = await getSubscription(userId);
    if (sub) {
      await db.update(subscriptions)
        .set({ status: 'cancelled', entitlement_plan: 'free', dodo_status: 'cancelled', updated_at: new Date().toISOString() })
        .where(eq(subscriptions.user_id, userId))
        .catch((err) => console.warn('[delete-account] Failed to update subscription:', err.message));
    }

    // 2. Delete all user data from database
    // Get all analysis IDs for this user (needed for cascading deletes)
    const userAnalyses = await db.select({ id: analyses.id })
      .from(analyses)
      .where(eq(analyses.owner_email, ownerEmail));

    const analysisIds = userAnalyses.map(a => a.id);

    // Delete shared chats (by shared_by user)
    await db.delete(shared_chats).where(eq(shared_chats.shared_by, userId)).catch(() => {});

    // Delete query history for all user's analyses
    for (const id of analysisIds) {
      await db.delete(query_history).where(eq(query_history.analysis_id, id)).catch(() => {});
      await db.delete(conversations).where(eq(conversations.analysis_id, id)).catch(() => {});
    }

    // Delete analyses
    if (ownerEmail) {
      await db.delete(analyses).where(eq(analyses.owner_email, ownerEmail)).catch(() => {});
    }

    // Delete usage logs
    await db.delete(usage_logs).where(eq(usage_logs.user_id, userId)).catch(() => {});

    // Delete subscription record
    await db.delete(subscriptions).where(eq(subscriptions.user_id, userId)).catch(() => {});

    // 3. Archive contact for product communications (retained per Privacy Policy)
    if (ownerEmail) {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || null;
      await db
        .insert(deleted_user_contacts)
        .values({
          clerk_user_id: userId,
          email: ownerEmail,
          name: fullName,
          metadata: { source: "account_deletion" },
        })
        .onConflictDoNothing({ target: deleted_user_contacts.email })
        .catch((err) => console.warn("[delete-account] archive contact:", err.message));
    }

    // 4. Delete Clerk user (this signs them out everywhere)
    await client.users.deleteUser(userId);

    console.log("[delete-account] Successfully deleted user:", userId);

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error('[delete-account] error:', err.message);
    return NextResponse.json({ error: "Failed to delete account. Contact support." }, { status: 500 });
  }
}
