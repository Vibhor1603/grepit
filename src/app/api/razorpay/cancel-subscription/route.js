import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSubscription, scheduleChange } from "../../../../lib/subscription-gate";
import { saveSubscriptionToMetadata } from "../../../../lib/server-session";
import { sendPlanDowngradeEmail } from "../../../../lib/email";

/**
 * POST /api/razorpay/cancel-subscription
 * 
 * Production cancel flow:
 * 1. Schedule a "cancel" change in our DB (source of truth)
 * 2. DO NOT cancel on Razorpay yet — keep autopay alive
 * 3. Entitlement remains active until period ends
 * 4. At period end, the webhook handler (subscription.charged) will see the
 *    scheduled cancel and actually cancel on Razorpay then.
 * 5. If user undoes cancellation before period end, nothing changes on Razorpay.
 * 
 * This approach means "undo cancel" is just clearing a DB flag — no re-auth needed.
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

    const currentPlan = sub.entitlement_plan || sub.plan;
    if (currentPlan === "free") {
      return NextResponse.json({ error: "No active subscription to cancel" }, { status: 400 });
    }

    const entitlementEndsAt = sub.entitlement_ends_at || sub.current_period_end;

    // Only schedule locally — DO NOT call Razorpay cancel API
    await scheduleChange(userId, {
      type: "cancel",
      targetPlan: "free",
      effectiveAt: entitlementEndsAt,
    });

    // Save to Clerk metadata
    await saveSubscriptionToMetadata(userId, {
      subscriptionStatus: "active",
      plan: currentPlan,
    });

    // Send downgrade email (non-blocking)
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const email = user.emailAddresses?.[0]?.emailAddress;
      if (email) {
        sendPlanDowngradeEmail({
          to: email,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || null,
          previousPlan: currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1),
        }).catch(() => {});
      }
    } catch {}

    console.log("[razorpay/cancel] Scheduled cancellation for user:", userId, "effective_at:", entitlementEndsAt);

    return NextResponse.json({
      success: true,
      currentPeriodEnd: entitlementEndsAt,
    });
  } catch (err) {
    console.error("[razorpay/cancel] error:", err?.message || err);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}
