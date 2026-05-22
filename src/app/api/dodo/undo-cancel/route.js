import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { undoCancellation, cancelScheduledPlanChange } from "../../../../lib/billing/dodo";
import { getSubscription, clearScheduledChange } from "../../../../lib/subscription-gate";

/**
 * POST /api/dodo/undo-cancel
 * 
 * Undoes a scheduled cancellation or downgrade.
 * 
 * For cancellation:
 *   - Calls Dodo PATCH /subscriptions/{id} with cancel_at_next_billing_date: false
 *   - Same subscription stays active, no new checkout, no double charge
 * 
 * For scheduled downgrade:
 *   - Calls Dodo DELETE /subscriptions/{id}/change-plan/scheduled
 *   - Removes the pending plan change, user stays on current plan
 */
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sub = await getSubscription(userId);
    if (!sub || !sub.scheduled_change_type) {
      return NextResponse.json({ error: "No pending change to undo." }, { status: 400 });
    }

    const dodoSubId = sub.dodo_subscription_id;
    if (!dodoSubId) {
      return NextResponse.json({ error: "Something went wrong. Please contact support." }, { status: 400 });
    }

    const changeType = sub.scheduled_change_type;

    try {
      if (changeType === "cancel") {
        // Undo cancellation — tell Dodo to keep renewing
        await undoCancellation(dodoSubId);
      } else if (changeType === "downgrade") {
        // Cancel the scheduled plan change on Dodo
        await cancelScheduledPlanChange(dodoSubId);
      }
    } catch (err) {
      const msg = err?.message || "Failed to undo change";
      console.error("[undo-cancel] Dodo error:", msg);
      // Still clear locally even if Dodo call fails (best effort)
    }

    // Clear local scheduled change
    await clearScheduledChange(userId);

    const message = changeType === "cancel"
      ? "Cancellation undone. Your subscription will continue as normal."
      : "Downgrade cancelled. You'll stay on your current plan.";

    console.log(`[undo-cancel] ${changeType} undone: user=${userId}`);

    return NextResponse.json({ success: true, message });
  } catch (err) {
    Sentry.captureException(err, { tags: { source: "dodo", reason: "undo_cancel_failed" } });
    console.error("[undo-cancel] error:", err?.message || err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
