import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSubscription, grantEntitlement, scheduleChange } from "../../../../lib/subscription-gate";
import { updateLsSubscription, getLsVariantId, getLsSubscription } from "../../../../lib/lemonsqueezy";

const PLAN_ORDER = { free: 0, basic: 1, pro: 2 };

/**
 * POST /api/lemonsqueezy/change-plan
 * 
 * Handles plan changes for LemonSqueezy subscribers.
 * 
 * Upgrade (basic → pro):
 *   - Calls LS Update Subscription API with new variant
 *   - LS handles proration automatically (charges difference immediately)
 *   - We grant entitlement immediately
 * 
 * Downgrade (pro → basic):
 *   - Calls LS Update Subscription API with new variant
 *   - LS applies at next renewal (no immediate refund)
 *   - We schedule the change in our DB
 */
export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { plan: targetPlan } = body;

    if (!targetPlan || !["basic", "pro"].includes(targetPlan)) {
      return NextResponse.json({ error: "Invalid plan. Choose 'basic' or 'pro'." }, { status: 400 });
    }

    const targetVariantId = getLsVariantId(targetPlan);
    if (!targetVariantId) {
      return NextResponse.json({ error: `${targetPlan} plan is not configured for LemonSqueezy.` }, { status: 500 });
    }

    // Get current subscription
    const existing = await getSubscription(userId);
    const currentPlan = existing?.entitlement_plan || existing?.plan || "free";

    if (currentPlan === "free") {
      return NextResponse.json({ error: "No active subscription. Use the subscribe flow instead." }, { status: 400 });
    }
    if (currentPlan === targetPlan) {
      return NextResponse.json({ error: `You're already on the ${targetPlan} plan.` }, { status: 400 });
    }

    // Get the LS subscription ID (stored with ls_ prefix)
    const lsSubId = existing.razorpay_subscription_id;
    if (!lsSubId || !lsSubId.startsWith("ls_")) {
      return NextResponse.json({ error: "No LemonSqueezy subscription found. Contact support." }, { status: 400 });
    }

    const actualLsId = lsSubId.replace("ls_", "");
    const isUpgrade = PLAN_ORDER[targetPlan] > PLAN_ORDER[currentPlan];

    try {
      // Call LS Update Subscription API
      // LS handles proration: upgrades charge difference immediately, downgrades apply at renewal
      await updateLsSubscription(actualLsId, targetVariantId);
    } catch (err) {
      const errorMsg = err?.message || "Failed to update subscription on LemonSqueezy";
      Sentry.captureException(err, {
        level: "error",
        tags: { source: "lemonsqueezy", reason: "plan_change_failed" },
        extra: { userId, currentPlan, targetPlan, lsSubId: actualLsId },
      });
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    if (isUpgrade) {
      // Upgrade: LS charges prorated difference immediately, grant entitlement now
      let newEndsAt = existing.entitlement_ends_at;
      try {
        const updatedSub = await getLsSubscription(actualLsId);
        if (updatedSub?.attributes?.renews_at) {
          newEndsAt = new Date(updatedSub.attributes.renews_at).toISOString();
        }
      } catch {}

      await grantEntitlement(userId, {
        plan: targetPlan,
        endsAt: newEndsAt || existing.entitlement_ends_at,
        razorpaySubscriptionId: lsSubId,
        razorpayPaymentId: existing.razorpay_payment_id,
        paymentMethod: "lemonsqueezy",
      });

      console.log(`[ls/change-plan] Upgrade: user=${userId}, ${currentPlan} → ${targetPlan}`);

      return NextResponse.json({
        success: true,
        type: "upgrade",
        plan: targetPlan,
        message: `Upgraded to ${targetPlan.charAt(0).toUpperCase() + targetPlan.slice(1)}. Prorated difference charged.`,
      });
    } else {
      // Downgrade: LS applies at next renewal, schedule in our DB
      await scheduleChange(userId, {
        type: "downgrade",
        targetPlan,
        effectiveAt: existing.entitlement_ends_at,
      });

      console.log(`[ls/change-plan] Downgrade scheduled: user=${userId}, ${currentPlan} → ${targetPlan}`);

      return NextResponse.json({
        success: true,
        type: "downgrade",
        plan: targetPlan,
        currentPlan,
        currentPeriodEnd: existing.entitlement_ends_at,
        message: `Your plan will switch to ${targetPlan.charAt(0).toUpperCase() + targetPlan.slice(1)} at the end of your current billing period.`,
      });
    }
  } catch (err) {
    Sentry.captureException(err, {
      level: "error",
      tags: { source: "lemonsqueezy", reason: "plan_change_failed" },
    });
    console.error("[ls/change-plan] error:", err?.message || err);
    return NextResponse.json({ error: "Failed to change plan" }, { status: 500 });
  }
}
