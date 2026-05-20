import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSubscription, clearScheduledChange } from "../../../../lib/subscription-gate";
import { getRazorpay } from "../../../../lib/razorpay";

/**
 * POST /api/razorpay/undo-cancel
 * 
 * Undoes a scheduled cancellation. Since we never cancelled on Razorpay
 * (autopay is still active), this is just clearing a DB flag.
 * Nothing changes on Razorpay's side — subscription continues as normal.
 */
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sub = await getSubscription(userId);
    if (!sub) {
      return NextResponse.json({ error: "No subscription found" }, { status: 400 });
    }

    if (!sub.scheduled_change_type) {
      return NextResponse.json({ error: "No pending change to undo" }, { status: 400 });
    }

    // Clear the scheduled change in our DB
    await clearScheduledChange(userId);

    // If there's a pending plan change on Razorpay, cancel it too
    const razorpaySubId = sub.razorpay_subscription_id || sub.stripe_subscription_id;
    if (razorpaySubId) {
      try {
        const razorpay = getRazorpay();
        const rzpSub = await razorpay.subscriptions.fetch(razorpaySubId);
        if (rzpSub.has_scheduled_changes) {
          await razorpay.subscriptions.cancelScheduledChanges(razorpaySubId);
          console.log(`[razorpay/undo-cancel] Cancelled scheduled changes on Razorpay: ${razorpaySubId}`);
        }
      } catch (err) {
        console.warn("[razorpay/undo-cancel] Could not cancel Razorpay scheduled changes:", err?.error?.description || err?.message);
        // Not critical — our DB is source of truth
      }
    }

    console.log(`[razorpay/undo-cancel] Scheduled change undone for user: ${userId}`);

    return NextResponse.json({
      success: true,
      message: "Cancellation undone. Your subscription will continue as normal.",
    });
  } catch (err) {
    console.error("[razorpay/undo-cancel] error:", err?.message || err);
    return NextResponse.json({ error: "Failed to undo cancellation" }, { status: 500 });
  }
}
