import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cancelSubscription } from "../../../../lib/billing/dodo";
import { getSubscription, getUserPlan, scheduleChange } from "../../../../lib/subscription-gate";

/**
 * POST /api/dodo/cancel
 * 
 * Cancels subscription at end of billing period.
 * - Calls Dodo PATCH /subscriptions/{id} with cancel_at_next_billing_date: true
 * - User keeps access until current_period_end
 * - Dodo stops renewal automatically
 * - Webhook (subscription.cancelled) fires when period actually ends
 */
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sub = await getSubscription(userId);
    const currentPlan = await getUserPlan(userId);

    if (!sub || currentPlan === "free") {
      return NextResponse.json({ error: "No active subscription to cancel." }, { status: 400 });
    }

    const dodoSubId = sub.razorpay_subscription_id;
    if (!dodoSubId) {
      return NextResponse.json({ error: "Subscription ID not found. Contact support." }, { status: 400 });
    }

    // Tell Dodo to cancel at next billing date
    try {
      await cancelSubscription(dodoSubId);
    } catch (err) {
      const msg = err?.message || "Cancellation failed";
      console.error("[cancel] Dodo error:", msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    // Record locally for UI
    const effectiveAt = sub.entitlement_ends_at || sub.current_period_end || new Date(Date.now() + 30 * 86400000).toISOString();
    await scheduleChange(userId, { type: "cancel", targetPlan: "free", effectiveAt });

    console.log(`[cancel] Scheduled: user=${userId}, effective=${effectiveAt}`);

    return NextResponse.json({
      success: true,
      currentPeriodEnd: effectiveAt,
      message: `Subscription will cancel at end of billing period.`,
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { source: "dodo", reason: "cancel_failed" } });
    console.error("[cancel] error:", err?.message || err);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}
